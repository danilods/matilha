import { createManagedSkillFile } from "./shared";
import type { MatilhaSkillInput, ProviderFile } from "./types";

export function renderCursor(skill: MatilhaSkillInput): ProviderFile {
  return {
    provider: "cursor",
    relativePath: `.cursor/skills/${skill.name}/SKILL.md`,
    content: createManagedSkillFile("Cursor", skill, {
      name: skill.name,
      description: skill.description
    })
  };
}
