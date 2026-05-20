import { describe, it, expect, vi, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { metricsCommand } from "../../src/governance/metricsCommand";
import { appendEvent } from "../../src/governance/ledger";
import { makeGovernanceEvent } from "../../src/governance/events";

const actor = { tool: "claude-code" };

afterEach(() => vi.restoreAllMocks());

function ledgerWithOneCompletedIssue(): string {
  const dir = mkdtempSync(join(tmpdir(), "matilha-metricscmd-"));
  appendEvent(dir, makeGovernanceEvent({ type: "task.created", external_id: "BOIAA-1", issue_key: "BOIAA-1", actor, timestamp: "2026-05-19T10:00:00Z", payload: { story_points: 4 } }));
  appendEvent(dir, makeGovernanceEvent({ type: "task.started", external_id: "BOIAA-1", issue_key: "BOIAA-1", actor, timestamp: "2026-05-19T10:00:00Z" }));
  appendEvent(dir, makeGovernanceEvent({ type: "task.completed", external_id: "BOIAA-1", issue_key: "BOIAA-1", actor, timestamp: "2026-05-19T10:40:00Z", payload: { commits: ["c1"] } }));
  return dir;
}

describe("matilha metrics command", () => {
  it("prints a human metrics summary", () => {
    const dir = ledgerWithOneCompletedIssue();
    try {
      const lines: string[] = [];
      vi.spyOn(console, "log").mockImplementation((line?: unknown) => { lines.push(String(line)); });
      metricsCommand(dir, {});
      const output = lines.join("\n");
      expect(output).toContain("minutes per point");
      expect(output).toContain("compression factor");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("emits machine-readable JSON with --json", () => {
    const dir = ledgerWithOneCompletedIssue();
    try {
      const lines: string[] = [];
      vi.spyOn(console, "log").mockImplementation((line?: unknown) => { lines.push(String(line)); });
      metricsCommand(dir, { json: true });
      const parsed = JSON.parse(lines.join("\n"));
      expect(parsed.story_points_completed).toBe(4);
      expect(parsed.minutos_por_ponto).toBe(10);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
