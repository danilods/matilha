import { describe, it, expect, vi, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCommitMsg } from "../../src/governance/hookRunner";

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
});
