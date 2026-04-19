// tests/gather/gatherCommand.test.ts
import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { gatherCommand } from "../../src/gather/gatherCommand";
import { readWaveStatus } from "../../src/gather/waveStatusReader";
import { MatilhaUserError } from "../../src/ui/errorFormat";

const PASS_TEST_CMD = { cmd: "sh", args: ["-c", "exit 0"] };
const FAIL_TEST_CMD = { cmd: "sh", args: ["-c", "echo 'regression!' >&2; exit 1"] };

function validSPDone(sp_id: string, feature: string, wave: string, commitSha: string): string {
  return `---
type: sp-done
sp_id: ${sp_id}
feature: ${feature}
wave: ${wave}
status: completed
completed_at: "2026-04-19T12:00:00Z"
commits:
  - ${commitSha}
tests:
  passed: true
  count: 3
---

# SP-DONE — ${sp_id} / ${feature}
`;
}

function setupGatherable(opts: { overlap?: boolean } = {}): { repo: string; wtA: string; wtB: string } {
  const root = mkdtempSync(join(tmpdir(), "matilha-gather-cmd-"));
  const repo = join(root, "main-repo");
  execFileSync("git", ["init", "-b", "main", repo]);
  execFileSync("git", ["config", "user.email", "t@e.com"], { cwd: repo });
  execFileSync("git", ["config", "user.name", "T"], { cwd: repo });
  writeFileSync(join(repo, "README.md"), "# base\n", "utf-8");
  execFileSync("git", ["add", "README.md"], { cwd: repo });
  execFileSync("git", ["commit", "-m", "init"], { cwd: repo });

  const branchA = "wave-01-sp-a";
  const branchB = "wave-01-sp-b";
  const wtA = join(root, "test-sp-a-worktree");
  const wtB = join(root, "test-sp-b-worktree");

  for (const [branch, wt, unique] of [
    [branchA, wtA, "a.txt"] as const,
    [branchB, wtB, opts.overlap ? "a.txt" : "b.txt"] as const
  ]) {
    execFileSync("git", ["branch", branch], { cwd: repo });
    execFileSync("git", ["worktree", "add", wt, branch], { cwd: repo });
    writeFileSync(join(wt, unique), `content for ${branch}\n`, "utf-8");
    execFileSync("git", ["add", unique], { cwd: wt });
    execFileSync("git", ["commit", "-m", `feat(${branch}): ${unique}`], { cwd: wt });
    const sha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: wt, encoding: "utf-8" }).trim();
    const sp_id = branch === branchA ? "SP1" : "SP2";
    // SP-DONE.md lives in the worktree, not the branch — the reader reads from disk.
    // Leaving it uncommitted avoids cross-SP file collisions at merge time.
    writeFileSync(join(wt, "SP-DONE.md"), validSPDone(sp_id, "feat-auth", "w1", sha), "utf-8");
  }

  mkdirSync(join(repo, "docs/matilha/waves"), { recursive: true });
  const waveStatusPath = join(repo, "docs/matilha/waves/wave-01-status.md");
  writeFileSync(waveStatusPath, `---
wave: w1
created: "2026-04-19T00:00:00Z"
started: null
ended: null
status: pending
plan: docs/matilha/plans/feat-auth-plan.md
sps:
  SP1:
    branch: wave-01-sp-a
    worktree: ${wtA}
    status: pending
    started: null
    session_id: null
  SP2:
    branch: wave-01-sp-b
    worktree: ${wtB}
    status: pending
    started: null
    session_id: null
merge_order:
  - SP1
  - SP2
regression_status: pending
review_report: null
---

# Wave 01 Status
`, "utf-8");
  execFileSync("git", ["add", "docs/matilha/waves/wave-01-status.md"], { cwd: repo });
  execFileSync("git", ["commit", "-m", "chore: wave-01 status"], { cwd: repo });

  return { repo, wtA, wtB };
}

describe("gatherCommand — happy path", () => {
  it("merges both SPs in order, marks wave completed, regression passed", async () => {
    const { repo } = setupGatherable();
    try {
      await gatherCommand(repo, "feat-auth", { wave: 1, testCmd: PASS_TEST_CMD });
      const { wave } = readWaveStatus(repo, 1);
      expect(wave.status).toBe("completed");
      expect(wave.regression_status).toBe("passed");
      expect(wave.sps.SP1!.status).toBe("completed");
      expect(wave.sps.SP2!.status).toBe("completed");
      const log = execFileSync("git", ["log", "--pretty=%s", "-5"], { cwd: repo, encoding: "utf-8" });
      expect(log).toContain("Merge");
    } finally { rmSync(dirname(repo), { recursive: true, force: true }); }
  });
});

