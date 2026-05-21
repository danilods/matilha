import type { GovernanceState, IssueState } from "./projection";
import type { SyncState } from "./syncState";

export type TransitionConfig = {
  storyPointsField: string;
  transitions: { inProgress: string; done: string };
};

/**
 * Resolve a config relevante ao plano de sync a partir do ambiente.
 * NÃO checa credenciais (preview deve funcionar offline) — `resolveJiraConfig`
 * é quem exige BASE_URL/EMAIL/TOKEN, e só o caminho `--yes` precisa delas.
 */
export function resolveTransitionConfig(env: NodeJS.ProcessEnv = process.env): TransitionConfig {
  return {
    storyPointsField: env.JIRA_STORY_POINTS_FIELD ?? env.JIRA_STORY_POINTS_CUSTOM_FIELD ?? "customfield_10016",
    transitions: {
      inProgress: env.JIRA_TRANSITION_IN_PROGRESS ?? "In Progress",
      done: env.JIRA_TRANSITION_DONE ?? "Done"
    }
  };
}

export type SyncAction = {
  external_id: string;
  jira_key: string;
  transitions: string[];            // nomes de transição a aplicar, em ordem
  set_story_points: number | null;  // SP a gravar via updateIssueFields, ou null
  log_worklog_minutes: number | null; // worklog total a lançar (uma vez), ou null
  comment: boolean;                 // postar comentário de conclusão?
  last_event_id: string;            // para gravar no sync-state após projetar
  status: IssueState["status"];     // idem
};

export type SyncPlan = {
  actions: SyncAction[];
  unmapped: string[]; // external_ids sem jira_key — não dá para sincronizar
  skipped: number;    // issues sem nada novo a projetar
};

/**
 * Diff puro entre a projeção e o rastro de sincronização. Sem Jira, sem I/O.
 * Worklog/SP/comentário entram UMA vez, na conclusão, com gate em synced_status.
 */
export function computeSyncPlan(
  state: GovernanceState,
  syncState: SyncState,
  config: TransitionConfig
): SyncPlan {
  const actions: SyncAction[] = [];
  const unmapped: string[] = [];
  let skipped = 0;

  for (const [externalId, issue] of Object.entries(state.issues)) {
    if (issue.jira_key === null) {
      unmapped.push(externalId);
      continue;
    }

    const synced = syncState.issues[externalId];
    if (synced && synced.synced_event_id === issue.last_event_id) {
      skipped++; // nada novo desde o último sync
      continue;
    }

    // Marcos de status: created→In Progress na primeira atividade; →Done na
    // conclusão. paused→in_progress (task.resumed) não gera transição — a
    // issue permanece "In Progress" no board do Jira.
    const syncedStatus = synced?.synced_status ?? "created";
    const transitions: string[] = [];
    if (syncedStatus === "created" && issue.status !== "created") {
      transitions.push(config.transitions.inProgress);
    }
    const completingNow = issue.status === "completed" && syncedStatus !== "completed";
    if (completingNow) {
      transitions.push(config.transitions.done);
    }

    if (transitions.length === 0) {
      // completingNow sempre empurra `done` em transitions, então
      // transitions vazio ⇒ nenhum marco novo a projetar.
      skipped++;
      continue;
    }

    actions.push({
      external_id: externalId,
      jira_key: issue.jira_key,
      transitions,
      set_story_points: completingNow ? issue.story_points : null,
      log_worklog_minutes: completingNow ? issue.worklog_active_minutes : null,
      comment: completingNow,
      last_event_id: issue.last_event_id,
      status: issue.status
    });
  }

  return { actions, unmapped, skipped };
}
