import { describe, it, expect } from "vitest";
import { computeMetrics } from "../../src/governance/metrics";
import { buildProjection } from "../../src/governance/projection";
import { makeGovernanceEvent, type GovernanceEventType } from "../../src/governance/events";

const actor = { tool: "claude-code", model: "claude-opus-4-7" };

function ev(type: GovernanceEventType, externalId: string, timestamp: string, payload?: Record<string, unknown>) {
  return makeGovernanceEvent({ type, external_id: externalId, issue_key: externalId, actor, payload, timestamp });
}

describe("computeMetrics — números finais", () => {
  it("reports the final numbers for one completed task", () => {
    const state = buildProjection([
      ev("task.started", "BOIAA-1", "2026-05-19T10:00:00Z"),
      ev("task.completed", "BOIAA-1", "2026-05-19T10:40:00Z", { commits: ["c1"] })
    ]);
    const metrics = computeMetrics(state, { minutesPerStoryPoint: 60, generatedAt: "2026-05-20T00:00:00Z" });

    expect(metrics.tasks_concluidas).toBe(1);
    expect(metrics.tempo_ativo_total).toBe(40);
    expect(metrics.story_points_total).toBe(0.6); // 40 min ÷ 60
    expect(metrics.worklog_estimated_count).toBe(0);
    expect(metrics.generated_at).toBe("2026-05-20T00:00:00Z");
    expect(metrics.minutes_per_story_point).toBe(60);
  });

  it("converts the AGGREGATE minutes, not the sum of per-task story points", () => {
    // duas tasks de 40 min: 40+40 = 80 min no total.
    // story_points_total = trunc(80/60) = 1.3 — NÃO 0.6 + 0.6 = 1.2
    const state = buildProjection([
      ev("task.started", "BOIAA-1", "2026-05-19T10:00:00Z"),
      ev("task.completed", "BOIAA-1", "2026-05-19T10:40:00Z", { commits: ["a"] }),
      ev("task.started", "BOIAA-2", "2026-05-19T11:00:00Z"),
      ev("task.completed", "BOIAA-2", "2026-05-19T11:40:00Z", { commits: ["b"] })
    ]);
    const metrics = computeMetrics(state, { minutesPerStoryPoint: 60 });
    expect(metrics.tempo_ativo_total).toBe(80);
    expect(metrics.story_points_total).toBe(1.3);
  });

  it("measures the calendar span from earliest start to latest completion", () => {
    const state = buildProjection([
      ev("task.started", "BOIAA-1", "2026-05-18T09:00:00Z"),
      ev("task.completed", "BOIAA-1", "2026-05-18T09:30:00Z", { commits: ["a"] }),
      ev("task.started", "BOIAA-2", "2026-05-20T09:00:00Z"),
      ev("task.completed", "BOIAA-2", "2026-05-20T09:30:00Z", { commits: ["b"] })
    ]);
    const metrics = computeMetrics(state, { minutesPerStoryPoint: 60 });
    expect(metrics.duracao_calendario_dias).toBe(3); // 18, 19, 20
  });

  it("reports a one-day span for tasks completed on the same calendar day", () => {
    const state = buildProjection([
      ev("task.started", "BOIAA-1", "2026-05-19T09:00:00Z"),
      ev("task.completed", "BOIAA-1", "2026-05-19T09:30:00Z", { commits: ["a"] }),
      ev("task.started", "BOIAA-2", "2026-05-19T14:00:00Z"),
      ev("task.completed", "BOIAA-2", "2026-05-19T14:30:00Z", { commits: ["b"] })
    ]);
    const metrics = computeMetrics(state, { minutesPerStoryPoint: 60 });
    expect(metrics.duracao_calendario_dias).toBe(1);
  });

  it("lists per-task detail and counts estimated-worklog completions", () => {
    const state = buildProjection([
      ev("task.completed", "BOIAA-3", "2026-05-19T11:00:00Z", { commits: ["c"] }) // sem start → estimado
    ]);
    const metrics = computeMetrics(state, { minutesPerStoryPoint: 60 });
    expect(metrics.tasks_concluidas).toBe(1);
    expect(metrics.worklog_estimated_count).toBe(1);
    expect(metrics.detalhe_por_task).toHaveLength(1);
    expect(metrics.detalhe_por_task[0]!.story_points).toBe(0.05);
    expect(metrics.detalhe_por_task[0]!.worklog_estimated).toBe(true);
  });

  it("returns zeros and a null span for an empty ledger", () => {
    const metrics = computeMetrics(buildProjection([]), {
      minutesPerStoryPoint: 60,
      generatedAt: "2026-05-20T00:00:00Z"
    });
    expect(metrics.issues_total).toBe(0);
    expect(metrics.tasks_concluidas).toBe(0);
    expect(metrics.tempo_ativo_total).toBe(0);
    expect(metrics.story_points_total).toBe(0);
    expect(metrics.duracao_calendario_dias).toBeNull();
    expect(metrics.detalhe_por_task).toEqual([]);
  });

  it("issues_total counts non-completed issues; tasks_concluidas does not", () => {
    const state = buildProjection([
      ev("task.started", "BOIAA-1", "2026-05-19T10:00:00Z"),
      ev("task.completed", "BOIAA-1", "2026-05-19T10:30:00Z", { commits: ["a"] }),
      ev("task.started", "BOIAA-2", "2026-05-19T11:00:00Z")
    ]);
    const metrics = computeMetrics(state, { minutesPerStoryPoint: 60 });
    expect(metrics.issues_total).toBe(2);
    expect(metrics.tasks_concluidas).toBe(1);
  });
});
