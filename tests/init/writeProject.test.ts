import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, readFileSync, existsSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeProject } from "../../src/init/writeProject";
import type { InitInputs } from "../../src/init/askInputs";
import type { TemplateName } from "../../src/init/fetchTemplates";

describe("writeProject", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "matilha-write-"));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  const inputs: InitInputs = {
    projectName: "test-proj",
    archetype: "saas-b2b",
    aestheticDirection: "minimal",
    overwriteExisting: false
  };

  const rendered = new Map<TemplateName, string>([
    ["claude", "# CLAUDE.md\nproject=test-proj"],
    ["agents", "# AGENTS.md"],
    ["project-status", "---\narchetype: saas-b2b\n---"],
    ["design-spec", "# Design spec"]
  ]);

  it("writes 4 files at cwd root", async () => {
    const result = await writeProject(inputs, rendered, tmp, false);
    expect(result).toHaveLength(4);
    expect(existsSync(join(tmp, "CLAUDE.md"))).toBe(true);
    expect(existsSync(join(tmp, "AGENTS.md"))).toBe(true);
    expect(existsSync(join(tmp, "project-status.md"))).toBe(true);
    expect(existsSync(join(tmp, "design-spec.md"))).toBe(true);
  });

  it("skips design-spec.md when not in rendered map", async () => {
    const noDesign = new Map(rendered);
    noDesign.delete("design-spec");
    const result = await writeProject(inputs, noDesign, tmp, false);
    expect(result).toHaveLength(3);
    expect(existsSync(join(tmp, "design-spec.md"))).toBe(false);
  });

  it("content matches rendered input", async () => {
    await writeProject(inputs, rendered, tmp, false);
    const claude = readFileSync(join(tmp, "CLAUDE.md"), "utf-8");
    expect(claude).toBe("# CLAUDE.md\nproject=test-proj");
  });

  it("overwrites existing files when inputs.overwriteExisting=true", async () => {
    writeFileSync(join(tmp, "CLAUDE.md"), "OLD CONTENT");
    const overwriteInputs: InitInputs = { ...inputs, overwriteExisting: true };
    const result = await writeProject(overwriteInputs, rendered, tmp, false);
    const updated = readFileSync(join(tmp, "CLAUDE.md"), "utf-8");
    expect(updated).toContain("test-proj");
    expect(result.find((r) => r.path.endsWith("CLAUDE.md"))?.overwritten).toBe(true);
  });

  it("dryRun=true does not write any files", async () => {
    const result = await writeProject(inputs, rendered, tmp, true);
    expect(result).toHaveLength(4);
    for (const r of result) {
      expect(existsSync(r.path)).toBe(false);
    }
  });
});
