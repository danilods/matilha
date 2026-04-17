import { describe, it, expect } from "vitest";
import { planSchema } from "../../src/domain/planSchema";

describe("planSchema", () => {
  it("accepts valid plan with multiple waves", () => {
    const valid = {
      name: "auth-feature-plan",
      spec: "docs/matilha/specs/2026-04-17-auth-feature-design.md",
      created: "2026-04-17",
      waves: {
        w1: ["SP1", "SP2", "SP3"],
        w2: ["SP4"]
      }
    };

    const result = planSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("rejects plan with empty waves object", () => {
    const invalid = {
      name: "x-plan",
      spec: "docs/matilha/specs/x.md",
      created: "2026-04-17",
      waves: {}
    };

    const result = planSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects wave key not matching w<N> pattern", () => {
    const invalid = {
      name: "x-plan",
      spec: "docs/matilha/specs/x.md",
      created: "2026-04-17",
      waves: {
        invalid: ["SP1"]
      }
    };

    const result = planSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});
