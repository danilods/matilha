import { describe, it, expect } from "vitest";
import { renderNarrative } from "../../src/governance/narrative";
import { computeMetrics } from "../../src/governance/metrics";
import { buildProjection } from "../../src/governance/projection";
import { makeGovernanceEvent, type GovernanceEventType } from "../../src/governance/events";

const actor = { tool: "claude-code" };

function ev(type: GovernanceEventType, externalId: string, timestamp: string, payload?: Record<string, unknown>) {
  return makeGovernanceEvent({ type, external_id: externalId, issue_key: externalId, actor, payload, timestamp });
}

describe("renderNarrative", () => {
  it("renders an executive markdown with the final numbers", () => {
    const state = buildProjection([
      ev("task.started", "BOIAA-1", "2026-05-19T10:00:00Z"),
      ev("task.completed", "BOIAA-1", "2026-05-19T10:40:00Z", { commits: ["c1"] })
    ]);
    const metrics = computeMetrics(state, { minutesPerStoryPoint: 60, generatedAt: "2026-05-20T00:00:00Z" });
    const md = renderNarrative(state, metrics);

    expect(md).toContain("# Governança Matilha — Narrativa Executiva");
    expect(md).toContain("2026-05-20T00:00:00Z");
    expect(md).toContain("Os números finais");
    expect(md).toContain("40 min");
    expect(md).toContain("0.6 story points");
    expect(md).toContain("worklog medido");
  });

  it("honestly flags estimated worklog when present", () => {
    const state = buildProjection([
      ev("task.completed", "BOIAA-2", "2026-05-19T11:00:00Z", { commits: ["d"] })
    ]);
    const metrics = computeMetrics(state, { minutesPerStoryPoint: 60, generatedAt: "2026-05-20T00:00:00Z" });
    const md = renderNarrative(state, metrics);
    expect(md).toContain("worklog **estimado**");
  });

  it("shows the empty-ledger message when there are no completions", () => {
    const state = buildProjection([]);
    const metrics = computeMetrics(state, { minutesPerStoryPoint: 60, generatedAt: "2026-05-20T00:00:00Z" });
    const md = renderNarrative(state, metrics);
    expect(md).toContain("Nenhuma task concluída registrada ainda");
    expect(md).not.toContain("worklog medido");
  });
});
