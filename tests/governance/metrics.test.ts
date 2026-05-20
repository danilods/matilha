import { describe, it, expect } from "vitest";
import { computeMetrics, resolveTraditionalHoursPerPoint, DEFAULT_TRADITIONAL_HOURS_PER_POINT } from "../../src/governance/metrics";
import { buildProjection } from "../../src/governance/projection";
import { makeGovernanceEvent, type GovernanceEventType } from "../../src/governance/events";

const actor = { tool: "claude-code", model: "claude-opus-4-7" };

function ev(type: GovernanceEventType, externalId: string, timestamp: string, payload?: Record<string, unknown>) {
  return makeGovernanceEvent({ type, external_id: externalId, issue_key: externalId, actor, payload, timestamp });
}

describe("computeMetrics", () => {
  it("derives minutes-per-point and the compression factor", () => {
    const state = buildProjection([
      ev("task.created", "BOIAA-1", "2026-05-19T10:00:00Z", { story_points: 4 }),
      ev("task.started", "BOIAA-1", "2026-05-19T10:00:00Z"),
      ev("task.completed", "BOIAA-1", "2026-05-19T10:40:00Z", { commits: ["c1"] })
    ]);
    const metrics = computeMetrics(state, { baselineHoursPerPoint: 8, generatedAt: "2026-05-20T00:00:00Z" });

    expect(metrics.issues_completed).toBe(1);
    expect(metrics.story_points_completed).toBe(4);
    expect(metrics.worklog_active_minutes).toBe(40);
    expect(metrics.minutos_por_ponto).toBe(10);
    expect(metrics.fator_compressao).toBe(48);
    expect(metrics.lead_time_medio_minutos).toBe(40);
    expect(metrics.worklog_estimated_count).toBe(0);
    expect(metrics.generated_at).toBe("2026-05-20T00:00:00Z");
  });

  it("computes velocity in story points per calendar day", () => {
    const state = buildProjection([
      ev("task.created", "BOIAA-1", "2026-05-18T09:00:00Z", { story_points: 3 }),
      ev("task.started", "BOIAA-1", "2026-05-18T09:00:00Z"),
      ev("task.completed", "BOIAA-1", "2026-05-18T09:30:00Z", { commits: ["a"] }),
      ev("task.created", "BOIAA-2", "2026-05-20T09:00:00Z", { story_points: 5 }),
      ev("task.started", "BOIAA-2", "2026-05-20T09:00:00Z"),
      ev("task.completed", "BOIAA-2", "2026-05-20T09:30:00Z", { commits: ["b"] })
    ]);
    const metrics = computeMetrics(state, { baselineHoursPerPoint: 8 });
    expect(metrics.velocidade_sp_por_dia).toBe(2.7);
  });

  it("counts estimated worklog and excludes pointless issues", () => {
    const state = buildProjection([
      ev("task.created", "BOIAA-3", "2026-05-19T10:00:00Z", { story_points: 2 }),
      ev("task.completed", "BOIAA-3", "2026-05-19T11:00:00Z", { commits: ["c"] }),
      ev("task.started", "BOIAA-4", "2026-05-19T10:00:00Z"),
      ev("task.completed", "BOIAA-4", "2026-05-19T10:20:00Z", { commits: ["d"] })
    ]);
    const metrics = computeMetrics(state, { baselineHoursPerPoint: 8 });
    expect(metrics.issues_completed).toBe(2);
    expect(metrics.issues_counted).toBe(1);
    expect(metrics.worklog_estimated_count).toBe(1);
    expect(metrics.lead_time_medio_minutos).toBeNull();
  });

  it("returns null KPIs for an empty ledger", () => {
    const metrics = computeMetrics(buildProjection([]), { baselineHoursPerPoint: 8 });
    expect(metrics.issues_total).toBe(0);
    expect(metrics.minutos_por_ponto).toBeNull();
    expect(metrics.velocidade_sp_por_dia).toBeNull();
    expect(metrics.fator_compressao).toBeNull();
  });

  it("resolves the traditional baseline from env with a default", () => {
    expect(resolveTraditionalHoursPerPoint({})).toBe(DEFAULT_TRADITIONAL_HOURS_PER_POINT);
    expect(resolveTraditionalHoursPerPoint({ TRADITIONAL_HOURS_PER_POINT: "6" })).toBe(6);
    expect(resolveTraditionalHoursPerPoint({ TRADITIONAL_HOURS_PER_POINT: "garbage" })).toBe(DEFAULT_TRADITIONAL_HOURS_PER_POINT);
  });
});
