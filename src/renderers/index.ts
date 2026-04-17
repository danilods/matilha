export type { Provider, ProviderFile, MatilhaSkillInput, SkillMetadata } from "./types";
export { createManagedSkillBody, createSkillFrontmatter, createManagedSkillFile } from "./shared";
export { renderUniversal } from "./universalRenderer";
export { renderClaude } from "./claudeRenderer";
export { renderCursor } from "./cursorRenderer";
export { renderCodex } from "./codexRenderer";
export { renderGemini } from "./geminiRenderer";

import { renderUniversal } from "./universalRenderer";
import { renderClaude } from "./claudeRenderer";
import { renderCursor } from "./cursorRenderer";
import { renderCodex } from "./codexRenderer";
import { renderGemini } from "./geminiRenderer";
import type { MatilhaSkillInput, Provider, ProviderFile } from "./types";

export const RENDERERS = {
  "universal": renderUniversal,
  "claude-code": renderClaude,
  "cursor": renderCursor,
  "codex": renderCodex,
  "gemini-cli": renderGemini
} as const satisfies Record<Provider, (skill: MatilhaSkillInput) => ProviderFile>;

export function renderAll(
  skill: MatilhaSkillInput,
  providers: readonly Provider[]
): ProviderFile[] {
  const uniqueProviders = new Set<Provider>(providers);
  uniqueProviders.add("universal");
  return Array.from(uniqueProviders).map((p) => RENDERERS[p](skill));
}
