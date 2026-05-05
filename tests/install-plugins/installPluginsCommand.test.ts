import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { installPluginsCommand } from "../../src/install-plugins/installPluginsCommand";
import type { PackSlug } from "../../src/install-plugins/packCatalog";

describe("installPluginsCommand local targets", () => {
  let tmp: string;
  let cwd: string;
  let home: string;
  let roots: Record<PackSlug, string>;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "matilha-install-command-"));
    cwd = join(tmp, "project");
    home = join(tmp, "home");
    mkdirSync(cwd, { recursive: true });
    mkdirSync(home, { recursive: true });
    roots = {
      "matilha-skills": packRoot("matilha-skills", "matilha-compose"),
      "matilha-ux-pack": packRoot("matilha-ux-pack", "ux-form-friction"),
      "matilha-growth-pack": packRoot("matilha-growth-pack", "growth-aarrr"),
      "matilha-harness-pack": packRoot("matilha-harness-pack", "harness-context"),
      "matilha-sysdesign-pack": packRoot("matilha-sysdesign-pack", "sysdesign-cap"),
      "matilha-software-eng-pack": packRoot("matilha-software-eng-pack", "sweng-kiss"),
      "matilha-software-arch-pack": packRoot("matilha-software-arch-pack", "swarch-layers"),
      "matilha-security-pack": packRoot("matilha-security-pack", "swsec-secrets")
    };
    vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    rmSync(tmp, { recursive: true, force: true });
  });

  it("installs core-only into Codex user skills when target=codex", async () => {
    await installPluginsCommand({
      target: "codex",
      scope: "user",
      coreOnly: true,
      cwd,
      homeDir: home,
      localPackRoots: roots
    });

    expect(existsSync(join(home, ".agents", "skills", "matilha-compose", "SKILL.md"))).toBe(true);
  });

  it("installs preset UX into Cursor project skills and writes cursor rule", async () => {
    await installPluginsCommand({
      target: "cursor",
      preset: "ux",
      cwd,
      homeDir: home,
      localPackRoots: roots
    });

    expect(existsSync(join(cwd, ".cursor", "skills", "matilha-compose", "SKILL.md"))).toBe(true);
    expect(existsSync(join(cwd, ".cursor", "skills", "ux-form-friction", "SKILL.md"))).toBe(true);
    expect(existsSync(join(cwd, ".cursor", "skills", "growth-aarrr", "SKILL.md"))).toBe(true);
    expect(existsSync(join(cwd, ".cursor", "rules", "matilha.mdc"))).toBe(true);
  });

  it("rejects unknown install targets", async () => {
    await expect(installPluginsCommand({
      target: "gemini" as never,
      coreOnly: true,
      cwd,
      homeDir: home,
      localPackRoots: roots
    })).rejects.toThrow(/Unknown install target/);
  });

  function packRoot(slug: PackSlug, skillName: string): string {
    const root = join(tmp, slug);
    const skillDir = join(root, "skills", skillName);
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(join(skillDir, "SKILL.md"), `---\nname: ${skillName}\ndescription: Use when testing.\n---\n`, "utf-8");
    return root;
  }
});
