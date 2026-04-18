import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readProjectStatus, writeProjectStatus } from "../../src/util/projectStatus";

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

# Body
`;

describe("readProjectStatus", () => {
  let tmp: string;
  beforeEach(() => { tmp = mkdtempSync(join(tmpdir(), "mps-")); });
  afterEach(() => { rmSync(tmp, { recursive: true, force: true }); });

  it("reads valid project-status.md", async () => {
    writeFileSync(join(tmp, "project-status.md"), VALID);
    const fm = await readProjectStatus(tmp);
    expect(fm.data.name).toBe("test-proj");
    expect(fm.data.current_phase).toBe(0);
  });

  it("throws when missing", async () => {
    await expect(readProjectStatus(tmp)).rejects.toThrow(/Matilha project|project-status/i);
  });

  it("throws when schema validation fails", async () => {
    writeFileSync(join(tmp, "project-status.md"), `---\nname: x\narchetype: invalid\n---\nbody`);
    await expect(readProjectStatus(tmp)).rejects.toThrow();
  });
});

describe("writeProjectStatus", () => {
  let tmp: string;
  beforeEach(() => { tmp = mkdtempSync(join(tmpdir(), "mpsw-")); });
  afterEach(() => { rmSync(tmp, { recursive: true, force: true }); });

  it("roundtrips write -> read", async () => {
    writeFileSync(join(tmp, "project-status.md"), VALID);
    const original = await readProjectStatus(tmp);
    original.data.current_phase = 10;
    original.data.next_action = "Run /plan";
    await writeProjectStatus(tmp, original);
    const reread = await readProjectStatus(tmp);
    expect(reread.data.current_phase).toBe(10);
    expect(reread.data.next_action).toBe("Run /plan");
  });
});
