import type { GovernanceState, IssueState } from "./projection";

export const DEFAULT_TRADITIONAL_HOURS_PER_POINT = 8;

export function resolveTraditionalHoursPerPoint(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env.TRADITIONAL_HOURS_PER_POINT;
  if (!raw) return DEFAULT_TRADITIONAL_HOURS_PER_POINT;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_TRADITIONAL_HOURS_PER_POINT;
}

export type GovernanceMetrics = {
  generated_at: string;
  baseline_hours_per_point: number;
  issues_total: number;
  issues_completed: number;
  issues_counted: number;
  story_points_completed: number;
  worklog_active_minutes: number;
  worklog_estimated_count: number;
  minutos_por_ponto: number | null;
  velocidade_sp_por_dia: number | null;
  fator_compressao: number | null;
  lead_time_medio_minutos: number | null;
};

export function computeMetrics(
  state: GovernanceState,
  options: { baselineHoursPerPoint: number; generatedAt?: string }
): GovernanceMetrics {
  const issues = Object.values(state.issues);
  const completed = issues.filter((i) => i.status === "completed");
  const counted = completed.filter((i) => i.story_points !== null && i.story_points > 0);

  const storyPoints = counted.reduce((sum, i) => sum + (i.story_points ?? 0), 0);
  const worklog = round1(counted.reduce((sum, i) => sum + i.worklog_active_minutes, 0));
  const minutosPorPonto = storyPoints > 0 ? round1(worklog / storyPoints) : null;

  const baselineMinutesPerPoint = options.baselineHoursPerPoint * 60;
  const fatorCompressao =
    minutosPorPonto !== null && minutosPorPonto > 0
      ? round1(baselineMinutesPerPoint / minutosPorPonto)
      : null;

  return {
    generated_at: options.generatedAt ?? new Date().toISOString(),
    baseline_hours_per_point: options.baselineHoursPerPoint,
    issues_total: issues.length,
    issues_completed: completed.length,
    issues_counted: counted.length,
    story_points_completed: storyPoints,
    worklog_active_minutes: worklog,
    worklog_estimated_count: completed.filter((i) => i.worklog_estimated).length,
    minutos_por_ponto: minutosPorPonto,
    velocidade_sp_por_dia: computeVelocity(counted, storyPoints),
    fator_compressao: fatorCompressao,
    lead_time_medio_minutos: computeLeadTime(counted)
  };
}

function computeVelocity(counted: IssueState[], storyPoints: number): number | null {
  if (counted.length === 0) return null;
  const days = counted.map((i) => i.last_event_at.slice(0, 10)).sort();
  const first = new Date(`${days[0]!}T00:00:00Z`).getTime();
  const last = new Date(`${days[days.length - 1]!}T00:00:00Z`).getTime();
  const spanDays = Math.floor((last - first) / 86_400_000) + 1;
  return round1(storyPoints / spanDays);
}

function computeLeadTime(counted: IssueState[]): number | null {
  const withIntervals = counted.filter((i) => i.intervals.length > 0);
  if (withIntervals.length === 0) return null;
  const total = withIntervals.reduce((sum, i) => {
    const start = new Date(i.intervals[0]!.start).getTime();
    const end = new Date(i.intervals[i.intervals.length - 1]!.end).getTime();
    return sum + (end - start) / 60_000;
  }, 0);
  return round1(total / withIntervals.length);
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
