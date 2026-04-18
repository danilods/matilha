import { describe, it, expect } from "vitest";
import { scaffoldSpec } from "../../src/plan/scaffoldSpec";

const MINIMAL_TEMPLATE = `---
name: {{feature_slug}}
created: "{{date}}"
archetype: {{archetype}}
---

# {{feature_title}}

{{research_context_block}}

## 2. Problem Statement
[placeholder]

## Links
- Plan: {{plan_relative_path}}
`;

describe("scaffoldSpec", () => {
  it("renders placeholders; research block is empty when no research", () => {
    const result = scaffoldSpec(MINIMAL_TEMPLATE, {
      featureSlug: "my-feature",
      archetype: "saas-b2b",
      date: "2026-04-19",
      planRelativePath: "../plans/my-feature-plan.md"
    });
    expect(result).toContain("name: my-feature");
    expect(result).toContain("# My Feature");
    expect(result).not.toContain("## 1. Research Context");
    expect(result).toContain("../plans/my-feature-plan.md");
  });

  it("injects research block as Section 1 when provided", () => {
    const result = scaffoldSpec(MINIMAL_TEMPLATE, {
      featureSlug: "x",
      archetype: "cli",
      date: "2026-04-19",
      planRelativePath: "./p.md",
      research: { filename: "r.md", content: "# Deep research\nBody", sha256: "abc123" }
    });
    expect(result).toContain("## 1. Research Context (imported)");
    expect(result).toContain("Imported from `r.md`");
    expect(result).toContain("<!-- MATILHA_RESEARCH_START -->");
    expect(result).toContain("# Deep research");
    expect(result).toContain("<!-- MATILHA_RESEARCH_END -->");
  });

  it("title-cases kebab-slug correctly", () => {
    const result = scaffoldSpec(MINIMAL_TEMPLATE, {
      featureSlug: "user-onboarding-flow",
      archetype: "saas-b2b",
      date: "2026-04-19",
      planRelativePath: "./p.md"
    });
    expect(result).toContain("# User Onboarding Flow");
  });
});
