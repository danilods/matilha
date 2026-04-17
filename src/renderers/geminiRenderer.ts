import { createManagedSkillFile } from "./shared";
import type { MatilhaSkillInput, ProviderFile } from "./types";

export function renderGemini(skill: MatilhaSkillInput): ProviderFile {
  return {
    provider: "gemini-cli",
    relativePath: `.gemini/skills/${skill.name}/SKILL.md`,
    content: createManagedSkillFile("Gemini CLI", skill, {
      name: skill.name,
      description: skill.description
    })
  };
}