describe("gatherCommand — pre-flight halts", () => {
  it("halts when SP-DONE.md is missing", async () => {
    const { repo, wtA } = setupGatherable();
    try {
      rmSync(join(wtA, "SP-DONE.md"));
      await expect(gatherCommand(repo, "feat-auth", { wave: 1, testCmd: PASS_TEST_CMD }))
        .rejects.toThrow(MatilhaUserError);
    } finally { rmSync(dirname(repo), { recursive: true, force: true }); }
  });

  it("halts when SP-DONE.md has status=pending", async () => {
    const { repo, wtA } = setupGatherable();
    try {
      const p = join(wtA, "SP-DONE.md");
      const content = readFileSync(p, "utf-8").replace("status: completed", "status: pending");
      writeFileSync(p, content, "utf-8");
      execFileSync("git", ["add", "SP-DONE.md"], { cwd: wtA });
      execFileSync("git", ["commit", "-m", "pending"], { cwd: wtA });
      await expect(gatherCommand(repo, "feat-auth", { wave: 1, testCmd: PASS_TEST_CMD }))
        .rejects.toThrow(MatilhaUserError);
    } finally { rmSync(dirname(repo), { recursive: true, force: true }); }
  });

  it("halts when tests.passed is false", async () => {
    const { repo, wtA } = setupGatherable();
    try {
      const p = join(wtA, "SP-DONE.md");
      const content = readFileSync(p, "utf-8").replace("passed: true", "passed: false");
      writeFileSync(p, content, "utf-8");
      execFileSync("git", ["add", "SP-DONE.md"], { cwd: wtA });
      execFileSync("git", ["commit", "-m", "tests fail"], { cwd: wtA });
      await expect(gatherCommand(repo, "feat-auth", { wave: 1, testCmd: PASS_TEST_CMD }))
        .rejects.toThrow(MatilhaUserError);
    } finally { rmSync(dirname(repo), { recursive: true, force: true }); }
  });

  it("halts when working tree is dirty", async () => {
    const { repo } = setupGatherable();
    try {
      writeFileSync(join(repo, "dirty.txt"), "uncommitted\n", "utf-8");
      await expect(gatherCommand(repo, "feat-auth", { wave: 1, testCmd: PASS_TEST_CMD }))
        .rejects.toThrow(MatilhaUserError);
    } finally { rmSync(dirname(repo), { recursive: true, force: true }); }
  });
});

describe("gatherCommand — loop halts", () => {
  it("halts on merge conflict, marks SP failed", async () => {
    const { repo } = setupGatherable({ overlap: true });
    try {
      await expect(gatherCommand(repo, "feat-auth", { wave: 1, testCmd: PASS_TEST_CMD }))
        .rejects.toThrow(MatilhaUserError);
      const { wave } = readWaveStatus(repo, 1);
      expect(wave.sps.SP1!.status).toBe("completed"); // first merge ok
      expect(wave.sps.SP2!.status).toBe("failed");    // second conflicts
      expect(wave.regression_status).toBe("failed");
    } finally { rmSync(dirname(repo), { recursive: true, force: true }); }
  });

  it("halts on regression failure after a merge, marks SP failed", async () => {
    const { repo } = setupGatherable();
    try {
      await expect(gatherCommand(repo, "feat-auth", { wave: 1, testCmd: FAIL_TEST_CMD }))
        .rejects.toThrow(MatilhaUserError);
      const { wave } = readWaveStatus(repo, 1);
      expect(wave.sps.SP1!.status).toBe("failed");
      expect(wave.regression_status).toBe("failed");
    } finally { rmSync(dirname(repo), { recursive: true, force: true }); }
  });
});

