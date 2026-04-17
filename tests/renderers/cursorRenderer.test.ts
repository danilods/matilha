import { describe, it, expect } from "vitest";
import { renderCursor } from "../../src/renderers/cursorRenderer";
import type { MatilhaSkillInput } from "../../src/renderers/types";

const skill: MatilhaSkillInput = {
  name: "matilha-gather",
  description: "d",
  phase: "40",
  version: "1.0.0",
  requires: [],
  optionalCompanions: [],
  mission: "m",
  sorReference: [],
  preconditions: [],
  executionWorkflow: [],
  rulesDo: [],
  rulesDont: [],
  expectedBehavior: [],
  qualityGates: [],
  companionIntegration: [],
  outputArtifacts: [],
  exampleConstraintLanguage: [],
  troubleshooting: []
};

describe("renderCursor", () => {
  it("writes to .cursor/skills/<name>/SKILL.md", () => {
    const result = renderCursor(skill);
    expect(result.provider).toBe("cursor");
    expect(result.relativePath).toBe(".cursor/skills/matilha-gather/SKILL.md");
  });

  it("uses 'Cursor' as provider title", () => {
    const result = renderCursor(skill);
    expect(result.content).toContain("# /matilha-gather — Cursor");
  });
});
