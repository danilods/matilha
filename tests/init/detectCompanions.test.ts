import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { detectCompanion } from "../../src/init/detectCompanions";
import type { Companion } from "../../src/domain/companionSchema";
import type { Tool } from "../../src/init/detectTools";

describe("detectCompanion", () => {
  let home: string;
  let originalHome: string | undefined;

  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), "matilha-home-"));
    originalHome = process.env.HOME;
    process.env.HOME = home;
  });

  afterEach(() => {
    if (originalHome !== undefined) {
      process.env.HOME = originalHome;
    } else {
      delete process.env.HOME;
    }
    rmSync(home, { recursive: true, force: true });
  });

  const makeCompanion = (detect: Partial<Record<Tool, string>>): Companion => ({
    slug: "test",
    name: "Test",
    description: "d",
    detect: detect as Companion["detect"],
    install: {},
    tutorial: { title: "t", body: "b" },
    optional_per_archetype: []
  });

  it("returns installed=false when no detected-tool paths match", () => {
    const companion = makeCompanion({ "claude-code": "~/.claude/skills/test/" });
    const result = detectCompanion(companion, ["claude-code"]);
    expect(result.installed).toBe(false);
  });

  it("returns installed=true when a detected-tool path exists", () => {
    mkdirSync(join(home, ".claude", "skills", "test"), { recursive: true });
    const companion = makeCompanion({ "claude-code": "~/.claude/skills/test/" });
    const result = detectCompanion(companion, ["claude-code"]);
    expect(result.installed).toBe(true);
    expect(result.detectedAt).toContain(".claude/skills/test");
  });

  it("does NOT count paths for undetected tools", () => {
    mkdirSync(join(home, ".cursor", "skills", "test"), { recursive: true });
    const companion = makeCompanion({
      "claude-code": "~/.claude/skills/test/",
      "cursor": "~/.cursor/skills/test/"
    });
    // cursor NOT in detected array; its path shouldn't count
    const result = detectCompanion(companion, ["claude-code"]);
    expect(result.installed).toBe(false);
  });
});