describe("gatherCommand — --dry-run", () => {
  it("mutates nothing: no merge commits, no wave-status update", async () => {
    const { repo } = setupGatherable();
    try {
      const beforeLog = execFileSync("git", ["log", "--pretty=%H", "-1"], { cwd: repo, encoding: "utf-8" }).trim();
      await gatherCommand(repo, "feat-auth", { wave: 1, dryRun: true, testCmd: PASS_TEST_CMD });
      const afterLog = execFileSync("git", ["log", "--pretty=%H", "-1"], { cwd: repo, encoding: "utf-8" }).trim();
      expect(afterLog).toBe(beforeLog);
      const { wave } = readWaveStatus(repo, 1);
      expect(wave.status).toBe("pending"); // untouched
    } finally { rmSync(dirname(repo), { recursive: true, force: true }); }
  });
});

describe("gatherCommand — --cleanup", () => {
  it("removes worktrees and deletes branches after successful wave", async () => {
    const { repo, wtA, wtB } = setupGatherable();
    try {
      await gatherCommand(repo, "feat-auth", { wave: 1, cleanup: true, testCmd: PASS_TEST_CMD });
      expect(existsSync(wtA)).toBe(false);
      expect(existsSync(wtB)).toBe(false);
      const branches = execFileSync("git", ["branch"], { cwd: repo, encoding: "utf-8" });
      expect(branches).not.toContain("wave-01-sp-a");
      expect(branches).not.toContain("wave-01-sp-b");
    } finally { rmSync(dirname(repo), { recursive: true, force: true }); }
  });
});

describe("gatherCommand — resume + idempotency", () => {
  it("is a no-op when wave is already completed, exits without error", async () => {
    const { repo } = setupGatherable();
    try {
      await gatherCommand(repo, "feat-auth", { wave: 1, testCmd: PASS_TEST_CMD });
      await gatherCommand(repo, "feat-auth", { wave: 1, testCmd: PASS_TEST_CMD });
      const { wave } = readWaveStatus(repo, 1);
      expect(wave.status).toBe("completed");
    } finally { rmSync(dirname(repo), { recursive: true, force: true }); }
  });

  it("resumes after a halted run: skips already-merged SPs, retries the failed one", async () => {
    const { repo } = setupGatherable();
    try {
      await expect(gatherCommand(repo, "feat-auth", { wave: 1, testCmd: FAIL_TEST_CMD }))
        .rejects.toThrow(MatilhaUserError);
      let { wave } = readWaveStatus(repo, 1);
      expect(wave.sps.SP1!.status).toBe("failed");
      // Simulate human recovery: reset SP1 back to pending
      const fs = await import("node:fs");
      const statusPath = join(repo, "docs/matilha/waves/wave-01-status.md");
      const content = fs.readFileSync(statusPath, "utf-8")
        .replace(/(SP1:\n    branch: wave-01-sp-a\n    worktree: [^\n]+\n    status:) failed/, "$1 pending")
        .replace(/^status: failed$/m, "status: pending")
        .replace("regression_status: failed", "regression_status: pending");
      fs.writeFileSync(statusPath, content, "utf-8");
      // Commit the manually-recovered wave-status so the next gather's pre-flight
      // sees a clean working tree.
      execFileSync("git", ["add", "docs/matilha/waves/wave-01-status.md"], { cwd: repo });
      execFileSync("git", ["commit", "-m", "chore: recover wave-01 after halt"], { cwd: repo });
      await gatherCommand(repo, "feat-auth", { wave: 1, testCmd: PASS_TEST_CMD });
      ({ wave } = readWaveStatus(repo, 1));
      expect(wave.status).toBe("completed");
      expect(wave.sps.SP1!.status).toBe("completed");
      expect(wave.sps.SP2!.status).toBe("completed");
    } finally { rmSync(dirname(repo), { recursive: true, force: true }); }
  });

  it("halts when invoked from an SP branch", async () => {
    const { repo } = setupGatherable();
    try {
      // Create a sibling SP branch that isn't already checked out as a worktree,
      // so we can check it out in the main repo to simulate the error condition.
      execFileSync("git", ["checkout", "-b", "wave-02-sp-fake"], { cwd: repo });
      await expect(gatherCommand(repo, "feat-auth", { wave: 1, testCmd: PASS_TEST_CMD }))
        .rejects.toThrow(MatilhaUserError);
      try {
        await gatherCommand(repo, "feat-auth", { wave: 1, testCmd: PASS_TEST_CMD });
      } catch (e) {
        if (!(e instanceof MatilhaUserError)) throw e;
        expect(e.matilhaError.summary).toContain("SP branch");
      }
    } finally { rmSync(dirname(repo), { recursive: true, force: true }); }
  });
});
