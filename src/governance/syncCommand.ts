import pc from "picocolors";
import { MatilhaUserError } from "../ui/errorFormat";
import { markdownToAdf } from "../jira/adf";
import { resolveJiraConfig } from "../jira/config";
import { JiraClient } from "../jira/jiraClient";
import { buildProjection } from "./projection";
import { readMergedLedger, resolveLedgerRoots } from "./ledgerSources";
import { computeSyncPlan, resolveTransitionConfig, type SyncAction, type SyncPlan } from "./syncPlan";
import { markIssueSynced, readSyncState, writeSyncState, type SyncState } from "./syncState";

export type GovernanceSyncOptions = {
  preview?: boolean;
  yes?: boolean;
};

export async function governanceSyncCommand(
  cwd: string,
  opts: GovernanceSyncOptions = {}
): Promise<void> {
  if (!opts.preview && !opts.yes) {
    throw new MatilhaUserError({
      summary: "governance sync requires explicit approval",
      context: "matilha governance sync is a mutating operation",
      problem: "the command transitions issues and adds worklog, story points and comments in Jira.",
      nextActions: [
        "review with 'matilha governance sync --preview'",
        "then apply with 'matilha governance sync --yes'"
      ]
    });
  }

  const state = buildProjection(readMergedLedger(resolveLedgerRoots(cwd)));
  const syncState = readSyncState(cwd);
  const plan = computeSyncPlan(state, syncState, resolveTransitionConfig(process.env));

  printSyncPlan(plan, opts.preview ?? false);
  if (opts.preview) return;

  await applySyncPlan(cwd, plan, syncState);
  console.log(
    pc.green(
      `governance sync complete: ${plan.actions.length} issue(s) projected, ${plan.unmapped.length} unmapped`
    )
  );
}

function printSyncPlan(plan: SyncPlan, preview: boolean): void {
  console.log(pc.bold(preview ? "matilha governance sync — preview" : "matilha governance sync"));
  if (plan.actions.length === 0) {
    console.log(pc.dim("  nothing to project"));
  }
  for (const a of plan.actions) {
    const bits: string[] = [];
    if (a.transition) bits.push(`transition → ${a.transition.name}`);
    if (a.set_story_points !== null) bits.push(`story points ${a.set_story_points}`);
    if (a.log_worklog_minutes > 0) bits.push(`worklog +${a.log_worklog_minutes}min`);
    if (a.new_commits.length > 0) bits.push(`${a.new_commits.length} new commit(s)`);
    console.log(`  ${a.jira_key} (${a.external_id}): ${bits.join(", ") || "—"}`);
  }
  for (const ext of plan.unmapped) {
    console.log(pc.dim(`  ${ext}: unmapped (no Jira key) — skipped`));
  }
  if (plan.skipped > 0) console.log(pc.dim(`  ${plan.skipped} issue(s) already up to date`));
}

async function applySyncPlan(cwd: string, plan: SyncPlan, syncState: SyncState): Promise<void> {
  const config = resolveJiraConfig(process.env);
  const client = new JiraClient(config);
  let trail = syncState;

  for (const action of plan.actions) {
    // 1. Story Points ANTES da transição — "Concluído" é gated no campo SP.
    if (action.set_story_points !== null) {
      await client.updateIssueFields(action.jira_key, {
        [config.storyPointsField]: action.set_story_points
      });
    }

    // 2. Transição — "Paused" carrega o motivo como o comentário que o Jira exige.
    if (action.transition) {
      const transitionOpts = action.transition.comment
        ? { comment: markdownToAdf(action.transition.comment) }
        : {};
      try {
        await client.transitionIssue(action.jira_key, action.transition.name, transitionOpts);
      } catch (err) {
        if (isTransitionUnavailable(err)) {
          console.log(
            pc.dim(`  ${action.jira_key}: transition "${action.transition.name}" unavailable — skipped`)
          );
        } else {
          throw err;
        }
      }
    }

    // 3. Worklog incremental — o delta desde o último sync.
    if (action.log_worklog_minutes > 0) {
      // A API de worklog do Jira rejeita durações abaixo de 60s — deltas
      // pequenos são lançados no mínimo de 1 minuto.
      await client.addWorklog(action.jira_key, {
        timeSpentSeconds: Math.max(60, Math.round(action.log_worklog_minutes * 60))
      });
    }

    // 4. Comentário de progresso/conclusão listando os commits novos.
    if (action.comment) {
      await client.addComment(action.jira_key, markdownToAdf(progressComment(action)));
    }

    trail = markIssueSynced(trail, action.external_id, {
      synced_event_id: action.last_event_id,
      synced_at: new Date().toISOString(),
      synced_status: action.status,
      synced_worklog_minutes: action.worklog_total_minutes,
      synced_commits: action.all_commits
    });
    // Grava o rastro após CADA issue: uma falha de rede no meio do lote deixa
    // as issues já projetadas registradas; o risco de duplicação fica limitado
    // a uma única issue.
    writeSyncState(cwd, trail);
  }
}

function progressComment(action: SyncAction): string {
  const head =
    action.status === "completed"
      ? `Concluída via governança matilha — ${action.set_story_points ?? 0} story point(s), ${action.worklog_total_minutes} min de tempo ativo de agente.`
      : "Progresso via governança matilha.";
  if (action.new_commits.length === 0) return head;
  const list = action.new_commits.map((sha) => `- \`${sha}\``).join("\n");
  return `${head}\n\n${action.new_commits.length} commit(s) desde o último sync:\n${list}`;
}

function isTransitionUnavailable(err: unknown): boolean {
  return (
    err instanceof MatilhaUserError &&
    err.matilhaError.summary.startsWith("Jira transition") &&
    err.matilhaError.summary.includes("not available")
  );
}
