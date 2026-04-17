import { createManagedSkillFile } from "./shared";
import type { MatilhaSkillInput, ProviderFile } from "./types";

export function renderClaude(skill: MatilhaSkillInput): ProviderFile {
  return {
    provider: "claude-code",
    relativePath: `.claude/skills/${skill.name}/SKILL.md`,
    content: createManagedSkillFile("Claude Code", skill, {
      name: skill.name,
      description: skill.description
    })
  };
}
