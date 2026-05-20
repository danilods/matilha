import { describe, it, expect, vi, afterEach } from "vitest";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { narrativeCommand } from "../../src/governance/narrativeCommand";
import { appendEvent } from "../../src/governance/ledger";
import { makeGovernanceEvent } from "../../src/governance/events";

const actor = { tool: "claude-code" };

afterEach(() => vi.restoreAllMocks());

function ledgerDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "matilha-narrcmd-"));
  appendEvent(dir, makeGovernanceEvent({ type: "task.created", external_id: "BOIAA-1", issue_key: "BOIAA-1", actor, timestamp: "2026-05-19T10:00:00Z", payload: { story_points: 4 } }));
  appendEvent(dir, makeGovernanceEvent({ type: "task.started", external_id: "BOIAA-1", issue_key: "BOIAA-1", actor, timestamp: "2026-05-19T10:00:00Z" }));
  appendEvent(dir, makeGovernanceEvent({ type: "task.completed", external_id: "BOIAA-1", issue_key: "BOIAA-1", actor, timestamp: "2026-05-19T10:40:00Z", payload: { commits: ["c1"] } }));
  return dir;
}

describe("matilha narrative command", () => {
  it("prints the narrative markdown to stdout", () => {
    const dir = ledgerDir();
    try {
      const lines: string[] = [];
      vi.spyOn(console, "log").mockImplementation((line?: unknown) => { lines.push(String(line)); });
      narrativeCommand(dir, {});
      expect(lines.join("\n")).toContain("Narrativa Executiva");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("writes the narrative to a file with --output", () => {
    const dir = ledgerDir();
    try {
      vi.spyOn(console, "log").mockImplementation(() => {});
      const out = join(dir, "narrativa.md");
      narrativeCommand(dir, { output: out });
      expect(existsSync(out)).toBe(true);
      expect(readFileSync(out, "utf-8")).toContain("Narrativa Executiva");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
