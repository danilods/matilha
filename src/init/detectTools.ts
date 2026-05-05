import { existsSync } from "node:fs";
import { join } from "node:path";
import { TOOLS } from "../config";

export type Tool = typeof TOOLS[number];

export type ToolTarget = {
  detectionMarkers: string[];
  skillDir?: string;
};

/**
 * Tool-specific project markers and skill install targets.
 *
 * Detection markers answer "does this project look configured for this tool?".
 * Skill dirs answer "where should Matilha write SKILL.md files for this tool?".
 */
export const TOOL_TARGETS: Record<Tool, ToolTarget> = {
  "claude-code": {
    detectionMarkers: [".claude"],
    skillDir: ".claude"
  },
  "cursor": {
    detectionMarkers: [".cursor", ".cursor/rules", ".cursorrules"],
    skillDir: ".cursor"
  },
  "codex": {
    detectionMarkers: [".codex", "AGENTS.md", ".agents/skills"],
    skillDir: ".agents"
  },
  "gemini-cli": {
    detectionMarkers: [".gemini", "GEMINI.md", "gemini-extension.json", ".gemini/skills"],
    skillDir: ".gemini"
  },
  "aider": {
    detectionMarkers: [".aider.conf.yml", ".aiderignore", "CONVENTIONS.md"]
  }
};

export const TOOL_DIR_MAP: Record<Tool, string> = {
  "claude-code": TOOL_TARGETS["claude-code"].detectionMarkers[0]!,
  "cursor": TOOL_TARGETS.cursor.detectionMarkers[0]!,
  "codex": TOOL_TARGETS.codex.detectionMarkers[0]!,
  "gemini-cli": TOOL_TARGETS["gemini-cli"].detectionMarkers[0]!,
  "aider": TOOL_TARGETS.aider.detectionMarkers[0]!
};

/**
 * Detect which AI agentic tools have scaffolding in the project directory.
 * Returns array of tool slugs in TOOLS constant order (stable).
 */
export function detectTools(cwd: string): Tool[] {
  return TOOLS.filter((tool) =>
    TOOL_TARGETS[tool].detectionMarkers.some((marker) => existsSync(join(cwd, marker)))
  );
}
