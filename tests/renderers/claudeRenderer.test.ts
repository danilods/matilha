import { describe, it, expect } from "vitest";
import { renderClaude } from "../../src/renderers/claudeRenderer";
import type { MatilhaSkillInput } from "../../src/renderers/types";

const skill: MatilhaSkillInput = {
  name: "matilha-hunt",
  description: "d",
  phase: "40",
  version: "1.0.0",
  requires: [],
  optionalCompanions: [],
  mission: "m",
  sorReference: ["methodology/40-execucao.md"],
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

describe("renderClaude", () => {
  it("writes to .claude/skills/<name>/SKILL.md", () => {
    const result = renderClaude(skill);
    expect(result.provider).toBe("claude-code");
    expect(result.relativePath).toBe(".claude/skills/matilha-hunt/SKILL.md");
  });

  it("uses 'Claude Code' as provider title in body", () => {
    const result = renderClaude(skill);
    expect(result.content).toContain("# /matilha-hunt — Claude Code");
  });
});
