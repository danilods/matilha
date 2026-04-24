import { describe, it, expect } from "vitest";
import { renderInstallBlock, renderClaudeMdBlock } from "../../src/install-plugins/renderBlock";
import { ALL_SLUGS } from "../../src/install-plugins/packCatalog";
import { PRESETS } from "../../src/install-plugins/presets";

describe("renderInstallBlock", () => {
  it("full selection (core + 7 packs) produces 16 lines + 7 blank separators", () => {
    const block = renderInstallBlock(ALL_SLUGS);
    const lines = block.split("\n");
    // 8 packs * 2 lines = 16 command lines, interspersed with 7 blank separators = 23 total.
    expect(lines).toHaveLength(23);
    const commandLines = lines.filter((l) => l.startsWith("/plugin"));
    expect(commandLines).toHaveLength(16);
    const marketplaceLines = lines.filter((l) => l.startsWith("/plugin marketplace add"));
    const installLines = lines.filter((l) => l.startsWith("/plugin install"));
    expect(marketplaceLines).toHaveLength(8);
    expect(installLines).toHaveLength(8);
  });

  it("core-only produces exactly 2 lines (1 marketplace + 1 install)", () => {
    const block = renderInstallBlock(["matilha-skills"]);
    const lines = block.split("\n");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe("/plugin marketplace add danilods/matilha-skills");
    expect(lines[1]).toBe("/plugin install matilha@matilha-skills --user");
  });

  it("preset backend produces exactly core + harness + sysdesign + software-eng + software-arch + security", () => {
    const block = renderInstallBlock(PRESETS.backend);
    const lines = block.split("\n").filter((l) => l.startsWith("/plugin install "));
    expect(lines).toEqual([
      "/plugin install matilha@matilha-skills --user",
      "/plugin install matilha-harness-pack@matilha-harness-pack --user",
      "/plugin install matilha-sysdesign-pack@matilha-sysdesign-pack --user",
      "/plugin install matilha-software-eng-pack@matilha-software-eng-pack --user",
      "/plugin install matilha-software-arch-pack@matilha-software-arch-pack --user",
      "/plugin install matilha-security-pack@matilha-security-pack --user"
    ]);
  });

  it("empty selection renders empty string", () => {
    expect(renderInstallBlock([])).toBe("");
  });

  it("renderClaudeMdBlock contains both markers and paste instructions", () => {
    const block = renderClaudeMdBlock();
    expect(block).toContain("<!-- matilha-start v1 -->");
    expect(block).toContain("<!-- matilha-end v1 -->");
    expect(block).toContain("# Optional: bootstrap CLAUDE.md");
    expect(block).toContain("matilha-start/end markers");
  });

  it("non-core pack uses its slug as both marketplace and plugin name (parity)", () => {
    const block = renderInstallBlock(["matilha-ux-pack"]);
    const lines = block.split("\n");
    expect(lines).toEqual([
      "/plugin marketplace add danilods/matilha-ux-pack",
      "/plugin install matilha-ux-pack@matilha-ux-pack --user"
    ]);
  });
});
