import { describe, it, expect } from "vitest";
import { specSchema } from "../../src/domain/specSchema";

describe("specSchema", () => {
  it("accepts valid Matilha spec frontmatter", () => {
    const valid = {
      name: "auth-feature",
      created: "2026-04-17",
      archetype: "saas-b2b",
      methodology_phase: 10,
      gates_covered: {
        problem_defined: "yes",
        target_user_clear: "yes",
        success_metrics_defined: "yes",
        scope_boundaries_locked: "yes"
      }
    };

    const result = specSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("rejects spec without all required gates", () => {
    const invalid = {
      name: "auth",
      created: "2026-04-17",
      archetype: "saas-b2b",
      methodology_phase: 10,
      gates_covered: {
        problem_defined: "yes"
      }
    };

    const result = specSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects spec with invalid phase", () => {
    const invalid = {
      name: "auth",
      created: "2026-04-17",
      archetype: "saas-b2b",
      methodology_phase: 99,
      gates_covered: {
        problem_defined: "yes",
        target_user_clear: "yes",
        success_metrics_defined: "yes",
        scope_boundaries_locked: "yes"
      }
    };

    const result = specSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});
