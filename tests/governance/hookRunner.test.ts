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
