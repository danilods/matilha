import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { detectTools } from "../../src/init/detectTools";

describe("detectTools", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "matilha-detect-"));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it("returns empty array in an empty directory", () => {
    expect(detectTools(tmp)).toEqual([]);
  });

  it("detects Claude Code via .claude/", () => {
    mkdirSync(join(tmp, ".claude"));
    expect(detectTools(tmp)).toEqual(["claude-code"]);
  });

  it("detects Cursor via .cursor/", () => {
    mkdirSync(join(tmp, ".cursor"));
    expect(detectTools(tmp)).toEqual(["cursor"]);
  });

  it("detects Codex via .codex/", () => {
    mkdirSync(join(tmp, ".codex"));
    expect(detectTools(tmp)).toEqual(["codex"]);
  });

  it("detects Gemini CLI via .gemini/", () => {
    mkdirSync(join(tmp, ".gemini"));
    expect(detectTools(tmp)).toEqual(["gemini-cli"]);
  });

  it("detects multiple tools simultaneously (stable order)", () => {
    mkdirSync(join(tmp, ".claude"));
    mkdirSync(join(tmp, ".codex"));
    const result = detectTools(tmp);
    expect(result).toEqual(["claude-code", "codex"]);
  });
});
