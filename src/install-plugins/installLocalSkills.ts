import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { tmpdir, homedir } from "node:os";
import { mkdtempSync } from "node:fs";
import { PACK_BY_SLUG, type PackSlug } from "./packCatalog";

export type LocalInstallTarget = "codex" | "cursor";
export type LocalInstallScope = "user" | "project";

export type LocalInstallOptions = {
  target: LocalInstallTarget;
  scope: LocalInstallScope;
  cwd: string;
  homeDir?: string;
  packRoots?: Partial<Record<PackSlug, string>>;
};

export type LocalInstallResult = {
  target: LocalInstallTarget;
  scope: LocalInstallScope;
  targetDir: string;
  installedSkills: string[];
};

const CURSOR_RULE = `---
description: Matilha methodology and skill activation
globs:
alwaysApply: true
---

# Matilha

- Use Matilha as the project methodology when planning, coding, reviewing, or coordinating AI-assisted software work.
- Inspect project skills under \`.cursor/skills/matilha-*/SKILL.md\` when available.
- Also inspect shared skills under \`.agents/skills/matilha-*/SKILL.md\` when present.
- Treat \`project-status.md\`, \`docs/matilha/specs/\`, \`docs/matilha/plans/\`, and \`docs/matilha/waves/\` as the source of record.
- Follow Matilha phases in order: scout, plan, design, hunt, gather, review, ship.
`;

export async function installLocalSkills(
  selection: readonly PackSlug[],
  opts: LocalInstallOptions
): Promise<LocalInstallResult> {
  if (opts.target === "cursor" && opts.scope !== "project") {
    throw new Error("Cursor target only supports project scope because Cursor rules are project-local.");
  }

  const targetDir = resolveTargetDir(opts);
  mkdirSync(targetDir, { recursive: true });

  const cleanupDirs: string[] = [];
  const installedSkills: string[] = [];
  try {
    for (const slug of selection) {
      const root = resolvePackRoot(slug, opts, cleanupDirs);
      const skillsDir = join(root, "skills");
      if (!existsSync(skillsDir)) {
        throw new Error(`Pack ${slug} has no skills directory at ${skillsDir}`);
      }

      for (const skillName of skillDirs(skillsDir)) {
        const source = join(skillsDir, skillName);
        const dest = join(targetDir, skillName);
        rmSync(dest, { recursive: true, force: true });
        cpSync(source, dest, { recursive: true });
        installedSkills.push(skillName);
      }
    }

    if (opts.target === "cursor") {
      const rulePath = join(opts.cwd, ".cursor", "rules", "matilha.mdc");
      mkdirSync(dirname(rulePath), { recursive: true });
      writeFileSync(rulePath, CURSOR_RULE, "utf-8");
    }
  } finally {
    for (const dir of cleanupDirs) {
      rmSync(dir, { recursive: true, force: true });
    }
  }

  return {
    target: opts.target,
    scope: opts.scope,
    targetDir,
    installedSkills
  };
}

function resolveTargetDir(opts: LocalInstallOptions): string {
  if (opts.target === "codex") {
    const base = opts.scope === "user"
      ? join(opts.homeDir ?? homedir(), ".agents")
      : join(opts.cwd, ".agents");
    return join(base, "skills");
  }

  return join(opts.cwd, ".cursor", "skills");
}

function resolvePackRoot(
  slug: PackSlug,
  opts: LocalInstallOptions,
  cleanupDirs: string[]
): string {
  const explicit = opts.packRoots?.[slug];
  if (explicit) return explicit;

  const sibling = join(opts.cwd, "..", slug);
  if (existsSync(join(sibling, "skills"))) return sibling;

  const entry = PACK_BY_SLUG[slug];
  const tempRoot = mkdtempSync(join(tmpdir(), `matilha-${slug}-`));
  cleanupDirs.push(tempRoot);
  execFileSync("git", [
    "clone",
    "--depth",
    "1",
    `https://github.com/${entry.marketplaceUrl}.git`,
    tempRoot
  ], { stdio: "ignore" });
  return tempRoot;
}

function skillDirs(skillsDir: string): string[] {
  return readdirSync(skillsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}
