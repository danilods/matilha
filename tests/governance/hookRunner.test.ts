import { describe, it, expect, vi, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { runCommitMsg, runPostCommit } from "../../src/governance/hookRunner";
import { readLedger } from "../../src/governance/ledger";

afterEach(() => vi.restoreAllMocks());

describe("runCommitMsg", () => {
  it("returns the keys found in the commit message file", () => {
    const dir = mkdtempSync(join(tmpdir(), "matilha-cm-"));
    try {
      const file = join(dir, "COMMIT_EDITMSG");
      writeFileSync(file, "feat: cascata camada 2  BOIAA-1042\n", "utf-8");
      const result = runCommitMsg(file);
      expect(result.keys).toEqual(["BOIAA-1042"]);
      expect(result.warned).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("warns (without throwing) when the message has no issue key", () => {
    const dir = mkdtempSync(join(tmpdir(), "matilha-cm-"));
    try {
      const file = join(dir, "COMMIT_EDITMSG");
      writeFileSync(file, "chore: tidy up\n", "utf-8");
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const result = runCommitMsg(file);
      expect(result.keys).toEqual([]);
      expect(result.warned).toBe(true);
      expect(errSpy).toHaveBeenCalled();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("uses the custom MATILHA_ISSUE_KEY_PATTERN from env instead of the default pattern", () => {
    const dir = mkdtempSync(join(tmpdir(), "matilha-cm-"));
    try {
      const file = join(dir, "COMMIT_EDITMSG");
      // Content contains "#4567" — matches the custom pattern "#\d+" but NOT the
      // default pattern "[A-Z][A-Z0-9]+-\d+" (no uppercase-letter prefix), so a
      // regression that ignores the env argument would warn instead of returning the key.
      writeFileSync(file, "chore: ticket #4567 resolved\n", "utf-8");

      // Primary assertion: custom env pattern wires through to key extraction.
      const result = runCommitMsg(file, { MATILHA_ISSUE_KEY_PATTERN: "#\\d+" });
      expect(result.keys).toEqual(["#4567"]);
      expect(result.warned).toBe(false);

      // Optional sanity-check: the default pattern does NOT match the same content,
      // confirming the env override is doing real work.
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const defaultResult = runCommitMsg(file);
      expect(defaultResult.keys).toEqual([]);
      expect(defaultResult.warned).toBe(true);
      expect(errSpy).toHaveBeenCalled();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("runPostCommit", () => {
  function gitRepo(): string {
    const dir = mkdtempSync(join(tmpdir(), "matilha-postcommit-"));
    const run = (args: string[]) => execFileSync("git", args, { cwd: dir, stdio: "pipe" });
    run(["init", "-q"]);
    run(["config", "user.email", "test@example.com"]);
    run(["config", "user.name", "Matilha Test"]);
    return dir;
  }

  function commit(dir: string, message: string): void {
    const run = (args: string[]) => execFileSync("git", args, { cwd: dir, stdio: "pipe" });
    writeFileSync(join(dir, `f-${Date.now()}-${Math.random()}.txt`), "x", "utf-8");
    run(["add", "-A"]);
    run(["commit", "-q", "-m", message]);
  }

  it("emits a task.progress event for the issue key in the HEAD commit", async () => {
    const dir = gitRepo();
    try {
      commit(dir, "feat: cascata camada 2  BOIAA-1042");
      const result = await runPostCommit(dir);
      expect(result.keys).toEqual(["BOIAA-1042"]);
      expect(result.emitted).toEqual(["BOIAA-1042"]);

      const events = readLedger(dir);
      expect(events).toHaveLength(1);
      const event = events[0]!;
      expect(event.type).toBe("task.progress");
      expect(event.external_id).toBe("BOIAA-1042");
      expect(event.issue_key).toBe("BOIAA-1042");
      if (event.type === "task.progress") {
        expect(event.payload.commits).toEqual([result.sha]);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("is idempotent — re-running post-commit on the same HEAD does not duplicate", async () => {
    const dir = gitRepo();
    try {
      commit(dir, "fix: corrige x  BOIAA-7");
      const first = await runPostCommit(dir);
      const second = await runPostCommit(dir);
      expect(first.emitted).toEqual(["BOIAA-7"]);
      expect(second.emitted).toEqual([]);
      expect(readLedger(dir)).toHaveLength(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("emits one event per distinct key for a multi-key commit", async () => {
    const dir = gitRepo();
    try {
      commit(dir, "chore: BOIAA-1 e BOIAA-2 juntos");
      const result = await runPostCommit(dir);
      expect([...result.keys].sort()).toEqual(["BOIAA-1", "BOIAA-2"]);
      expect(readLedger(dir)).toHaveLength(2);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("records nothing when the commit message has no issue key", async () => {
    const dir = gitRepo();
    try {
      commit(dir, "chore: arruma o linter");
      const result = await runPostCommit(dir);
      expect(result.keys).toEqual([]);
      expect(readLedger(dir)).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
