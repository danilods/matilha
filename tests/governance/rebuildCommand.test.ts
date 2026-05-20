import { describe, it, expect } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { governanceRebuildCommand } from "../../src/governance/rebuildCommand";
import { appendEvent } from "../../src/governance/ledger";
import { readState } from "../../src/governance/projection";
import { makeGovernanceEvent } from "../../src/governance/events";

const actor = { tool: "claude-code" };

describe("matilha governance rebuild", () => {
  it("reconstructs an identical projection from the ledger", () => {
    const cwd = mkdtempSync(join(tmpdir(), "matilha-rebuild-"));
    try {
      appendEvent(cwd, makeGovernanceEvent({ type: "task.started", external_id: "BOIAA-1", actor, timestamp: "2026-05-19T14:00:00Z" }));
      appendEvent(cwd, makeGovernanceEvent({ type: "task.completed", external_id: "BOIAA-1", actor, timestamp: "2026-05-19T14:20:00Z", payload: { commits: ["a1"] } }));

      governanceRebuildCommand(cwd);
      const first = readState(cwd)!;
      expect(first.issues["BOIAA-1"]!.worklog_active_minutes).toBe(20);

      rmSync(join(cwd, "docs", "matilha", "governance", "state.json"));
      governanceRebuildCommand(cwd);
      const second = readState(cwd)!;

      expect(second.issues).toEqual(first.issues);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });
});
