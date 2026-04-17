import { createManagedSkillFile } from "./shared";
import type { MatilhaSkillInput, ProviderFile } from "./types";

export function renderCodex(skill: MatilhaSkillInput): ProviderFile {
  return {
    provider: "codex",
    relativePath: `.codex/skills/${skill.name}/SKILL.md`,
    content: createManagedSkillFile("Codex", skill, {
      name: skill.name,
      description: skill.description
    })
  };
}
