import pc from "picocolors";
import { buildProjection } from "./projection";
import { computeMetrics } from "./metrics";
import { resolveMinutesPerStoryPoint } from "./storyPoints";
import { readMergedLedger, resolveLedgerRoots } from "./ledgerSources";

export type MetricsCommandOptions = {
  json?: boolean;
  ledger?: string[];
};

export function metricsCommand(cwd: string, opts: MetricsCommandOptions = {}): void {
  const minutesPerStoryPoint = resolveMinutesPerStoryPoint();
  const state = buildProjection(
    readMergedLedger(resolveLedgerRoots(cwd, { ledger: opts.ledger })),
    undefined,
    { minutesPerStoryPoint }
  );
  const metrics = computeMetrics(state, { minutesPerStoryPoint });

  if (opts.json) {
    console.log(JSON.stringify(metrics, null, 2));
    return;
  }

  console.log(pc.bold("matilha governance metrics — números finais"));
  console.log(`  tasks concluídas:     ${metrics.tasks_concluidas}`);
  console.log(`  tempo ativo total:    ${metrics.tempo_ativo_total} min`);
  console.log(
    `  story points total:   ${metrics.story_points_total}  (1 SP = ${metrics.minutes_per_story_point} min)`
  );
  console.log(`  duração (dias):       ${metrics.duracao_calendario_dias ?? "—"}`);
  if (metrics.worklog_estimated_count > 0) {
    console.log(
      pc.dim(`  note: ${metrics.worklog_estimated_count} completion(s) had estimated (not measured) worklog`)
    );
  }
  for (const task of metrics.detalhe_por_task) {
    const flag = task.worklog_estimated ? pc.dim(" (estimated)") : "";
    console.log(
      `   - ${task.jira_key ?? task.external_id}: ${task.worklog_active_minutes} min → ${task.story_points} SP${flag}`
    );
  }
}
