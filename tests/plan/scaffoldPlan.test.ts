import { describe, it, expect } from "vitest";
import { scaffoldPlan } from "../../src/plan/scaffoldPlan";

const MINIMAL_TEMPLATE = `---
name: {{feature_slug}}
spec: {{spec_relative_path}}
created: "{{date}}"
---

# {{feature_title}}

Body.
`;

describe("scaffoldPlan", () => {
  it("renders plan with cross-link to spec", () => {
    const result = scaffoldPlan(MINIMAL_TEMPLATE, {
      featureSlug: "my-feat",
      date: "2026-04-19",
      specRelativePath: "../specs/my-feat-spec.md"
    });
    expect(result).toContain("name: my-feat");
    expect(result).toContain("spec: ../specs/my-feat-spec.md");
    expect(result).toContain("# My Feat");
  });
});
