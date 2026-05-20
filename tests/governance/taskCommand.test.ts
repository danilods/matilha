import { describe, it, expect, vi, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { taskCommand } from "../../src/governance/taskCommand";
import { readLedger } from "../../src/governance/ledger";
import { readState } from "../../src/governance/projection";

afterEach(() => vi.restoreAllMocks());

function tmp(): string {
  return mkdtempSync(join(tmpdir(), "matilha-task-"));
}

describe("matilha task commands", () => {
  it("records started and completed events and refreshes the projection", () => {
    const cwd = tmp();
    try {
      vi.spyOn(console, "log").mockImplementation(() => {});
      taskCommand(cwd, "start", "BOIAA-1042", {});
      taskCommand(cwd, "done", "BOIAA-1042", { commit: ["abc123"] });

      const events = readLedger(cwd);
      expect(events.map((e) => e.type)).toEqual(["task.started", "task.completed"]);

      const issue = readState(cwd)!.issues["BOIAA-1042"]!;
      expect(issue.status).toBe("completed");
      expect(issue.jira_key).toBe("BOIAA-1042");
      expect(issue.commits).toEqual(["abc123"]);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("records a pause reason in the event payload", () => {
    const cwd = tmp();
    try {
      vi.spyOn(console, "log").mockImplementation(() => {});
      taskCommand(cwd, "start", "BOIAA-7", {});
      taskCommand(cwd, "pause", "BOIAA-7", { reason: "waiting on review" });

      const paused = readLedger(cwd).find((e) => e.type === "task.paused");
      expect(paused && paused.type === "task.paused" && paused.payload.reason).toBe("waiting on review");
      expect(readState(cwd)!.issues["BOIAA-7"]!.status).toBe("paused");
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("rejects an unknown action", () => {
    const cwd = tmp();
    try {
      expect(() => taskCommand(cwd, "explode", "BOIAA-1", {})).toThrow(/unknown task action/);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("records start → pause → resume and leaves the issue in_progress", () => {
    const cwd = tmp();
    try {
      vi.spyOn(console, "log").mockImplementation(() => {});
      taskCommand(cwd, "start", "BOIAA-9", {});
      taskCommand(cwd, "pause", "BOIAA-9", {});
      taskCommand(cwd, "resume", "BOIAA-9", {});

      const events = readLedger(cwd);
      expect(events.map((e) => e.type)).toEqual(["task.started", "task.paused", "task.resumed"]);

      const issue = readState(cwd)!.issues["BOIAA-9"]!;
      expect(issue.status).toBe("in_progress");
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("leaves issue_key null for a non-Jira-shaped id", () => {
    const cwd = tmp();
    try {
      vi.spyOn(console, "log").mockImplementation(() => {});
      taskCommand(cwd, "start", "feat-auth-SP1", {});
      expect(readState(cwd)!.issues["feat-auth-SP1"]!.jira_key).toBeNull();
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });
});
