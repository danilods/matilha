import { describe, it, expect } from "vitest";
import { buildProjection } from "../../src/governance/projection";
import { makeGovernanceEvent, type GovernanceEventType } from "../../src/governance/events";
import { computeSyncPlan, resolveTransitionConfig } from "../../src/governance/syncPlan";
import { SYNC_STATE_VERSION, type SyncState } from "../../src/governance/syncState";

const actor = { tool: "cli" };
const config = { storyPointsField: "customfield_10016", transitions: { inProgress: "In Progress", done: "Done" } };

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
  it("defaults the field and transition names", () => {
    expect(resolveTransitionConfig({})).toEqual({
      storyPointsField: "customfield_10016",
      transitions: { inProgress: "In Progress", done: "Done" }
    });
  });
  it("reads overrides from the environment", () => {
    expect(
      resolveTransitionConfig({
        JIRA_STORY_POINTS_FIELD: "customfield_99",
        JIRA_TRANSITION_IN_PROGRESS: "Doing",
        JIRA_TRANSITION_DONE: "Shipped"
      })
    ).toEqual({
      storyPointsField: "customfield_99",
      transitions: { inProgress: "Doing", done: "Shipped" }
    });
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
    const plan = computeSyncPlan(state, emptySync, config);
    expect(plan.actions).toHaveLength(1);
    const a = plan.actions[0]!;
    expect(a.jira_key).toBe("BOIAA-1");
    expect(a.transitions).toEqual(["In Progress"]);
    expect(a.set_story_points).toBeNull();
    expect(a.log_worklog_minutes).toBeNull();
    expect(a.comment).toBe(false);
  });

  it("plans status+SP+worklog+comment when an issue completes (no prior sync)", () => {
    const state = buildProjection([
      ev("task.started", "BOIAA-2", "2026-05-21T10:00:00Z", "BOIAA-2"),
      ev("task.completed", "BOIAA-2", "2026-05-21T10:40:00Z", "BOIAA-2", { commits: ["c1"] })
    ]);
    const plan = computeSyncPlan(state, emptySync, config);
    const a = plan.actions[0]!;
    expect(a.transitions).toEqual(["In Progress", "Done"]);
    expect(a.set_story_points).toBe(0.6); // 40 min ÷ 60
    expect(a.log_worklog_minutes).toBe(40);
    expect(a.comment).toBe(true);
  });

  it("plans only the Done transition when the issue was already synced In Progress", () => {
    const state = buildProjection([
      ev("task.started", "BOIAA-3", "2026-05-21T10:00:00Z", "BOIAA-3"),
      ev("task.completed", "BOIAA-3", "2026-05-21T10:30:00Z", "BOIAA-3", { commits: ["c"] })
    ]);
    const issue = state.issues["BOIAA-3"]!;
    const synced: SyncState = {
      schema_version: SYNC_STATE_VERSION,
      issues: { "BOIAA-3": { synced_event_id: "stale", synced_at: "2026-05-21T10:05:00Z", synced_status: "in_progress" } }
    };
    const plan = computeSyncPlan(state, synced, config);
    const a = plan.actions[0]!;
    expect(a.transitions).toEqual(["Done"]);
    expect(a.set_story_points).toBe(issue.story_points);
    expect(a.comment).toBe(true);
  });

  it("skips an issue whose last_event_id already matches the sync trail", () => {
    const state = buildProjection([ev("task.started", "BOIAA-4", "2026-05-21T10:00:00Z", "BOIAA-4")]);
    const issue = state.issues["BOIAA-4"]!;
    const synced: SyncState = {
      schema_version: SYNC_STATE_VERSION,
      issues: { "BOIAA-4": { synced_event_id: issue.last_event_id, synced_at: "x", synced_status: "in_progress" } }
    };
    const plan = computeSyncPlan(state, synced, config);
    expect(plan.actions).toEqual([]);
    expect(plan.skipped).toBe(1);
  });

  it("skips a completed issue already synced as completed even if a later event arrived", () => {
    const state = buildProjection([
      ev("task.started", "BOIAA-5", "2026-05-21T10:00:00Z", "BOIAA-5"),
      ev("task.completed", "BOIAA-5", "2026-05-21T10:20:00Z", "BOIAA-5", { commits: ["c1"] }),
      ev("task.completed", "BOIAA-5", "2026-05-21T10:25:00Z", "BOIAA-5", { commits: ["c2"] })
    ]);
    const synced: SyncState = {
      schema_version: SYNC_STATE_VERSION,
      issues: { "BOIAA-5": { synced_event_id: "older", synced_at: "x", synced_status: "completed" } }
    };
    const plan = computeSyncPlan(state, synced, config);
    expect(plan.actions).toEqual([]);
    expect(plan.skipped).toBe(1);
  });
});
