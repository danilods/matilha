import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { howlCommand } from "../../src/howl/howlCommand";

const VALID = `---
schema_version: 1
name: test-proj
archetype: saas-b2b
created: "2026-04-19T10:00:00Z"
last_update: "2026-04-19T10:00:00Z"
current_phase: 0
phase_status: not_started
next_action: "Run /scout"
tools_detected:
  - claude-code
companion_skills:
  impeccable: not_installed
  shadcn: not_installed
  superpowers: not_installed
  typeui: not_installed
active_waves: []
completed_waves: []
feature_artifacts: []
recent_decisions: []
pending_decisions: []
blockers: []
---
# Body`;

describe("howlCommand", () => {
  let tmp: string;
  let logs: string[];
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "howl-"));
    logs = [];
    logSpy = vi.spyOn(console, "log").mockImplementation((msg: unknown) => {
      logs.push(typeof msg === "string" ? msg : JSON.stringify(msg));
    });
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
    logSpy.mockRestore();
  });

  it("prints text summary by default", async () => {
    writeFileSync(join(tmp, "project-status.md"), VALID);
    await howlCommand(tmp, {});
    const out = logs.join("\n");
    expect(out).toContain("test-proj");
    expect(out).toContain("saas-b2b");
    expect(out).toContain("claude-code");
    expect(out).toContain("Run /scout");
  });

  it("prints JSON with --json", async () => {
    writeFileSync(join(tmp, "project-status.md"), VALID);
    await howlCommand(tmp, { json: true });
    const parsed = JSON.parse(logs.join("\n"));
    expect(parsed.name).toBe("test-proj");
    expect(parsed.current_phase).toBe(0);
  });

  it("throws when project-status.md missing", async () => {
    await expect(howlCommand(tmp, {})).rejects.toThrow(/Matilha project|project-status/i);
  });
});
