import pc from "picocolors";
import { readLedger } from "./ledger";
import { buildProjection } from "./projection";
import { computeMetrics, resolveTraditionalHoursPerPoint } from "./metrics";

export type MetricsCommandOptions = {
  json?: boolean;
};

export function metricsCommand(cwd: string, opts: MetricsCommandOptions = {}): void {
  const state = buildProjection(readLedger(cwd));
  const metrics = computeMetrics(state, {
    baselineHoursPerPoint: resolveTraditionalHoursPerPoint()
  });

  if (opts.json) {
    console.log(JSON.stringify(metrics, null, 2));
    return;
  }

  console.log(pc.bold("matilha governance metrics"));
  console.log(`  issues completed:     ${metrics.issues_completed}`);
  console.log(`  story points done:    ${metrics.story_points_completed}`);
  console.log(`  active worklog (min): ${metrics.worklog_active_minutes}`);
  console.log(`  minutes per point:    ${fmt(metrics.minutos_por_ponto)}`);
  console.log(`  velocity (SP/day):    ${fmt(metrics.velocidade_sp_por_dia)}`);
  console.log(
    `  compression factor:   ${fmt(metrics.fator_compressao)}${metrics.fator_compressao !== null ? "x" : ""}  (baseline ${metrics.baseline_hours_per_point}h/point)`
  );
  console.log(`  avg lead time (min):  ${fmt(metrics.lead_time_medio_minutos)}`);
  if (metrics.worklog_estimated_count > 0) {
    console.log(
      pc.dim(`  note: ${metrics.worklog_estimated_count} completion(s) had estimated (not measured) worklog`)
    );
  }
}

function fmt(value: number | null): string {
  return value === null ? "—" : String(value);
}
