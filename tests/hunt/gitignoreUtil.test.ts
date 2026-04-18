import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { ensureGitignoreEntry } from "../../src/hunt/gitignoreUtil";

describe("ensureGitignoreEntry", () => {
  it("creates .gitignore with entry when file doesn't exist", () => {
    const dir = mkdtempSync(join(tmpdir(), "matilha-gi-"));
    try {
      const result = ensureGitignoreEntry(dir, "kickoff.md");
      expect(result.action).toBe("created");
      expect(readFileSync(join(dir, ".gitignore"), "utf-8")).toContain("kickoff.md");
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  it("appends entry when missing from existing .gitignore", () => {
    const dir = mkdtempSync(join(tmpdir(), "matilha-gi-"));
    try {
      writeFileSync(join(dir, ".gitignore"), "node_modules/\n");
      const result = ensureGitignoreEntry(dir, "kickoff.md");
      expect(result.action).toBe("appended");
      const content = readFileSync(join(dir, ".gitignore"), "utf-8");
      expect(content).toContain("node_modules/");
      expect(content).toContain("kickoff.md");
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  it("is idempotent when entry already present", () => {
    const dir = mkdtempSync(join(tmpdir(), "matilha-gi-"));
    try {
      writeFileSync(join(dir, ".gitignore"), "node_modules/\nkickoff.md\n");
      const result = ensureGitignoreEntry(dir, "kickoff.md");
      expect(result.action).toBe("noop");
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  it("matches exact-line entry (not substring)", () => {
    const dir = mkdtempSync(join(tmpdir(), "matilha-gi-"));
    try {
      writeFileSync(join(dir, ".gitignore"), "my-kickoff.md.bak\n");
      const result = ensureGitignoreEntry(dir, "kickoff.md");
      expect(result.action).toBe("appended");
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
});
