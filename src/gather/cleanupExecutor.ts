// src/gather/cleanupExecutor.ts
import { existsSync } from "node:fs";
import { execGit } from "../hunt/execGit";

export type CleanupResult = {
  worktreeRemoved: boolean;
  branchDeleted: boolean;
};

async function worktreeExistsInGit(cwd: string, worktreePath: string): Promise<boolean> {
  try {
    const { stdout } = await execGit(["worktree", "list", "--porcelain"], { cwd });
    return stdout.split("\n").some((l) => l.startsWith(`worktree ${worktreePath}`));
  } catch {
    return false;
  }
}

async function branchExists(cwd: string, branch: string): Promise<boolean> {
  try {
    await execGit(["rev-parse", "--verify", `refs/heads/${branch}`], { cwd });
    return true;
  } catch {
    return false;
  }
}

export async function cleanupSP(
  repoCwd: string,
  worktreePath: string,
  branch: string
): Promise<CleanupResult> {
  let worktreeRemoved = false;
  if (existsSync(worktreePath) || (await worktreeExistsInGit(repoCwd, worktreePath))) {
    try {
      await execGit(["worktree", "remove", "--force", worktreePath], { cwd: repoCwd });
      worktreeRemoved = true;
    } catch { /* best-effort */ }
  }

  let branchDeleted = false;
  if (await branchExists(repoCwd, branch)) {
    try {
      await execGit(["branch", "-d", branch], { cwd: repoCwd });
      branchDeleted = true;
    } catch { /* refused — not merged; keep branch */ }
  }

  return { worktreeRemoved, branchDeleted };
}
