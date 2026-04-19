import { describe, it, expect } from "vitest";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import {
  createBranch,
  createWorktree,
  hasUncommittedChanges,
  branchExists,
  removeWorktreeIfExists
} from "../../src/hunt/worktreeCreator";

function initRepo(): string {
  const root = mkdtempSync(join(tmpdir(), "matilha-wtree-"));
  const repo = join(root, "main-repo");
  execFileSync("git", ["init", repo]);
  execFileSync("git", ["config", "user.email", "t@e.com"], { cwd: repo });
  execFileSync("git", ["config", "user.name", "T"], { cwd: repo });
  execFileSync("git", ["commit", "--allow-empty", "-m", "init"], { cwd: repo });
  return repo;
}

describe("worktreeCreator", () => {
  it("createBranch creates a new branch", async () => {
    const repo = initRepo();
    try {
      await createBranch(repo, "wave-01-sp-foo");
      expect(await branchExists(repo, "wave-01-sp-foo")).toBe(true);
    } finally { rmSync(dirname(repo), { recursive: true, force: true }); }
  });

  it("createWorktree creates a worktree at the specified path", async () => {
    const repo = initRepo();
    const wt = join(dirname(repo), "sp-foo-worktree");
    try {
      await createBranch(repo, "wave-01-sp-foo");
      await createWorktree(repo, wt, "wave-01-sp-foo");
      expect(existsSync(wt)).toBe(true);
      expect(existsSync(join(wt, ".git"))).toBe(true);
    } finally { rmSync(dirname(repo), { recursive: true, force: true }); }
  });

  it("hasUncommittedChanges returns false on clean repo", async () => {
    const repo = initRepo();
    try {
      expect(await hasUncommittedChanges(repo)).toBe(false);
    } finally { rmSync(dirname(repo), { recursive: true, force: true }); }
  });

  it("hasUncommittedChanges returns true with staged or modified files", async () => {
    const repo = initRepo();
    try {
      execFileSync("bash", ["-c", "echo 'x' > a.txt"], { cwd: repo });
      expect(await hasUncommittedChanges(repo)).toBe(true);
    } finally { rmSync(dirname(repo), { recursive: true, force: true }); }
  });

  it("branchExists returns true when branch exists, false otherwise", async () => {
    const repo = initRepo();
    try {
      expect(await branchExists(repo, "nonexistent")).toBe(false);
      await createBranch(repo, "foo-branch");
      expect(await branchExists(repo, "foo-branch")).toBe(true);
    } finally { rmSync(dirname(repo), { recursive: true, force: true }); }
  });

  it("removeWorktreeIfExists is idempotent (no-op when absent)", async () => {
    const repo = initRepo();
    const wt = join(dirname(repo), "never-created");
    try {
      await expect(removeWorktreeIfExists(repo, wt)).resolves.toBeUndefined();
    } finally { rmSync(dirname(repo), { recursive: true, force: true }); }
  });

  it("removeWorktreeIfExists actually removes an existing worktree", async () => {
    const repo = initRepo();
    const wt = join(dirname(repo), "sp-temp");
    try {
      await createBranch(repo, "temp-br");
      await createWorktree(repo, wt, "temp-br");
      expect(existsSync(wt)).toBe(true);
      await removeWorktreeIfExists(repo, wt);
      expect(existsSync(wt)).toBe(false);
    } finally { rmSync(dirname(repo), { recursive: true, force: true }); }
  });
});
