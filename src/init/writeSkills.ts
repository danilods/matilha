import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { RegistryClient } from "../registry/registryClient";
import { TOOL_DIR_MAP } from "./detectTools";
import type { Tool } from "./detectTools";

export type WrittenSkill = {
  slug: string;
  paths: string[];
};

const UNIVERSAL_DIR = ".agents";

/**
 * Pull all skills from the registry index and write each to:
 * - .agents/skills/<slug>/SKILL.md (always)
 * - .<toolDir>/skills/<slug>/SKILL.md for each detected tool
 */
export async function writeSkills(
  detected: readonly Tool[],
  cwd: string,
  dryRun: boolean,
  client: RegistryClient = new RegistryClient()
): Promise<WrittenSkill[]> {
  const entries = await client.list();

  const targetDirs: string[] = [UNIVERSAL_DIR];
  for (const tool of detected) {
    targetDirs.push(TOOL_DIR_MAP[tool]);
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
