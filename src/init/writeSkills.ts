import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { RegistryClient } from "../registry/registryClient";
import { TOOL_TARGETS } from "./detectTools";
import type { Tool } from "./detectTools";

export type WrittenSkill = {
  slug: string;
  paths: string[];
};

const UNIVERSAL_DIR = ".agents";

/**
 * Pull all skills from the registry index and write each to:
 * - .agents/skills/<slug>/SKILL.md (always)
 * - each detected tool's native skill directory when it differs from .agents
 */
export async function writeSkills(
  detected: readonly Tool[],
  cwd: string,
  dryRun: boolean,
  client: RegistryClient = new RegistryClient()
): Promise<WrittenSkill[]> {
  const entries = await client.list();

  const targetDirs = new Set<string>([UNIVERSAL_DIR]);
  for (const tool of detected) {
    const skillDir = TOOL_TARGETS[tool].skillDir;
    if (skillDir) {
      targetDirs.add(skillDir);
    }
  }

  const results: WrittenSkill[] = [];
  for (const entry of entries) {
    const skillContent = await client.pull(entry.slug);
    const paths: string[] = [];

    for (const dir of targetDirs) {
      const path = join(cwd, dir, "skills", entry.slug, "SKILL.md");
      paths.push(path);
      if (!dryRun) {
        mkdirSync(dirname(path), { recursive: true });
        writeFileSync(path, skillContent, "utf-8");
      }
    }

    results.push({ slug: entry.slug, paths });
  }

  return results;
}
