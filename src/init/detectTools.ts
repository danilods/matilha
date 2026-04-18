import { existsSync } from "node:fs";
import { join } from "node:path";
import { TOOLS } from "../config";

export type Tool = typeof TOOLS[number];

/**
 * Map each tool slug to the directory that indicates its presence in a project.
 */
export const TOOL_DIR_MAP: Record<Tool, string> = {
  "claude-code": ".claude",
  "cursor": ".cursor",
  "codex": ".codex",
  "gemini-cli": ".gemini"
};

/**
 * Detect which AI agentic tools have scaffolding in the project directory.
 * Returns array of tool slugs in TOOLS constant order (stable).
 */
export function detectTools(cwd: string): Tool[] {
  return TOOLS.filter((tool) => existsSync(join(cwd, TOOL_DIR_MAP[tool])));
}
