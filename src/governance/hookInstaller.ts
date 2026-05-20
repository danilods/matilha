import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { execGit } from "../hunt/execGit";

const BLOCK_START = "# >>> matilha governance >>>";
const BLOCK_END = "# <<< matilha governance <<<";
// Non-greedy middle ([\s\S]*?) prevents two separately-inserted matilha blocks
// from collapsing into one during replace — mirrors the intent in writeClaudeMd.ts.
const BLOCK_REGEX = /# >>> matilha governance >>>[\s\S]*?# <<< matilha governance <<</;

const HOOK_BLOCKS: Record<string, string> = {
  "commit-msg": `${BLOCK_START}\nmatilha jira hooks run-commit-msg "$1" || true\n${BLOCK_END}`,
  "post-commit": `${BLOCK_START}\nmatilha jira hooks run-post-commit || true\n${BLOCK_END}`
};

export type HookInstallAction = "created" | "appended" | "replaced";

export type HookInstallResult = {
  hook: string;
  path: string;
  action: HookInstallAction;
};

export async function installGovernanceHooks(cwd: string): Promise<HookInstallResult[]> {
  const hooksDirRaw = (await execGit(["rev-parse", "--git-path", "hooks"], { cwd })).stdout.trim();
  const hooksDir = resolve(cwd, hooksDirRaw);
  mkdirSync(hooksDir, { recursive: true });

  const results: HookInstallResult[] = [];

  for (const hook of ["commit-msg", "post-commit"]) {
    const path = resolve(hooksDir, hook);
    const block = HOOK_BLOCKS[hook]!;
    let action: HookInstallAction;

    if (!existsSync(path)) {
      writeFileSync(path, `#!/bin/sh\n${block}\n`, "utf-8");
      action = "created";
    } else {
      const existing = readFileSync(path, "utf-8");
      if (BLOCK_REGEX.test(existing)) {
        writeFileSync(path, ensureTrailingNewline(existing.replace(BLOCK_REGEX, block)), "utf-8");
        action = "replaced";
      } else {
        const base = existing.endsWith("\n") ? existing : `${existing}\n`;
        writeFileSync(path, `${base}${block}\n`, "utf-8");
        action = "appended";
      }
    }

    chmodSync(path, 0o755);
    results.push({ hook, path, action });
  }
  return results;
}

function ensureTrailingNewline(value: string): string {
  return value.endsWith("\n") ? value : `${value}\n`;
}
