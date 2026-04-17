import { describe, it, expect } from "vitest";
import { renderCodex } from "../../src/renderers/codexRenderer";
import type { MatilhaSkillInput } from "../../src/renderers/types";

const skill: MatilhaSkillInput = {
  name: "matilha-review",
  description: "d",
  phase: "50",
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

describe("renderCodex", () => {
  it("writes to .codex/skills/<name>/SKILL.md", () => {
    const result = renderCodex(skill);
    expect(result.provider).toBe("codex");
    expect(result.relativePath).toBe(".codex/skills/matilha-review/SKILL.md");
  });

  it("uses 'Codex' as provider title", () => {
    const result = renderCodex(skill);
    expect(result.content).toContain("# /matilha-review — Codex");
  });
});
