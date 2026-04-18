import { existsSync } from "node:fs";
import { homedir } from "node:os";
import type { Companion } from "../domain/companionSchema";
import type { Tool } from "./detectTools";

export type CompanionStatus = {
  installed: boolean;
  detectedAt?: string;
};

/**
 * Expand leading ~/ to home directory. Returns absolute path.
 * Uses process.env.HOME when available so tests can override HOME.
 */
function expandHome(p: string): string {
  if (p.startsWith("~/")) {
    const home = process.env.HOME ?? homedir();
    return home + p.slice(1);
  }
  return p;
}

/**
 * Detect if a companion is installed.
 * Returns installed=true if ANY path from companion.detect (restricted to
 * detected tools) exists on disk.
 */
export function detectCompanion(
  companion: Companion,
  detected: readonly Tool[]
): CompanionStatus {
  const detectedSet = new Set<Tool>(detected);

  for (const [toolKey, path] of Object.entries(companion.detect)) {
    if (!detectedSet.has(toolKey as Tool)) continue;
    const expanded = expandHome(path);
    if (existsSync(expanded)) {
      return { installed: true, detectedAt: expanded };
    }
  }
  return { installed: false };
}
