// tests/gather/mergeExecutor.test.ts
import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { mergeBranch, runTests } from "../../src/gather/mergeExecutor";

function initRepo(): string {
  const root = mkdtempSync(join(tmpdir(), "matilha-gather-merge-"));
  execFileSync("git", ["init", "-b", "main", root]);
  execFileSync("git", ["config", "user.email", "t@e.com"], { cwd: root });
  execFileSync("git", ["config", "user.name", "T"], { cwd: root });
  writeFileSync(join(root, "README.md"), "# base\n", "utf-8");
  execFileSync("git", ["add", "README.md"], { cwd: root });
  execFileSync("git", ["commit", "-m", "init"], { cwd: root });
  return root;
}

function createSPBranch(repo: string, branch: string, fileName: string, content: string): void {
  execFileSync("git", ["checkout", "-b", branch], { cwd: repo });
  writeFileSync(join(repo, fileName), content, "utf-8");
  execFileSync("git", ["add", fileName], { cwd: repo });
  execFileSync("git", ["commit", "-m", `feat: ${fileName}`], { cwd: repo });
  execFileSync("git", ["checkout", "main"], { cwd: repo });
}

describe("mergeBranch", () => {
  it("merges a non-overlapping branch with --no-ff, returns ok=true + mergeSha", async () => {
    const repo = initRepo();
    try {
      createSPBranch(repo, "wave-01-sp-one", "a.txt", "hello\n");
      const result = await mergeBranch(repo, "wave-01-sp-one");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.mergeSha).toMatch(/^[0-9a-f]{40}$/);
      }
      const log = execFileSync("git", ["log", "--pretty=%s", "-2"], { cwd: repo, encoding: "utf-8" });
      expect(log).toContain("Merge");
    } finally { rmSync(repo, { recursive: true, force: true }); }
  });

  it("detects conflict + runs merge --abort + returns reason=conflict with files[]", async () => {
    const repo = initRepo();
    try {
      createSPBranch(repo, "wave-01-sp-one", "conflict.txt", "version A\n");
      createSPBranch(repo, "wave-01-sp-two", "conflict.txt", "version B\n");
      const first = await mergeBranch(repo, "wave-01-sp-one");
      expect(first.ok).toBe(true);
      const second = await mergeBranch(repo, "wave-01-sp-two");
      expect(second.ok).toBe(false);
      if (!second.ok) {
        expect(second.reason).toBe("conflict");
        expect(second.files).toContain("conflict.txt");
      }
      const status = execFileSync("git", ["status", "--porcelain"], { cwd: repo, encoding: "utf-8" });
      expect(status.trim()).toBe("");
    } finally { rmSync(repo, { recursive: true, force: true }); }
  });

  it("returns reason=unknown when git merge fails for a reason other than conflict", async () => {
    const repo = initRepo();
    try {
      const result = await mergeBranch(repo, "branch-that-does-not-exist");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe("unknown");
      }
    } finally { rmSync(repo, { recursive: true, force: true }); }
  });
});

describe("runTests", () => {
  it("returns ok=true when test command exits 0", async () => {
    const root = mkdtempSync(join(tmpdir(), "matilha-runtests-"));
    try {
      const result = await runTests(root, { cmd: "sh", args: ["-c", "exit 0"] });
      expect(result.ok).toBe(true);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it("returns ok=false + captured output when test command exits non-zero", async () => {
    const root = mkdtempSync(join(tmpdir(), "matilha-runtests-"));
    try {
      const result = await runTests(root, { cmd: "sh", args: ["-c", "echo 'boom' >&2; exit 1"] });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.output).toContain("boom");
      }
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it("defaults to 'npm test' when no command injected", async () => {
    const root = mkdtempSync(join(tmpdir(), "matilha-runtests-default-"));
    try {
      writeFileSync(join(root, "package.json"), JSON.stringify({ name: "x", version: "0.0.0" }), "utf-8");
      const result = await runTests(root); // no opts → default npm test
      expect(result.ok).toBe(false); // npm exits non-zero when no test script
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
});
