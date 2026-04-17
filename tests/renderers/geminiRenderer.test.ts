import { describe, it, expect } from "vitest";
import { renderGemini } from "../../src/renderers/geminiRenderer";
import { renderAll } from "../../src/renderers";
import type { MatilhaSkillInput } from "../../src/renderers/types";

const skill: MatilhaSkillInput = {
  name: "matilha-den",
  description: "d",
  phase: "60",
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

describe("renderGemini", () => {
  it("writes to .gemini/skills/<name>/SKILL.md", () => {
    const result = renderGemini(skill);
    expect(result.provider).toBe("gemini-cli");
    expect(result.relativePath).toBe(".gemini/skills/matilha-den/SKILL.md");
  });

  it("uses 'Gemini CLI' as provider title", () => {
    const result = renderGemini(skill);
    expect(result.content).toContain("# /matilha-den — Gemini CLI");
  });
});

describe("renderAll", () => {
  it("always includes universal even if not in providers list", () => {
    const files = renderAll(skill, ["claude-code"]);
    const providers = files.map((f) => f.provider);
    expect(providers).toContain("universal");
    expect(providers).toContain("claude-code");
    expect(files.length).toBe(2);
  });

  it("deduplicates when universal explicitly listed", () => {
    const files = renderAll(skill, ["universal", "claude-code", "claude-code"]);
    expect(files.length).toBe(2);
  });

  it("renders all 5 providers when all specified", () => {
    const files = renderAll(skill, ["universal", "claude-code", "cursor", "codex", "gemini-cli"]);
    expect(files.length).toBe(5);
  });
});
