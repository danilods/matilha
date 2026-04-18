import { existsSync } from "node:fs";
import { execGit } from "./execGit";

export async function createBranch(repoCwd: string, branchName: string): Promise<void> {
  await execGit(["branch", branchName], { cwd: repoCwd });
}

export async function createWorktree(
  repoCwd: string,
  worktreePath: string,
  branchName: string
): Promise<void> {
  await execGit(["worktree", "add", worktreePath, branchName], { cwd: repoCwd });
}

export async function branchExists(repoCwd: string, branchName: string): Promise<boolean> {
  try {
    await execGit(["rev-parse", "--verify", `refs/heads/${branchName}`], { cwd: repoCwd });
    return true;
  } catch {
    return false;
  }
}

export async function hasUncommittedChanges(repoCwd: string): Promise<boolean> {
  const { stdout } = await execGit(["status", "--porcelain"], { cwd: repoCwd });
  return stdout.trim().length > 0;
}

export async function removeWorktreeIfExists(repoCwd: string, worktreePath: string): Promise<void> {
  if (!existsSync(worktreePath)) return;
  try {
    await execGit(["worktree", "remove", "--force", worktreePath], { cwd: repoCwd });
  } catch {
    // worktree not registered anymore but dir exists — best-effort cleanup
  }
}

export async function deleteBranch(repoCwd: string, branchName: string): Promise<void> {
  await execGit(["branch", "-D", branchName], { cwd: repoCwd });
}

export async function getCurrentCommit(repoCwd: string, ref: string): Promise<string> {
  const { stdout } = await execGit(["rev-parse", ref], { cwd: repoCwd });
  return stdout.trim();
}
