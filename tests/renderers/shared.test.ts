import { describe, it, expect } from "vitest";
import {
  createManagedSkillBody,
  createSkillFrontmatter,
  createManagedSkillFile
} from "../../src/renderers/shared";
import { MANAGED_BLOCK_START, MANAGED_BLOCK_END } from "../../src/config";
import type { MatilhaSkillInput, SkillMetadata } from "../../src/renderers/types";

const sampleInput: MatilhaSkillInput = {
  name: "matilha-plan",
  description: "Guides PRD+Stack+Skills phases with binary gates",
  phase: "10-30",
  version: "1.0.0",
  requires: [],
  optionalCompanions: ["impeccable", "shadcn-skills", "superpowers"],

  mission: "Conduzir o usuário pela tríade PRD → Stack → Skills/Agents com gates binários.",
  sorReference: [
    "methodology/10-prd.md",
    "methodology/20-stack.md",
    "methodology/30-skills-agents.md"
  ],
  preconditions: [
    "project-status.md exists",
    "CLAUDE.md exists in root"
  ],
  executionWorkflow: [
    "Load methodology/10-prd.md",
    "For each binary gate, ask user yes/no/pending",
    "Register in project-status.md frontmatter"
  ],
  rulesDo: ["Read methodology page for every cycle"],
  rulesDont: ["Never edit methodology/*.md (SoR read-only)"],
  expectedBehavior: ["Ask human before deciding on judgment calls"],
  qualityGates: ["Every decision has timestamp"],
  companionIntegration: ["If superpowers detected, delegate brainstorming"],
  outputArtifacts: ["project-status.md frontmatter updated"],
  exampleConstraintLanguage: ['Use "must" for non-negotiable'],
  troubleshooting: ["Gate ambiguity: pause and ask human"]
};

describe("createManagedSkillBody", () => {
  it("wraps content with MANAGED block markers", () => {
    const body = createManagedSkillBody("Claude Code", sampleInput);
    expect(body).toContain(MANAGED_BLOCK_START);
    expect(body).toContain(MANAGED_BLOCK_END);
    expect(body.indexOf(MANAGED_BLOCK_START)).toBeLessThan(body.indexOf(MANAGED_BLOCK_END));
  });

  it("includes provider title in header", () => {
    const body = createManagedSkillBody("Claude Code", sampleInput);
    expect(body).toMatch(/# \/matilha-plan.*Claude Code/);
  });

  it("renders all 12 mandatory sections", () => {
    const body = createManagedSkillBody("Codex", sampleInput);
    const expectedSections = [
      "## Mission",
      "## SoR Reference",
      "## Preconditions",
      "## Execution Workflow",
      "## Rules: Do",
      "## Rules: Don't",
      "## Expected Behavior",
      "## Quality Gates",
      "## Companion Integration",
      "## Output Artifacts",
      "## Example Constraint Language",
      "## Troubleshooting"
    ];
    for (const section of expectedSections) {
      expect(body).toContain(section);
    }
  });

  it("lists rulesDo items as markdown bullets", () => {
    const body = createManagedSkillBody("Cursor", sampleInput);
    expect(body).toContain("- Read methodology page for every cycle");
  });
});

describe("createSkillFrontmatter", () => {
  it("produces valid YAML frontmatter", () => {
    const metadata: SkillMetadata = {
      name: "matilha-plan",
      description: "test description"
    };
    const fm = createSkillFrontmatter(metadata);
    expect(fm).toMatch(/^---\n/);
    expect(fm).toMatch(/\n---$/);
    expect(fm).toContain('name: "matilha-plan"');
    expect(fm).toContain('description: "test description"');
  });

  it("escapes double quotes in description", () => {
    const metadata: SkillMetadata = {
      name: "x",
      description: 'hello "world"'
    };
    const fm = createSkillFrontmatter(metadata);
    expect(fm).toContain('description: "hello \\"world\\""');
  });
});

describe("createManagedSkillFile", () => {
  it("concatenates frontmatter and body with blank line", () => {
    const metadata: SkillMetadata = {
      name: "matilha-plan",
      description: "test"
    };
    const file = createManagedSkillFile("Claude Code", sampleInput, metadata);
    expect(file).toMatch(/^---\n/);
    expect(file).toContain('name: "matilha-plan"');
    expect(file).toContain(MANAGED_BLOCK_START);
    expect(file).toContain(MANAGED_BLOCK_END);
  });
});
