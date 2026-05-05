import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
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

  it("detects Cursor via .cursor/rules/", () => {
    mkdirSync(join(tmp, ".cursor", "rules"), { recursive: true });
    expect(detectTools(tmp)).toEqual(["cursor"]);
  });

  it("detects Cursor via legacy .cursorrules", () => {
    writeFileSync(join(tmp, ".cursorrules"), "# Cursor rules");
    expect(detectTools(tmp)).toEqual(["cursor"]);
  });

  it("detects Codex via .codex/", () => {
    mkdirSync(join(tmp, ".codex"));
    expect(detectTools(tmp)).toEqual(["codex"]);
  });

  it("detects Codex via AGENTS.md", () => {
    writeFileSync(join(tmp, "AGENTS.md"), "# Agent instructions");
    expect(detectTools(tmp)).toEqual(["codex"]);
  });

  it("detects Codex via .agents/skills/", () => {
    mkdirSync(join(tmp, ".agents", "skills"), { recursive: true });
    expect(detectTools(tmp)).toEqual(["codex"]);
  });

  it("detects Gemini CLI via .gemini/", () => {
    mkdirSync(join(tmp, ".gemini"));
    expect(detectTools(tmp)).toEqual(["gemini-cli"]);
  });

  it("detects Gemini CLI via GEMINI.md", () => {
    writeFileSync(join(tmp, "GEMINI.md"), "# Gemini context");
    expect(detectTools(tmp)).toEqual(["gemini-cli"]);
  });

  it("detects Gemini CLI via gemini-extension.json", () => {
    writeFileSync(join(tmp, "gemini-extension.json"), "{\"name\":\"test\"}");
    expect(detectTools(tmp)).toEqual(["gemini-cli"]);
  });

  it("detects Gemini CLI via .gemini/skills/", () => {
    mkdirSync(join(tmp, ".gemini", "skills"), { recursive: true });
    expect(detectTools(tmp)).toEqual(["gemini-cli"]);
  });

  it("detects Aider via .aider.conf.yml", () => {
    writeFileSync(join(tmp, ".aider.conf.yml"), "read: CONVENTIONS.md\n");
    expect(detectTools(tmp)).toEqual(["aider"]);
  });

  it("detects Aider via .aiderignore", () => {
    writeFileSync(join(tmp, ".aiderignore"), "dist\n");
    expect(detectTools(tmp)).toEqual(["aider"]);
  });

  it("detects multiple tools simultaneously (stable order)", () => {
    mkdirSync(join(tmp, ".claude"));
    mkdirSync(join(tmp, ".codex"));
    const result = detectTools(tmp);
    expect(result).toEqual(["claude-code", "codex"]);
  });
});
