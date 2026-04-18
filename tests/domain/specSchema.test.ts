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
        rfs_enumerated: "pending",
        rnfs_covered: "pending",
        risks_listed: "pending",
        premissas_listed: "pending",
        success_metrics_defined: "yes",
        aha_moment_identified: "pending",
        scope_boundaries_locked: "yes",
        peer_review_done: "pending"
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
        rfs_enumerated: "pending",
        rnfs_covered: "pending",
        risks_listed: "pending",
        premissas_listed: "pending",
        success_metrics_defined: "yes",
        aha_moment_identified: "pending",
        scope_boundaries_locked: "yes",
        peer_review_done: "pending"
      }
    };

    const result = specSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe("phase 20 and 30 gates", () => {
  it("accepts phase_20 spec with all 6 gates", () => {
    const valid = {
      name: "test",
      created: "2026-04-19",
      archetype: "saas-b2b" as const,
      methodology_phase: 20 as const,
      gates_covered: {
        stack_table_declared: "yes" as const,
        architecture_doc_exists: "yes" as const,
        rnf_traceability: "yes" as const,
        docker_compose_mirrors_prod: "pending" as const,
        env_example_created: "yes" as const,
        versions_pinned: "yes" as const
      }
    };
    expect(specSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts phase_30 spec with all 5 gates", () => {
    const valid = {
      name: "test",
      created: "2026-04-19",
      archetype: "cli" as const,
      methodology_phase: 30 as const,
      gates_covered: {
        claude_md_declares_stack_rules: "yes" as const,
        skills_by_domain: "yes" as const,
        skills_by_key_tech: "yes" as const,
        agents_with_models: "pending" as const,
        one_blocking_hook: "no" as const
      }
    };
    expect(specSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts phase_10 spec with all 10 gates", () => {
    const valid = {
      name: "test",
      created: "2026-04-19",
      archetype: "saas-b2b" as const,
      methodology_phase: 10 as const,
      gates_covered: {
        problem_defined: "yes" as const,
        target_user_clear: "yes" as const,
        rfs_enumerated: "yes" as const,
        rnfs_covered: "yes" as const,
        risks_listed: "yes" as const,
        premissas_listed: "pending" as const,
        success_metrics_defined: "yes" as const,
        aha_moment_identified: "yes" as const,
        scope_boundaries_locked: "yes" as const,
        peer_review_done: "no" as const
      }
    };
    expect(specSchema.safeParse(valid).success).toBe(true);
  });
});
