import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { statusCommand } from "../../src/plan/statusCommand";

const STATUS_WITH_FEATURE = `---
schema_version: 1
name: test-proj
archetype: saas-b2b
created: "2026-04-19T10:00:00Z"
last_update: "2026-04-19T10:00:00Z"
current_phase: 10
phase_status: not_started
next_action: "attest gates"
tools_detected:
  - claude-code
companion_skills:
  impeccable: not_installed
  shadcn: not_installed
  superpowers: not_installed
  typeui: not_installed
active_waves: []
completed_waves: []
feature_artifacts:
  - name: feat-alpha
    spec: docs/matilha/specs/feat-alpha-spec.md
    plan: docs/matilha/plans/feat-alpha-plan.md
    phase: planning
    wave: w1
    owned_by: matilha
recent_decisions: []
pending_decisions: []
blockers: []
phase_10_gates:
  problem_defined: yes
  target_user_clear: pending
  rfs_enumerated: pending
  rnfs_covered: pending
  risks_listed: pending
  premissas_listed: pending
  success_metrics_defined: pending
  aha_moment_identified: pending
  scope_boundaries_locked: pending
  peer_review_done: pending
---
# Body`;

const STATUS_NO_FEATURES = STATUS_WITH_FEATURE.replace(/feature_artifacts:[\s\S]*?recent_decisions:/, "feature_artifacts: []\nrecent_decisions:");

describe("statusCommand", () => {
  let tmp: string;
  let logs: string[];
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "status-"));
    logs = [];
    logSpy = vi.spyOn(console, "log").mockImplementation((msg: unknown) => {
      logs.push(typeof msg === "string" ? msg : JSON.stringify(msg));
    });
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
    logSpy.mockRestore();
  });

  it("prints text summary with gates table", async () => {
    writeFileSync(join(tmp, "project-status.md"), STATUS_WITH_FEATURE);
    await statusCommand(tmp, {});
    const out = logs.join("\n");
    expect(out).toContain("feat-alpha");
    expect(out).toContain("Phase 10 (PRD)");
    expect(out).toContain("problem_defined");
    expect(out).toContain("target_user_clear");
  });

  it("emits JSON when --json", async () => {
    writeFileSync(join(tmp, "project-status.md"), STATUS_WITH_FEATURE);
    await statusCommand(tmp, { json: true });
    const parsed = JSON.parse(logs.join("\n"));
    expect(parsed.current_phase).toBe(10);
    expect(parsed.features).toHaveLength(1);
    expect(parsed.features[0].name).toBe("feat-alpha");
    expect(parsed.features[0].phase_10_gates.problem_defined).toBe("yes");
  });

  it("shows friendly message when no features", async () => {
    writeFileSync(join(tmp, "project-status.md"), STATUS_NO_FEATURES);
    await statusCommand(tmp, {});
    const out = logs.join("\n");
    expect(out).toMatch(/No feature artifacts|matilha plan/i);
  });

  it("filters by --feature slug", async () => {
    writeFileSync(join(tmp, "project-status.md"), STATUS_WITH_FEATURE);
    await statusCommand(tmp, { feature: "feat-alpha" });
    const out = logs.join("\n");
    expect(out).toContain("feat-alpha");
  });

  it("throws when --feature slug not found", async () => {
    writeFileSync(join(tmp, "project-status.md"), STATUS_WITH_FEATURE);
    await expect(statusCommand(tmp, { feature: "nonexistent" })).rejects.toThrow(/not found/i);
  });
});
