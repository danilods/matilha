import { describe, it, expect } from "vitest";
import { buildProjection } from "../../src/governance/projection";
import { makeGovernanceEvent, type GovernanceEventType } from "../../src/governance/events";
import { computeSyncPlan, resolveTransitionConfig } from "../../src/governance/syncPlan";
import { SYNC_STATE_VERSION, type SyncState } from "../../src/governance/syncState";

const actor = { tool: "cli" };
const config = {
  storyPointsField: "customfield_10016",
  transitions: { inProgress: "Em andamento", paused: "Paused", done: "Concluído" }
};

function ev(
  type: GovernanceEventType,
  externalId: string,
  timestamp: string,
  issueKey: string | null,
  payload?: Record<string, unknown>
) {
  return makeGovernanceEvent({ type, external_id: externalId, issue_key: issueKey, actor, payload, timestamp });
}

const emptySync: SyncState = { schema_version: SYNC_STATE_VERSION, issues: {} };

describe("resolveTransitionConfig", () => {
  it("defaults the field and the three transition names", () => {
    expect(resolveTransitionConfig({})).toEqual({
      storyPointsField: "customfield_10016",
      transitions: { inProgress: "In Progress", paused: "Paused", done: "Done" }
    });
  });
  it("reads the real workflow names from the environment", () => {
    expect(
      resolveTransitionConfig({
        JIRA_TRANSITION_IN_PROGRESS: "Em andamento",
        JIRA_TRANSITION_PAUSED: "Paused",
        JIRA_TRANSITION_DONE: "Concluído"
      }).transitions
    ).toEqual({ inProgress: "Em andamento", paused: "Paused", done: "Concluído" });
  });
});

describe("computeSyncPlan", () => {
  it("flags an issue with no Jira key as unmapped", () => {
    const state = buildProjection([ev("task.started", "argos-T1", "2026-05-21T10:00:00Z", null)]);
    const plan = computeSyncPlan(state, emptySync, config);
    expect(plan.unmapped).toEqual(["argos-T1"]);
    expect(plan.actions).toEqual([]);
  });

  it("plans the In Progress transition for a freshly started issue", () => {
    const state = buildProjection([ev("task.started", "BOIAA-1", "2026-05-21T10:00:00Z", "BOIAA-1")]);
    const a = computeSyncPlan(state, emptySync, config).actions[0]!;
    expect(a.transition).toEqual({ name: "Em andamento", comment: null });
    expect(a.set_story_points).toBeNull();
    expect(a.log_worklog_minutes).toBe(0);
  });

  it("plans the Paused transition carrying the pause reason as its comment", () => {
    const state = buildProjection([
      ev("task.started", "BOIAA-2", "2026-05-21T10:00:00Z", "BOIAA-2"),
      ev("task.paused", "BOIAA-2", "2026-05-21T10:20:00Z", "BOIAA-2", { reason: "fim do expediente" })
    ]);
    const synced: SyncState = {
      schema_version: SYNC_STATE_VERSION,
      issues: { "BOIAA-2": { synced_event_id: "stale", synced_at: "x", synced_status: "in_progress", synced_worklog_minutes: 0, synced_commits: [] } }
    };
    const a = computeSyncPlan(state, synced, config).actions[0]!;
    expect(a.transition).toEqual({ name: "Paused", comment: "fim do expediente" });
    expect(a.log_worklog_minutes).toBe(20);
  });

  it("projects only the worklog delta since the last sync", () => {
    const state = buildProjection([
      ev("task.started", "BOIAA-3", "2026-05-21T10:00:00Z", "BOIAA-3"),
      ev("task.paused", "BOIAA-3", "2026-05-21T11:00:00Z", "BOIAA-3", { reason: "pausa" })
    ]);
    const synced: SyncState = {
      schema_version: SYNC_STATE_VERSION,
      issues: { "BOIAA-3": { synced_event_id: "stale", synced_at: "x", synced_status: "in_progress", synced_worklog_minutes: 25, synced_commits: [] } }
    };
    const a = computeSyncPlan(state, synced, config).actions[0]!;
    expect(a.log_worklog_minutes).toBe(35);
    expect(a.worklog_total_minutes).toBe(60);
  });

  it("lists only the commits new since the last sync, for the progress comment", () => {
    const state = buildProjection([
      ev("task.started", "BOIAA-4", "2026-05-21T10:00:00Z", "BOIAA-4"),
      ev("task.progress", "BOIAA-4", "2026-05-21T10:10:00Z", "BOIAA-4", { commits: ["c1"] }),
      ev("task.progress", "BOIAA-4", "2026-05-21T10:20:00Z", "BOIAA-4", { commits: ["c2"] })
    ]);
    const synced: SyncState = {
      schema_version: SYNC_STATE_VERSION,
      issues: { "BOIAA-4": { synced_event_id: "stale", synced_at: "x", synced_status: "in_progress", synced_worklog_minutes: 0, synced_commits: ["c1"] } }
    };
    const a = computeSyncPlan(state, synced, config).actions[0]!;
    expect(a.new_commits).toEqual(["c2"]);
    expect(a.all_commits).toEqual(["c1", "c2"]);
  });

  it("sets story points on completion and marks the action as a comment", () => {
    const state = buildProjection([
      ev("task.started", "BOIAA-5", "2026-05-21T10:00:00Z", "BOIAA-5"),
      ev("task.completed", "BOIAA-5", "2026-05-21T10:40:00Z", "BOIAA-5", { commits: ["c1"] })
    ]);
    const a = computeSyncPlan(state, emptySync, config).actions[0]!;
    expect(a.transition).toEqual({ name: "Concluído", comment: null });
    expect(a.set_story_points).toBe(0.6);
    expect(a.comment).toBe(true);
  });

  it("skips an issue whose last_event_id already matches the sync trail", () => {
    const state = buildProjection([ev("task.started", "BOIAA-6", "2026-05-21T10:00:00Z", "BOIAA-6")]);
    const issue = state.issues["BOIAA-6"]!;
    const synced: SyncState = {
      schema_version: SYNC_STATE_VERSION,
      issues: { "BOIAA-6": { synced_event_id: issue.last_event_id, synced_at: "x", synced_status: "in_progress", synced_worklog_minutes: 0, synced_commits: [] } }
    };
    const plan = computeSyncPlan(state, synced, config);
    expect(plan.actions).toEqual([]);
    expect(plan.skipped).toBe(1);
  });
});
