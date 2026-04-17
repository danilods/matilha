import { describe, it, expect } from "vitest";
import { projectStatusSchema } from "../../src/domain/projectStatusSchema";

describe("projectStatusSchema", () => {
  it("accepts minimal valid project status", () => {
    const minimal = {
      schema_version: 1,
      name: "my-project",
      archetype: "saas-b2b",
      created: "2026-04-17T10:00:00Z",
      last_update: "2026-04-17T10:00:00Z",
      current_phase: 0,
      phase_status: "not_started",
      next_action: "Run /scout to begin",
      tools_detected: ["claude-code"],
      companion_skills: {
        impeccable: "not_installed",
        shadcn: "not_installed",
        superpowers: "not_installed",
        typeui: "not_installed"
      },
      active_waves: [],
      completed_waves: [],
      feature_artifacts: [],
      recent_decisions: [],
      pending_decisions: [],
      blockers: []
    };

    const result = projectStatusSchema.safeParse(minimal);
    expect(result.success).toBe(true);
  });

  it("rejects invalid archetype", () => {
    const invalid = {
      schema_version: 1,
      name: "x",
      archetype: "invalid-archetype",
      created: "2026-04-17T10:00:00Z",
      last_update: "2026-04-17T10:00:00Z",
      current_phase: 0,
      phase_status: "not_started",
      next_action: "x",
      tools_detected: ["claude-code"],
      companion_skills: {
        impeccable: "not_installed",
        shadcn: "not_installed",
        superpowers: "not_installed",
        typeui: "not_installed"
      },
      active_waves: [],
      completed_waves: [],
      feature_artifacts: [],
      recent_decisions: [],
      pending_decisions: [],
      blockers: []
    };

    const result = projectStatusSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects schema_version mismatch", () => {
    const invalid = {
      schema_version: 999,
      name: "x",
      archetype: "cli",
      created: "2026-04-17T10:00:00Z",
      last_update: "2026-04-17T10:00:00Z",
      current_phase: 0,
      phase_status: "not_started",
      next_action: "x",
      tools_detected: ["claude-code"],
      companion_skills: {
        impeccable: "not_installed",
        shadcn: "not_installed",
        superpowers: "not_installed",
        typeui: "not_installed"
      },
      active_waves: [],
      completed_waves: [],
      feature_artifacts: [],
      recent_decisions: [],
      pending_decisions: [],
      blockers: []
    };

    const result = projectStatusSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects malformed created timestamp", () => {
    const invalid = {
      schema_version: 1,
      name: "x",
      archetype: "cli",
      created: "2026-04-17",
      last_update: "2026-04-17T10:00:00Z",
      current_phase: 0,
      phase_status: "not_started",
      next_action: "x",
      tools_detected: ["claude-code"],
      companion_skills: {
        impeccable: "not_installed",
        shadcn: "not_installed",
        superpowers: "not_installed",
        typeui: "not_installed"
      },
      active_waves: [],
      completed_waves: [],
      feature_artifacts: [],
      recent_decisions: [],
      pending_decisions: [],
      blockers: []
    };

    const result = projectStatusSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});
