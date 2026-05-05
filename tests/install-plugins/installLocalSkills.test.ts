import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, mkdtempSync, readFileSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { installLocalSkills } from "../../src/install-plugins/installLocalSkills";
import type { PackSlug } from "../../src/install-plugins/packCatalog";

describe("installLocalSkills", () => {
  let tmp: string;
  let cwd: string;
  let home: string;
  let roots: Record<PackSlug, string>;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "matilha-local-skills-"));
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
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it("installs selected packs into Codex user skills", async () => {
    const result = await installLocalSkills(["matilha-skills", "matilha-ux-pack"], {
      target: "codex",
      scope: "user",
      cwd,
      homeDir: home,
      packRoots: roots
    });

    expect(result.targetDir).toBe(join(home, ".agents", "skills"));
    expect(existsSync(join(home, ".agents", "skills", "matilha-compose", "SKILL.md"))).toBe(true);
    expect(existsSync(join(home, ".agents", "skills", "ux-form-friction", "SKILL.md"))).toBe(true);
    expect(result.installedSkills).toEqual(["matilha-compose", "ux-form-friction"]);
  });

  it("installs selected packs into Codex project skills", async () => {
    await installLocalSkills(["matilha-skills"], {
      target: "codex",
      scope: "project",
      cwd,
      homeDir: home,
      packRoots: roots
    });

    expect(existsSync(join(cwd, ".agents", "skills", "matilha-compose", "SKILL.md"))).toBe(true);
  });

  it("installs Cursor project skills and writes the Matilha rule", async () => {
    const result = await installLocalSkills(["matilha-skills"], {
      target: "cursor",
      scope: "project",
      cwd,
      homeDir: home,
      packRoots: roots
    });

    const rule = readFileSync(join(cwd, ".cursor", "rules", "matilha.mdc"), "utf-8");
    expect(result.targetDir).toBe(join(cwd, ".cursor", "skills"));
    expect(existsSync(join(cwd, ".cursor", "skills", "matilha-compose", "SKILL.md"))).toBe(true);
    expect(rule).toContain("alwaysApply: true");
    expect(rule).toContain(".cursor/skills");
  });

  it("rejects Cursor user scope because Cursor rules are project-local", async () => {
    await expect(installLocalSkills(["matilha-skills"], {
      target: "cursor",
      scope: "user",
      cwd,
      homeDir: home,
      packRoots: roots
    })).rejects.toThrow(/Cursor target only supports project scope/);
  });

  function packRoot(slug: PackSlug, skillName: string): string {
    const root = join(tmp, slug);
    const skillDir = join(root, "skills", skillName);
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(join(skillDir, "SKILL.md"), `---\nname: ${skillName}\ndescription: Use when testing.\n---\n`, "utf-8");
    return root;
  }
});
