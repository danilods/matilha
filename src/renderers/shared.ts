import { MANAGED_BLOCK_START, MANAGED_BLOCK_END } from "../config";
import type { MatilhaSkillInput, SkillMetadata } from "./types";

function bulletList(items: string[]): string {
  return items.map((item) => `- ${item}`).join("\n");
}

function numberedList(items: string[]): string {
  return items.map((item, idx) => `${idx + 1}. ${item}`).join("\n");
}

export function createManagedSkillBody(
  providerTitle: string,
  skill: MatilhaSkillInput
): string {
  return [
    MANAGED_BLOCK_START,
    `# /${skill.name} — ${providerTitle}`,
    "",
    "## Mission",
    skill.mission,
    "",
    "## SoR Reference",
    "Content of truth lives in:",
    bulletList(skill.sorReference),
    "",
    "ALWAYS consult these pages for latest gates.",
    "",
    "## Preconditions",
    bulletList(skill.preconditions),
    "",
    "## Execution Workflow",
    numberedList(skill.executionWorkflow),
    "",
    "## Rules: Do",
    bulletList(skill.rulesDo),
    "",
    "## Rules: Don't",
    bulletList(skill.rulesDont),
    "",
    "## Expected Behavior",
    bulletList(skill.expectedBehavior),
    "",
    "## Quality Gates",
    bulletList(skill.qualityGates),
    "",
    "## Companion Integration",
    bulletList(skill.companionIntegration),
    "",
    "## Output Artifacts",
    bulletList(skill.outputArtifacts),
    "",
    "## Example Constraint Language",
    bulletList(skill.exampleConstraintLanguage),
    "",
    "## Troubleshooting",
    bulletList(skill.troubleshooting),
    "",
    MANAGED_BLOCK_END
  ].join("\n");
}

function escapeYamlString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export function createSkillFrontmatter(metadata: SkillMetadata): string {
  const lines = [
    "---",
    `name: "${escapeYamlString(metadata.name)}"`,
    `description: "${escapeYamlString(metadata.description)}"`
  ];
  if (metadata.author) lines.push(`author: "${escapeYamlString(metadata.author)}"`);
  if (metadata.license) lines.push(`license: "${escapeYamlString(metadata.license)}"`);
  lines.push("---");
  return lines.join("\n");
}

export function createManagedSkillFile(
  providerTitle: string,
  skill: MatilhaSkillInput,
  metadata: SkillMetadata
): string {
  return `${createSkillFrontmatter(metadata)}\n\n${createManagedSkillBody(providerTitle, skill)}`;
}
