import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeClaudeMd } from "../../src/install-plugins/writeClaudeMd";
import { CLAUDE_MD_SNIPPET } from "../../src/install-plugins/claudeMdSnippet";

describe("writeClaudeMd — SP-B merge-or-create contract", () => {
  let tmpCwd: string;

  beforeEach(() => {
    tmpCwd = mkdtempSync(join(tmpdir(), "matilha-write-claudemd-"));
  });

  afterEach(() => {
    rmSync(tmpCwd, { recursive: true, force: true });
  });

  it("case 1 — CLAUDE.md absent → creates with snippet as full content", () => {
    const result = writeClaudeMd({ cwd: tmpCwd });

    expect(result.action).toBe("created");
    expect(existsSync(result.path)).toBe(true);
    const content = readFileSync(result.path, "utf8");
    expect(content.trim()).toBe(CLAUDE_MD_SNIPPET.trim());
    expect(content.endsWith("\n")).toBe(true);
  });

  it("case 2 — CLAUDE.md present without marker → appends snippet, preserves existing content", () => {
    const existing = "# My Project\n\nSome project notes.\n";
    writeFileSync(join(tmpCwd, "CLAUDE.md"), existing, "utf8");

    const result = writeClaudeMd({ cwd: tmpCwd });

    expect(result.action).toBe("appended");
    const content = readFileSync(result.path, "utf8");
    expect(content.startsWith("# My Project")).toBe(true);
    expect(content.includes("Some project notes.")).toBe(true);
    expect(content.includes("<!-- matilha-start v1 -->")).toBe(true);
    expect(content.includes("<!-- matilha-end v1 -->")).toBe(true);
  });

  it("case 3 — CLAUDE.md present with v1 marker → replaces content between markers idempotently", () => {
    const existing = [
      "# My Project",
      "",
      "<!-- matilha-start v1 -->",
      "## Old matilha block content",
      "Stale text that should be replaced.",
      "<!-- matilha-end v1 -->",
      "",
      "After the block.",
      ""
    ].join("\n");
    writeFileSync(join(tmpCwd, "CLAUDE.md"), existing, "utf8");

    const result = writeClaudeMd({ cwd: tmpCwd });

    expect(result.action).toBe("replaced");
    const content = readFileSync(result.path, "utf8");
    expect(content.startsWith("# My Project")).toBe(true);
    expect(content.includes("After the block.")).toBe(true);
    expect(content.includes("Stale text that should be replaced.")).toBe(false);
    expect(content.includes("matilha:matilha-compose")).toBe(true);
  });

  it("is idempotent — running twice produces identical file content", () => {
    const first = writeClaudeMd({ cwd: tmpCwd });
    const afterFirst = readFileSync(first.path, "utf8");
    const second = writeClaudeMd({ cwd: tmpCwd });
    const afterSecond = readFileSync(second.path, "utf8");

    expect(second.action).toBe("replaced");
    expect(afterSecond).toBe(afterFirst);
  });

  it("detects v2+ markers too (future-proof via \\d+ in regex)", () => {
    const existing = [
      "# Project",
      "<!-- matilha-start v2 -->",
      "future v2 content",
      "<!-- matilha-end v2 -->"
    ].join("\n");
    writeFileSync(join(tmpCwd, "CLAUDE.md"), existing, "utf8");

    const result = writeClaudeMd({ cwd: tmpCwd });

    expect(result.action).toBe("replaced");
    const content = readFileSync(result.path, "utf8");
    expect(content.includes("future v2 content")).toBe(false);
    expect(content.includes("<!-- matilha-start v1 -->")).toBe(true);
  });

  it("accepts a custom snippet override", () => {
    const custom = "<!-- matilha-start v9 -->\ncustom content\n<!-- matilha-end v9 -->";

    const result = writeClaudeMd({ cwd: tmpCwd, snippet: custom });

    expect(result.action).toBe("created");
    const content = readFileSync(result.path, "utf8");
    expect(content.trim()).toBe(custom.trim());
  });
});
