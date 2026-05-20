import { describe, it, expect, vi, afterEach } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  hooksInstallCommand,
  hooksRunPostCommitCommand
} from "../../src/governance/hooksCommand";

afterEach(() => vi.restoreAllMocks());

describe("hooks commands", () => {
  it("hooksInstallCommand installs the hook files", async () => {
    const dir = mkdtempSync(join(tmpdir(), "matilha-hookscmd-"));
    try {
      execFileSync("git", ["init", "-q"], { cwd: dir, stdio: "pipe" });
      vi.spyOn(console, "log").mockImplementation(() => {});
      await hooksInstallCommand(dir);
      expect(existsSync(join(dir, ".git", "hooks", "commit-msg"))).toBe(true);
      expect(existsSync(join(dir, ".git", "hooks", "post-commit"))).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("hooksRunPostCommitCommand swallows errors and never throws", async () => {
    const dir = mkdtempSync(join(tmpdir(), "matilha-nogit-"));
    try {
      vi.spyOn(console, "error").mockImplementation(() => {});
      await expect(hooksRunPostCommitCommand(dir)).resolves.toBeUndefined();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
