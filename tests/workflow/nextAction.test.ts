import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { resolveNextAction } from "../../src/workflow/nextAction";

const BASE_STATUS = `---
schema_version: 1
name: test-proj
archetype: saas-b2b
created: "2026-04-19T10:00:00Z"
last_update: "2026-04-19T10:00:00Z"
current_phase: PHASE
phase_status: not_started
next_action: "Run matilha discover"
tools_detected:
  - claude-code
companion_skills:
  impeccable: not_installed
  shadcn: not_installed
  superpowers: not_installed
  typeui: not_installed
active_waves: ACTIVE_WAVES
completed_waves: COMPLETED_WAVES
feature_artifacts: FEATURE_ARTIFACTS
recent_decisions: []
pending_decisions: []
blockers: []
---

# Body
`;

describe("resolveNextAction", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "matilha-next-"));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it("recommends start when project-status.md is missing", () => {
    const action = resolveNextAction(tmp);

    expect(action.id).toBe("project.start");
    expect(action.command).toBe("matilha start");
    expect(action.risk).toBe("local_mutation");
  });

  it("recommends discovery for phase 0 projects", () => {
    writeStatus(tmp, { phase: 0 });

    const action = resolveNextAction(tmp);

    expect(action.id).toBe("phase.discover");
    expect(action.command).toBe("matilha discover");
  });

  it("prioritizes pending outbox events with a Jira preview recommendation", () => {
    writeStatus(tmp, { phase: 40, completedWaves: ["w1"] });
    writeFile(join(tmp, "docs", "matilha", "events", "outbox", "task-completed.json"), "{}");

    const action = resolveNextAction(tmp);

    expect(action.id).toBe("jira.sync.preview");
    expect(action.command).toBe("matilha jira sync --preview");
    expect(action.risk).toBe("remote_mutation");
    expect(action.requiresPreview).toBe(true);
  });

  it("recommends merge when an active wave is present", () => {
    writeStatus(tmp, {
      phase: 40,
      activeWaves: ["w1"],
      featureArtifacts: [{
        name: "feat-auth",
        spec: "docs/matilha/specs/feat-auth-spec.md",
        plan: "docs/matilha/plans/feat-auth-plan.md",
        phase: "in_progress",
        wave: "w1",
        owned_by: "matilha"
      }]
    });

    const action = resolveNextAction(tmp);

    expect(action.id).toBe("wave.merge");
    expect(action.command).toBe("matilha merge feat-auth --wave 1");
  });

  it("recommends phase-40 approval after completed wave with no pending outbox events", () => {
    writeStatus(tmp, { phase: 40, completedWaves: ["w1"] });

    const action = resolveNextAction(tmp);

    expect(action.id).toBe("gate.approve.phase40");
    expect(action.command).toBe("matilha approve phase-40-gate");
  });
});

function writeStatus(
  cwd: string,
  opts: {
    phase: number;
    activeWaves?: string[];
    completedWaves?: string[];
    featureArtifacts?: Array<Record<string, unknown>>;
  }
): void {
  const content = BASE_STATUS
    .replace("PHASE", String(opts.phase))
    .replace("ACTIVE_WAVES", JSON.stringify(opts.activeWaves ?? []))
    .replace("COMPLETED_WAVES", JSON.stringify(opts.completedWaves ?? []))
    .replace("FEATURE_ARTIFACTS", JSON.stringify(opts.featureArtifacts ?? []));
  writeFile(join(cwd, "project-status.md"), content);
}

function writeFile(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf-8");
}
