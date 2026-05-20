import { describe, it, expect, vi, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { metricsCommand } from "../../src/governance/metricsCommand";
import { appendEvent } from "../../src/governance/ledger";
import { makeGovernanceEvent } from "../../src/governance/events";

const actor = { tool: "claude-code" };

afterEach(() => vi.restoreAllMocks());

function ledgerWithOneCompletedIssue(externalId = "BOIAA-1"): string {
  const dir = mkdtempSync(join(tmpdir(), "matilha-metricscmd-"));
  appendEvent(dir, makeGovernanceEvent({ type: "task.created", external_id: externalId, issue_key: externalId, actor, timestamp: "2026-05-19T10:00:00Z", payload: { story_points: 4 } }));
  appendEvent(dir, makeGovernanceEvent({ type: "task.started", external_id: externalId, issue_key: externalId, actor, timestamp: "2026-05-19T10:00:00Z" }));
  appendEvent(dir, makeGovernanceEvent({ type: "task.completed", external_id: externalId, issue_key: externalId, actor, timestamp: "2026-05-19T10:40:00Z", payload: { commits: ["c1"] } }));
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
      expect(output).toContain("10");
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

  it("shows estimated-worklog dim note when completion has no start marker", () => {
    const dir = mkdtempSync(join(tmpdir(), "matilha-metricscmd-est-"));
    try {
      appendEvent(dir, makeGovernanceEvent({ type: "task.created", external_id: "BOIAA-9", issue_key: "BOIAA-9", actor, timestamp: "2026-05-19T09:00:00Z", payload: { story_points: 4 } }));
      appendEvent(dir, makeGovernanceEvent({ type: "task.completed", external_id: "BOIAA-9", issue_key: "BOIAA-9", actor, timestamp: "2026-05-19T09:40:00Z", payload: { commits: ["c1"] } }));
      const lines: string[] = [];
      vi.spyOn(console, "log").mockImplementation((line?: unknown) => { lines.push(String(line)); });
      metricsCommand(dir, {});
      const output = lines.join("\n");
      expect(output).toContain("estimated");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("aggregates ledgers from multiple repo roots passed via opts.ledger", () => {
    const repoA = ledgerWithOneCompletedIssue("BOIAA-1");
    const repoB = ledgerWithOneCompletedIssue("BOIAA-2");
    try {
      const lines: string[] = [];
      vi.spyOn(console, "log").mockImplementation((line?: unknown) => { lines.push(String(line)); });
      // each repo has one distinct completed issue (4 SP) — aggregating reads both
      metricsCommand(repoA, { json: true, ledger: [repoA, repoB] });
      const parsed = JSON.parse(lines.join("\n"));
      expect(parsed.issues_completed).toBe(2);
      expect(parsed.story_points_completed).toBe(8);
    } finally {
      rmSync(repoA, { recursive: true, force: true });
      rmSync(repoB, { recursive: true, force: true });
    }
  });
});
