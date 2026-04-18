import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { scoutCommand } from "../../src/scout/scoutCommand";
import { MatilhaUserError } from "../../src/ui/errorFormat";

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

// vi.hoisted ensures mockText is initialised before the hoisted vi.mock factory runs
const { mockText } = vi.hoisted(() => ({
  mockText: vi.fn(async (opts: { message: string; placeholder?: string }) => {
    void opts;
    return answers[callIdx++] ?? "";
  })
}));

vi.mock("@clack/prompts", () => ({
  intro: () => {},
  outro: () => {},
  cancel: () => {},
  note: () => {},
  isCancel: () => false,
  text: mockText
}));

describe("scoutCommand", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "scout-"));
    callIdx = 0; // reset mock state per test
    mockText.mockClear(); // reset call history per test
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

  it("rejects when current_phase > 0 as MatilhaUserError", async () => {
    const phase10 = VALID_PHASE_0.replace("current_phase: 0", "current_phase: 10");
    writeFileSync(join(tmp, "project-status.md"), phase10);
    await expect(scoutCommand(tmp)).rejects.toBeInstanceOf(MatilhaUserError);
  });

  it("rejects when project-status.md missing", async () => {
    await expect(scoutCommand(tmp)).rejects.toThrow(/Matilha project|project-status/i);
  });

  it("rejects when project-status.md missing as MatilhaUserError", async () => {
    await expect(scoutCommand(tmp)).rejects.toBeInstanceOf(MatilhaUserError);
  });
});

describe("scoutCommand pre-flight (Wave 2f)", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "scout-pf-"));
    callIdx = 0;
    mockText.mockClear();
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it("fails if project-status.md missing with 5-rule error", async () => {
    // fixture: no project-status.md in tmp dir
    let caught: unknown;
    try {
      await scoutCommand(tmp);
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(MatilhaUserError);
    const me = (caught as MatilhaUserError).matilhaError;
    expect(me.nextActions.some((a) => a.includes("matilha init"))).toBe(true);
    expect(me.summary).toMatch(/Matilha project/i);
  });

  it("fails if phase_00 already complete (5-rule)", async () => {
    // fixture: current_phase=10
    const phase10 = VALID_PHASE_0.replace("current_phase: 0", "current_phase: 10");
    writeFileSync(join(tmp, "project-status.md"), phase10);
    let caught: unknown;
    try {
      await scoutCommand(tmp);
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(MatilhaUserError);
    const me = (caught as MatilhaUserError).matilhaError;
    expect(me.summary).toMatch(/phase/i);
    // next actions should mention howl or plan
    expect(me.nextActions.some((a) => /howl|plan/i.test(a))).toBe(true);
  });

  it("emits progress indicator (question N/6)", async () => {
    writeFileSync(join(tmp, "project-status.md"), VALID_PHASE_0);
    await scoutCommand(tmp);

    // Each call to `text()` receives a message starting with "[question N/6]"
    const messages = mockText.mock.calls.map((c) => (c[0] as { message: string }).message);
    expect(messages).toHaveLength(6);
    for (let i = 1; i <= 6; i++) {
      expect(messages[i - 1]).toContain(`question ${i}/6`);
    }
  });
});
