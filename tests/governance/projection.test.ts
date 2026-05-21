import { describe, it, expect } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildProjection, writeState, readState, statePath } from "../../src/governance/projection";
import { makeGovernanceEvent, type GovernanceEventType } from "../../src/governance/events";

const actor = { tool: "claude-code", model: "claude-opus-4-7" };

function ev(
  type: GovernanceEventType,
  externalId: string,
  timestamp: string,
  payload?: Record<string, unknown>
) {
  return makeGovernanceEvent({ type, external_id: externalId, issue_key: externalId, actor, payload, timestamp });
}

describe("governance projection", () => {
  it("derives active worklog from a start/done interval", () => {
    const state = buildProjection(
      [
        ev("task.started", "BOIAA-1", "2026-05-19T14:00:00Z"),
        ev("task.completed", "BOIAA-1", "2026-05-19T14:22:00Z", { commits: ["abc123"] })
      ],
      "2026-05-19T15:00:00Z"
    );
    const issue = state.issues["BOIAA-1"]!;
    expect(issue.status).toBe("completed");
    expect(issue.worklog_active_minutes).toBe(22);
    expect(issue.worklog_estimated).toBe(false);
    expect(issue.commits).toEqual(["abc123"]);
    expect(issue.agent).toEqual({ tool: "claude-code", model: "claude-opus-4-7" });
    expect(state.rebuilt_at).toBe("2026-05-19T15:00:00Z");
  });

  it("excludes paused spans from the active worklog", () => {
    const issue = buildProjection([
      ev("task.started", "BOIAA-2", "2026-05-19T14:00:00Z"),
      ev("task.paused", "BOIAA-2", "2026-05-19T14:10:00Z"),
      ev("task.resumed", "BOIAA-2", "2026-05-19T14:40:00Z"),
      ev("task.completed", "BOIAA-2", "2026-05-19T14:45:00Z", { commits: ["d1"] })
    ]).issues["BOIAA-2"]!;
    expect(issue.worklog_active_minutes).toBe(15);
    expect(issue.intervals).toHaveLength(2);
  });

  it("flags worklog as estimated when completed without a start marker", () => {
    const issue = buildProjection([
      ev("task.completed", "BOIAA-3", "2026-05-19T14:45:00Z", { commits: ["d2"] })
    ]).issues["BOIAA-3"]!;
    expect(issue.worklog_active_minutes).toBe(0);
    expect(issue.worklog_estimated).toBe(true);
    expect(issue.status).toBe("completed");
  });

  it("captures category and issue_kind from task.created; story_points stays null before completion", () => {
    const issue = buildProjection([
      ev("task.created", "BOIAA-4", "2026-05-19T13:00:00Z", {
        category: "crawler",
        issue_kind: "component"
      })
    ]).issues["BOIAA-4"]!;
    expect(issue.category).toBe("crawler");
    expect(issue.issue_kind).toBe("component");
    expect(issue.status).toBe("created");
    expect(issue.story_points).toBeNull();
  });

  it("computes story_points from the active worklog when the task completes", () => {
    const issue = buildProjection([
      ev("task.started", "BOIAA-10", "2026-05-19T14:00:00Z"),
      ev("task.completed", "BOIAA-10", "2026-05-19T14:22:00Z", { commits: ["c1"] })
    ]).issues["BOIAA-10"]!;
    expect(issue.worklog_active_minutes).toBe(22);
    expect(issue.story_points).toBe(0.3); // minutesToStoryPoints(22, 60)
  });

  it("leaves story_points null while a task is still in progress", () => {
    const issue = buildProjection([
      ev("task.started", "BOIAA-11", "2026-05-19T14:00:00Z")
    ]).issues["BOIAA-11"]!;
    expect(issue.status).toBe("in_progress");
    expect(issue.story_points).toBeNull();
  });

  it("floors story_points at 0.05 for an estimated-worklog completion", () => {
    const issue = buildProjection([
      ev("task.completed", "BOIAA-12", "2026-05-19T14:45:00Z", { commits: ["d"] })
    ]).issues["BOIAA-12"]!;
    expect(issue.worklog_active_minutes).toBe(0);
    expect(issue.worklog_estimated).toBe(true);
    expect(issue.story_points).toBe(0.05);
  });

  it("honors a custom minutesPerStoryPoint passed to buildProjection", () => {
    const issue = buildProjection(
      [
        ev("task.started", "BOIAA-13", "2026-05-19T14:00:00Z"),
        ev("task.completed", "BOIAA-13", "2026-05-19T14:30:00Z", { commits: ["c"] })
      ],
      undefined,
      { minutesPerStoryPoint: 30 }
    ).issues["BOIAA-13"]!;
    expect(issue.worklog_active_minutes).toBe(30);
    expect(issue.story_points).toBe(1); // 30 min ÷ 30 = 1 SP
  });

  it("sorts out-of-order events by timestamp before projecting", () => {
    const issue = buildProjection([
      ev("task.completed", "BOIAA-5", "2026-05-19T14:30:00Z", { commits: ["c1"] }),
      ev("task.started", "BOIAA-5", "2026-05-19T14:00:00Z")
    ]).issues["BOIAA-5"]!;
    expect(issue.worklog_active_minutes).toBe(30);
  });

  it("clamps worklog to zero when clock skew makes end precede start", () => {
    const issue = buildProjection([
      ev("task.started", "BOIAA-6", "2026-05-19T14:30:00Z"),
      ev("task.completed", "BOIAA-6", "2026-05-19T14:00:00Z", { commits: [] })
    ]).issues["BOIAA-6"]!;
    expect(issue.worklog_active_minutes).toBe(0);
  });

  it("does not count an open interval for a still-running task", () => {
    const issue = buildProjection([
      ev("task.started", "BOIAA-7", "2026-05-19T14:00:00Z")
    ]).issues["BOIAA-7"]!;
    expect(issue.status).toBe("in_progress");
    expect(issue.worklog_active_minutes).toBe(0);
    expect(issue.intervals).toHaveLength(0);
    expect(issue.worklog_estimated).toBe(false);
  });

  it("task.progress accumulates commits and moves a created task to in_progress, without worklog", () => {
    const issue = buildProjection([
      ev("task.created", "BOIAA-20", "2026-05-21T09:00:00Z"),
      ev("task.progress", "BOIAA-20", "2026-05-21T09:30:00Z", { commits: ["c1"] }),
      ev("task.progress", "BOIAA-20", "2026-05-21T10:00:00Z", { commits: ["c2"] })
    ]).issues["BOIAA-20"]!;
    expect(issue.status).toBe("in_progress");
    expect(issue.commits).toEqual(["c1", "c2"]);
    expect(issue.worklog_active_minutes).toBe(0);
    expect(issue.story_points).toBeNull();
  });

  it("task.progress does not complete a task — only task.completed does", () => {
    const issue = buildProjection([
      ev("task.started", "BOIAA-21", "2026-05-21T09:00:00Z"),
      ev("task.progress", "BOIAA-21", "2026-05-21T09:30:00Z", { commits: ["c1"] })
    ]).issues["BOIAA-21"]!;
    expect(issue.status).toBe("in_progress");
  });

  it("task.progress does not un-pause a paused task", () => {
    const issue = buildProjection([
      ev("task.started", "BOIAA-24", "2026-05-21T09:00:00Z"),
      ev("task.paused", "BOIAA-24", "2026-05-21T09:30:00Z", { reason: "pausa" }),
      ev("task.progress", "BOIAA-24", "2026-05-21T09:40:00Z", { commits: ["c1"] })
    ]).issues["BOIAA-24"]!;
    expect(issue.status).toBe("paused");
    expect(issue.pause_reason).toBe("pausa");
  });

  it("task.progress after completion does not reopen the task", () => {
    const issue = buildProjection([
      ev("task.started", "BOIAA-25", "2026-05-21T09:00:00Z"),
      ev("task.completed", "BOIAA-25", "2026-05-21T09:30:00Z", { commits: ["c1"] }),
      ev("task.progress", "BOIAA-25", "2026-05-21T09:40:00Z", { commits: ["c2"] })
    ]).issues["BOIAA-25"]!;
    expect(issue.status).toBe("completed");
  });

  it("clears pause_reason on completion", () => {
    const issue = buildProjection([
      ev("task.started", "BOIAA-26", "2026-05-21T09:00:00Z"),
      ev("task.paused", "BOIAA-26", "2026-05-21T09:30:00Z", { reason: "pausa" }),
      ev("task.resumed", "BOIAA-26", "2026-05-21T10:00:00Z"),
      ev("task.completed", "BOIAA-26", "2026-05-21T10:20:00Z", { commits: ["c1"] })
    ]).issues["BOIAA-26"]!;
    expect(issue.status).toBe("completed");
    expect(issue.pause_reason).toBeNull();
  });

  it("captures the pause reason while paused and clears it on resume", () => {
    const paused = buildProjection([
      ev("task.started", "BOIAA-22", "2026-05-21T09:00:00Z"),
      ev("task.paused", "BOIAA-22", "2026-05-21T09:30:00Z", { reason: "fim do expediente" })
    ]).issues["BOIAA-22"]!;
    expect(paused.status).toBe("paused");
    expect(paused.pause_reason).toBe("fim do expediente");

    const resumed = buildProjection([
      ev("task.started", "BOIAA-23", "2026-05-21T09:00:00Z"),
      ev("task.paused", "BOIAA-23", "2026-05-21T09:30:00Z", { reason: "almoço" }),
      ev("task.resumed", "BOIAA-23", "2026-05-21T10:30:00Z")
    ]).issues["BOIAA-23"]!;
    expect(resumed.status).toBe("in_progress");
    expect(resumed.pause_reason).toBeNull();
  });

  it("deduplicates commits across multiple task.completed events preserving first-appearance order", () => {
    const issue = buildProjection([
      ev("task.started", "BOIAA-8", "2026-05-19T14:00:00Z"),
      ev("task.completed", "BOIAA-8", "2026-05-19T14:20:00Z", { commits: ["c1", "c2"] }),
      ev("task.completed", "BOIAA-8", "2026-05-19T14:40:00Z", { commits: ["c2", "c3"] })
    ]).issues["BOIAA-8"]!;
    expect(issue.commits).toEqual(["c1", "c2", "c3"]);
  });
});

describe("governance projection persistence", () => {
  it("writes and reads state.json round-trip", () => {
    const cwd = mkdtempSync(join(tmpdir(), "matilha-state-"));
    try {
      const state = buildProjection(
        [ev("task.started", "BOIAA-9", "2026-05-19T14:00:00Z")],
        "2026-05-19T15:00:00Z"
      );
      writeState(cwd, state);
      expect(statePath(cwd)).toMatch(/docs\/matilha\/governance\/state\.json$/);
      expect(readState(cwd)).toEqual(state);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("returns null when state.json does not exist", () => {
    const cwd = mkdtempSync(join(tmpdir(), "matilha-state-"));
    try {
      expect(readState(cwd)).toBeNull();
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });
});
