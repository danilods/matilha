import type { GovernanceState, IssueState } from "./projection";
import { minutesToStoryPoints } from "./storyPoints";

export type TaskDetail = {
  external_id: string;
  jira_key: string | null;
  worklog_active_minutes: number;
  story_points: number;
  worklog_estimated: boolean;
  realized_at: string;
};

export type GovernanceMetrics = {
  generated_at: string;
  minutes_per_story_point: number;
  issues_total: number;
  tasks_concluidas: number;
  tempo_ativo_total: number;
  story_points_total: number;
  worklog_estimated_count: number;
  duracao_calendario_dias: number | null;
  detalhe_por_task: TaskDetail[];
};

export function computeMetrics(
  state: GovernanceState,
  options: { minutesPerStoryPoint: number; generatedAt?: string }
): GovernanceMetrics {
  const entries = Object.entries(state.issues);
  const completed = entries.filter(([, issue]) => issue.status === "completed");

  const tempoAtivoTotal = round1(
    completed.reduce((sum, [, issue]) => sum + issue.worklog_active_minutes, 0)
  );
  // Converte o AGREGADO de minutos — não soma os SP truncados por task —
  // para que tasks-relâmpago não distorçam o total (spec §9). O guard de
  // lista vazia é necessário: minutesToStoryPoints(0) retorna o piso 0.05,
  // não 0 — sem ele, um ledger vazio reportaria 0.05 SP em vez de 0.
  const storyPointsTotal =
    completed.length === 0 ? 0 : minutesToStoryPoints(tempoAtivoTotal, options.minutesPerStoryPoint);

  const detalhe: TaskDetail[] = completed.map(([externalId, issue]) => ({
    external_id: externalId,
    jira_key: issue.jira_key,
    worklog_active_minutes: issue.worklog_active_minutes,
    story_points: issue.story_points ?? 0, // completed sempre tem story_points numérico
    worklog_estimated: issue.worklog_estimated,
    realized_at: issue.last_event_at
  }));

  return {
    generated_at: options.generatedAt ?? new Date().toISOString(),
    minutes_per_story_point: options.minutesPerStoryPoint,
    issues_total: entries.length,
    tasks_concluidas: completed.length,
    tempo_ativo_total: tempoAtivoTotal,
    story_points_total: storyPointsTotal,
    worklog_estimated_count: completed.filter(([, issue]) => issue.worklog_estimated).length,
    duracao_calendario_dias: computeCalendarSpan(completed.map(([, issue]) => issue)),
    detalhe_por_task: detalhe
  };
}

function computeCalendarSpan(completed: IssueState[]): number | null {
  if (completed.length === 0) return null;
  const starts = completed.map((i) => i.intervals[0]?.start ?? i.last_event_at).sort();
  const ends = completed.map((i) => i.last_event_at).sort();
  const first = new Date(starts[0]!).getTime();
  const last = new Date(ends[ends.length - 1]!).getTime();
  return Math.floor((last - first) / 86_400_000) + 1;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
