import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, chmodSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, delimiter } from "node:path";
import { detectClaudeCli } from "../../src/install-plugins/detectClaudeCli";

describe("detectClaudeCli", () => {
  let originalPath: string | undefined;
  let tmpRoot: string;

  beforeEach(() => {
    originalPath = process.env.PATH;
    tmpRoot = mkdtempSync(join(tmpdir(), "matilha-detect-claude-"));
  });

  afterEach(() => {
    if (originalPath !== undefined) {
      process.env.PATH = originalPath;
    } else {
      delete process.env.PATH;
    }
    rmSync(tmpRoot, { recursive: true, force: true });
  });

  it("returns available: false when PATH has no claude binary", () => {
    const isolatedDir = join(tmpRoot, "empty-bin");
    mkdirSync(isolatedDir);
    process.env.PATH = isolatedDir;

    const result = detectClaudeCli();

    expect(result.available).toBe(false);
    expect(result.path).toBeNull();
  });

  it("returns available: true and resolves path when claude is the first match on PATH", () => {
    const binDir = join(tmpRoot, "bin");
    mkdirSync(binDir);
    const claudeBinary = join(binDir, "claude");
    writeFileSync(claudeBinary, "#!/bin/sh\necho fake", { mode: 0o755 });
    chmodSync(claudeBinary, 0o755);
    process.env.PATH = binDir;

    const result = detectClaudeCli();

    expect(result.available).toBe(true);
    expect(result.path).toBe(claudeBinary);
  });

  it("prefers earlier PATH entries when claude exists in multiple directories", () => {
    const firstDir = join(tmpRoot, "first-bin");
    const secondDir = join(tmpRoot, "second-bin");
    mkdirSync(firstDir);
    mkdirSync(secondDir);
    const firstClaude = join(firstDir, "claude");
    const secondClaude = join(secondDir, "claude");
    writeFileSync(firstClaude, "#!/bin/sh", { mode: 0o755 });
    writeFileSync(secondClaude, "#!/bin/sh", { mode: 0o755 });
    process.env.PATH = [firstDir, secondDir].join(delimiter);

    const result = detectClaudeCli();

    expect(result.available).toBe(true);
    expect(result.path).toBe(firstClaude);
  });

  it("returns available: false when PATH is empty", () => {
    process.env.PATH = "";

    const result = detectClaudeCli();

    expect(result.available).toBe(false);
    expect(result.path).toBeNull();
  });
});
