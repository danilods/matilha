import { createManagedSkillFile } from "./shared";
import type { MatilhaSkillInput, ProviderFile } from "./types";

export function renderUniversal(skill: MatilhaSkillInput): ProviderFile {
  return {
    provider: "universal",
    relativePath: `.agents/skills/${skill.name}/SKILL.md`,
    content: createManagedSkillFile("Universal", skill, {
      name: skill.name,
      description: skill.description
    })
  };
}
