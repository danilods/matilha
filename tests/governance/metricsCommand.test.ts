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
  appendEvent(dir, makeGovernanceEvent({ type: "task.created", external_id: externalId, issue_key: externalId, actor, timestamp: "2026-05-19T10:00:00Z" }));
  appendEvent(dir, makeGovernanceEvent({ type: "task.started", external_id: externalId, issue_key: externalId, actor, timestamp: "2026-05-19T10:00:00Z" }));
  appendEvent(dir, makeGovernanceEvent({ type: "task.completed", external_id: externalId, issue_key: externalId, actor, timestamp: "2026-05-19T10:40:00Z", payload: { commits: ["c1"] } }));
  return dir;
}

describe("matilha metrics command", () => {
  it("prints a human metrics summary with the final numbers", () => {
    const dir = ledgerWithOneCompletedIssue();
    try {
      const lines: string[] = [];
      vi.spyOn(console, "log").mockImplementation((line?: unknown) => { lines.push(String(line)); });
      metricsCommand(dir, {});
      const output = lines.join("\n");
      expect(output).toContain("tempo ativo total");
      expect(output).toContain("40 min");
      expect(output).toContain("story points total");
      expect(output).toContain("0.6");
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
      expect(parsed.tasks_concluidas).toBe(1);
      expect(parsed.tempo_ativo_total).toBe(40);
      expect(parsed.story_points_total).toBe(0.6);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("shows the estimated-worklog note when a completion has no start marker", () => {
    const dir = mkdtempSync(join(tmpdir(), "matilha-metricscmd-est-"));
    try {
      appendEvent(dir, makeGovernanceEvent({ type: "task.created", external_id: "BOIAA-9", issue_key: "BOIAA-9", actor, timestamp: "2026-05-19T09:00:00Z" }));
      appendEvent(dir, makeGovernanceEvent({ type: "task.completed", external_id: "BOIAA-9", issue_key: "BOIAA-9", actor, timestamp: "2026-05-19T09:40:00Z", payload: { commits: ["c1"] } }));
      const lines: string[] = [];
      vi.spyOn(console, "log").mockImplementation((line?: unknown) => { lines.push(String(line)); });
      metricsCommand(dir, {});
      expect(lines.join("\n")).toContain("estimated");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("converts the aggregate when ledgers from multiple repo roots are merged", () => {
    const repoA = ledgerWithOneCompletedIssue("BOIAA-1");
    const repoB = ledgerWithOneCompletedIssue("BOIAA-2");
    try {
      const lines: string[] = [];
      vi.spyOn(console, "log").mockImplementation((line?: unknown) => { lines.push(String(line)); });
      // cada repo tem uma task concluída de 40 min; agregar lê os dois (80 min).
      // story_points_total = trunc(80/60) = 1.3 — prova da conversão do agregado.
      metricsCommand(repoA, { json: true, ledger: [repoA, repoB] });
      const parsed = JSON.parse(lines.join("\n"));
      expect(parsed.tasks_concluidas).toBe(2);
      expect(parsed.tempo_ativo_total).toBe(80);
      expect(parsed.story_points_total).toBe(1.3);
    } finally {
      rmSync(repoA, { recursive: true, force: true });
      rmSync(repoB, { recursive: true, force: true });
    }
  });
});
