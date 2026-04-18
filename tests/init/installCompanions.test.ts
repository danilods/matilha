import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { installCompanions } from "../../src/init/installCompanions";
import type { Companion } from "../../src/domain/companionSchema";
import type { Tool } from "../../src/init/detectTools";

describe("installCompanions", () => {
  let home: string;
  let originalHome: string | undefined;

  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), "matilha-ic-"));
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

  const impeccable: Companion = {
    slug: "impeccable",
    name: "Impeccable",
    description: "Design harness",
    detect: { "claude-code": "~/.claude/skills/impeccable/" },
    install: { universal: "echo 'installed'" },
    tutorial: { title: "Install Impeccable", body: "Run `npx skills add ...`" },
    optional_per_archetype: []
  };

  const superpowersNoInstall: Companion = {
    slug: "superpowers",
    name: "Superpowers",
    description: "SP",
    detect: { "claude-code": "~/.claude/plugins/cache/claude-plugins-official/superpowers/" },
    install: {},
    tutorial: { title: "Install Superpowers", body: "Run /plugin install ..." },
    optional_per_archetype: []
  };

  const detected: Tool[] = ["claude-code"];

  it("reports 'already-installed' when detect path exists", async () => {
    mkdirSync(join(home, ".claude", "skills", "impeccable"), { recursive: true });
    const result = await installCompanions([impeccable], detected, false, false);
    expect(result.get("impeccable")).toBe("already-installed");
  });

  it("dryRun returns without exec; outcome is 'skipped' if not already installed", async () => {
    const result = await installCompanions([impeccable], detected, false, true);
    // dry-run + not detected + no prompt (interactive=false) → skipped
    expect(result.get("impeccable")).toBe("skipped");
  });

  it("prints tutorial when install config is empty (non-scriptable)", async () => {
    // superpowersNoInstall has install:{} → no command → tutorial fallback
    const result = await installCompanions([superpowersNoInstall], detected, true, false);
    expect(result.get("superpowers")).toBe("manual-tutorial");
  });

  it("non-interactive mode: skips when not detected", async () => {
    // not installed, not interactive, has install command → dry-run style skip
    const result = await installCompanions([impeccable], detected, false, true);
    expect(result.get("impeccable")).toBe("skipped");
  });
});
