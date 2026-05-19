import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeToolBootstraps } from "../../src/init/writeToolBootstraps";
import type { Tool } from "../../src/init/detectTools";

describe("writeToolBootstraps", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "matilha-tool-bootstrap-"));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it("writes a Cursor project rule when Cursor is detected", async () => {
    const result = await writeToolBootstraps(["cursor"], tmp, false);
    const path = join(tmp, ".cursor", "rules", "matilha.mdc");
    expect(result.map((r) => r.path)).toContain(path);
    expect(existsSync(path)).toBe(true);
    const content = readFileSync(path, "utf-8");
    expect(content).toContain("alwaysApply: true");
    expect(content).toContain("Matilha");
    expect(content).toContain("docs/matilha/context.md");
  });

  it("writes Aider conventions and config when Aider is detected", async () => {
    const result = await writeToolBootstraps(["aider"], tmp, false);
    const conventionsPath = join(tmp, "CONVENTIONS.md");
    const configPath = join(tmp, ".aider.conf.yml");
    expect(result.map((r) => r.path)).toEqual([conventionsPath, configPath]);
    expect(readFileSync(conventionsPath, "utf-8")).toContain("Matilha");
    expect(readFileSync(conventionsPath, "utf-8")).toContain("docs/matilha/context.md");
    expect(readFileSync(configPath, "utf-8")).toContain("read: CONVENTIONS.md");
  });

  it("does not write bootstrap files for tools that do not need them", async () => {
    const tools: Tool[] = ["claude-code", "codex", "gemini-cli"];
    const result = await writeToolBootstraps(tools, tmp, false);
    expect(result).toEqual([]);
  });

  it("dryRun=true reports paths without writing files", async () => {
    const result = await writeToolBootstraps(["cursor", "aider"], tmp, true);
    expect(result).toHaveLength(3);
    expect(existsSync(join(tmp, ".cursor", "rules", "matilha.mdc"))).toBe(false);
    expect(existsSync(join(tmp, "CONVENTIONS.md"))).toBe(false);
    expect(existsSync(join(tmp, ".aider.conf.yml"))).toBe(false);
  });

  it("does not overwrite existing bootstrap files unless overwriteExisting=true", async () => {
    const configPath = join(tmp, ".aider.conf.yml");
    await writeToolBootstraps(["aider"], tmp, false);
    const fs = await import("node:fs");
    fs.writeFileSync(configPath, "read: CUSTOM.md\n", "utf-8");

    const result = await writeToolBootstraps(["aider"], tmp, false);

    expect(fs.readFileSync(configPath, "utf-8")).toBe("read: CUSTOM.md\n");
    expect(result.find((r) => r.path === configPath)?.overwritten).toBe(false);
  });
});
