import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { scoutCommand } from "../../src/scout/scoutCommand";

const VALID_PHASE_0 = `---
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

let callIdx = 0;
const answers = [
  "solo engineers building SaaS",
  "tedious project setup",
  "fragmented tooling",
  "manually copying configs",
  "time-to-first-commit under 10min",
  "multi-tenancy, enterprise SSO"
];

vi.mock("@clack/prompts", () => ({
  intro: () => {},
  outro: () => {},
  cancel: () => {},
  note: () => {},
  isCancel: () => false,
  text: async () => answers[callIdx++] ?? ""
}));

describe("scoutCommand", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "scout-"));
    callIdx = 0; // reset mock state per test
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it("happy: writes notes + advances to phase 10", async () => {
    writeFileSync(join(tmp, "project-status.md"), VALID_PHASE_0);
    await scoutCommand(tmp);

    const notesPath = join(tmp, "docs", "matilha", "discovery-notes.md");
    expect(existsSync(notesPath)).toBe(true);
    const notes = readFileSync(notesPath, "utf-8");
    expect(notes).toContain("solo engineers");
    expect(notes).toContain("tedious");

    const updated = readFileSync(join(tmp, "project-status.md"), "utf-8");
    expect(updated).toContain("current_phase: 10");
    expect(updated).toContain("problem_defined: yes");
    expect(updated).toContain("Run /plan");
  });

  it("rejects when current_phase > 0", async () => {
    const phase10 = VALID_PHASE_0.replace("current_phase: 0", "current_phase: 10");
    writeFileSync(join(tmp, "project-status.md"), phase10);
    await expect(scoutCommand(tmp)).rejects.toThrow(/already|phase/i);
  });

  it("rejects when project-status.md missing", async () => {
    await expect(scoutCommand(tmp)).rejects.toThrow(/Matilha project|project-status/i);
  });
});
