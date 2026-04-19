// tests/gather/cleanupExecutor.test.ts
import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { cleanupSP } from "../../src/gather/cleanupExecutor";

function initRepoWithSP(): { repo: string; wtPath: string; branch: string } {
  const root = mkdtempSync(join(tmpdir(), "matilha-gather-clean-"));
  const repo = join(root, "repo");
  execFileSync("git", ["init", "-b", "main", repo]);
  execFileSync("git", ["config", "user.email", "t@e.com"], { cwd: repo });
  execFileSync("git", ["config", "user.name", "T"], { cwd: repo });
  writeFileSync(join(repo, "README.md"), "# base\n", "utf-8");
  execFileSync("git", ["add", "README.md"], { cwd: repo });
  execFileSync("git", ["commit", "-m", "init"], { cwd: repo });

  const branch = "wave-01-sp-foo";
  const wtPath = join(root, "sp-foo-worktree");
  execFileSync("git", ["branch", branch], { cwd: repo });
  execFileSync("git", ["worktree", "add", wtPath, branch], { cwd: repo });
  // Merge the branch to main so safe-delete (-d) accepts it
  execFileSync("git", ["merge", "--no-ff", "--no-edit", branch], { cwd: repo });
  return { repo, wtPath, branch };
}

describe("cleanupSP", () => {
  it("removes an existing worktree and deletes the merged branch", async () => {
    const { repo, wtPath, branch } = initRepoWithSP();
    try {
      expect(existsSync(wtPath)).toBe(true);
      const result = await cleanupSP(repo, wtPath, branch);
      expect(result.worktreeRemoved).toBe(true);
      expect(result.branchDeleted).toBe(true);
      expect(existsSync(wtPath)).toBe(false);
      const branches = execFileSync("git", ["branch"], { cwd: repo, encoding: "utf-8" });
      expect(branches).not.toContain(branch);
    } finally { rmSync(dirname(repo), { recursive: true, force: true }); }
  });

  it("is idempotent when the worktree is already absent", async () => {
    const { repo, wtPath, branch } = initRepoWithSP();
    try {
      execFileSync("git", ["worktree", "remove", "--force", wtPath], { cwd: repo });
      expect(existsSync(wtPath)).toBe(false);
      const result = await cleanupSP(repo, wtPath, branch);
      expect(result.worktreeRemoved).toBe(false); // already gone
      expect(result.branchDeleted).toBe(true);
    } finally { rmSync(dirname(repo), { recursive: true, force: true }); }
  });

  it("is idempotent when the branch is already deleted", async () => {
    const { repo, wtPath, branch } = initRepoWithSP();
    try {
      execFileSync("git", ["worktree", "remove", "--force", wtPath], { cwd: repo });
      execFileSync("git", ["branch", "-d", branch], { cwd: repo });
      const result = await cleanupSP(repo, wtPath, branch);
      expect(result.worktreeRemoved).toBe(false);
      expect(result.branchDeleted).toBe(false);
    } finally { rmSync(dirname(repo), { recursive: true, force: true }); }
  });

  it("refuses to delete an unmerged branch (uses 'branch -d' not '-D')", async () => {
    const root = mkdtempSync(join(tmpdir(), "matilha-gather-clean-unmerged-"));
    const repo = join(root, "repo");
    try {
      execFileSync("git", ["init", "-b", "main", repo]);
      execFileSync("git", ["config", "user.email", "t@e.com"], { cwd: repo });
      execFileSync("git", ["config", "user.name", "T"], { cwd: repo });
      writeFileSync(join(repo, "README.md"), "# base\n", "utf-8");
      execFileSync("git", ["add", "README.md"], { cwd: repo });
      execFileSync("git", ["commit", "-m", "init"], { cwd: repo });

      execFileSync("git", ["checkout", "-b", "unmerged-branch"], { cwd: repo });
      writeFileSync(join(repo, "only-on-branch.txt"), "x\n", "utf-8");
      execFileSync("git", ["add", "only-on-branch.txt"], { cwd: repo });
      execFileSync("git", ["commit", "-m", "branch work"], { cwd: repo });
      execFileSync("git", ["checkout", "main"], { cwd: repo });

      const wtPath = join(root, "ghost-worktree");
      const result = await cleanupSP(repo, wtPath, "unmerged-branch");
      expect(result.worktreeRemoved).toBe(false);
      expect(result.branchDeleted).toBe(false); // safe -d refused
      const branches = execFileSync("git", ["branch"], { cwd: repo, encoding: "utf-8" });
      expect(branches).toContain("unmerged-branch");
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it("is a no-op for a branch that never existed", async () => {
    const { repo, wtPath } = initRepoWithSP();
    try {
      const result = await cleanupSP(repo, wtPath + "-never", "never-existed-branch");
      expect(result.worktreeRemoved).toBe(false);
      expect(result.branchDeleted).toBe(false);
    } finally { rmSync(dirname(repo), { recursive: true, force: true }); }
  });
});
