import { describe, it, expect } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { execGit } from "../../src/hunt/execGit";

function initRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), "matilha-git-"));
  execFileSync("git", ["init"], { cwd: dir });
  execFileSync("git", ["config", "user.email", "test@example.com"], { cwd: dir });
  execFileSync("git", ["config", "user.name", "Test"], { cwd: dir });
  execFileSync("git", ["commit", "--allow-empty", "-m", "init"], { cwd: dir });
  return dir;
}

describe("execGit", () => {
  it("runs a git command and returns stdout", async () => {
    const dir = initRepo();
    try {
      const { stdout } = await execGit(["rev-parse", "HEAD"], { cwd: dir });
      expect(stdout.trim()).toMatch(/^[a-f0-9]{40}$/);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  it("rejects with Error on non-zero exit", async () => {
    const dir = initRepo();
    try {
      await expect(execGit(["checkout", "nonexistent-branch"], { cwd: dir })).rejects.toThrow();
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  it("preserves stderr in error for diagnostic purposes", async () => {
    const dir = initRepo();
    try {
      try {
        await execGit(["checkout", "nonexistent"], { cwd: dir });
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
        expect((e as Error).message).toMatch(/did not match|not found|fatal/i);
      }
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
});
