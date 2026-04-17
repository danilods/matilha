import { describe, it, expect } from "vitest";
import { renderUniversal } from "../../src/renderers/universalRenderer";
import type { MatilhaSkillInput } from "../../src/renderers/types";

const minimalSkill: MatilhaSkillInput = {
  name: "matilha-scout",
  description: "desc",
  phase: "00",
  version: "1.0.0",
  requires: [],
  optionalCompanions: [],
  mission: "m",
  sorReference: ["methodology/00-mapeamento-problema.md"],
  preconditions: ["pre"],
  executionWorkflow: ["step"],
  rulesDo: ["do"],
  rulesDont: ["dont"],
  expectedBehavior: ["beh"],
  qualityGates: ["gate"],
  companionIntegration: ["ci"],
  outputArtifacts: ["oa"],
  exampleConstraintLanguage: ["ec"],
  troubleshooting: ["ts"]
};

describe("renderUniversal", () => {
  it("writes to .agents/skills/<name>/SKILL.md", () => {
    const result = renderUniversal(minimalSkill);
    expect(result.provider).toBe("universal");
    expect(result.relativePath).toBe(".agents/skills/matilha-scout/SKILL.md");
  });

  it("includes frontmatter + managed body", () => {
    const result = renderUniversal(minimalSkill);
    expect(result.content).toMatch(/^---\n/);
    expect(result.content).toContain("<!-- MATILHA_MANAGED_START -->");
  });
});
