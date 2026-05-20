import { describe, it, expect } from "vitest";
import {
  makeGovernanceEvent,
  parseGovernanceEvent,
  resolveActor,
  looksLikeIssueKey
} from "../../src/governance/events";
import { MatilhaUserError } from "../../src/ui/errorFormat";

const actor = { tool: "claude-code", model: "claude-opus-4-7" };

describe("governance events", () => {
  it("builds and validates a task.started event with generated id and timestamp", () => {
    const event = makeGovernanceEvent({
      type: "task.started",
      external_id: "BOIAA-1042",
      issue_key: "BOIAA-1042",
      actor
    });
    expect(event.type).toBe("task.started");
    expect(event.schema_version).toBe(1);
    expect(event.event_id).toMatch(/^[0-9a-f-]{36}$/);
    expect(event.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(event.issue_key).toBe("BOIAA-1042");
  });

  it("builds a task.completed event carrying commits", () => {
    const event = makeGovernanceEvent({
      type: "task.completed",
      external_id: "BOIAA-1042",
      issue_key: "BOIAA-1042",
      actor,
      payload: { commits: ["abc123"] }
    });
    expect(event.type).toBe("task.completed");
    if (event.type === "task.completed") {
      expect(event.payload.commits).toEqual(["abc123"]);
    }
  });

  it("rejects an event with an unknown type", () => {
    expect(() =>
      parseGovernanceEvent({
        schema_version: 1,
        type: "task.exploded",
        event_id: "x",
        external_id: "y",
        issue_key: null,
        timestamp: "2026-05-19T00:00:00Z",
        actor: { tool: "cli" }
      })
    ).toThrow(MatilhaUserError);
  });

  it("resolves actor from env with a cli default", () => {
    expect(resolveActor({})).toEqual({ tool: "cli" });
    expect(
      resolveActor({ MATILHA_AGENT_TOOL: "claude-code", MATILHA_AGENT_MODEL: "claude-opus-4-7" })
    ).toEqual({ tool: "claude-code", model: "claude-opus-4-7" });
  });

  it("recognizes a Jira issue-key shape", () => {
    expect(looksLikeIssueKey("BOIAA-1042")).toBe(true);
    expect(looksLikeIssueKey("feat-auth-SP1")).toBe(false);
  });

  it("drops story_points from a task.created payload (SP is measured at completion)", () => {
    const event = parseGovernanceEvent({
      schema_version: 1,
      event_id: "e-sp",
      type: "task.created",
      external_id: "BOIAA-1",
      issue_key: "BOIAA-1",
      timestamp: "2026-05-19T10:00:00Z",
      actor: { tool: "cli" },
      payload: { story_points: 3, category: "crawler" }
    });
    expect(event.type).toBe("task.created");
    if (event.type === "task.created") {
      expect(event.payload).not.toHaveProperty("story_points");
      expect(event.payload.category).toBe("crawler");
    }
  });
});
