import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeSkills } from "../../src/init/writeSkills";
import { RegistryClient } from "../../src/registry/registryClient";
import type { Tool } from "../../src/init/detectTools";

function makeMockClient() {
  return new RegistryClient(
    "https://raw.example.com/repo/main/index.json",
    "https://raw.example.com/repo/main",
    async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/index.json")) {
        return new Response(JSON.stringify({
          "matilha-init": {
            slug: "matilha-init",
            name: "Init",
            skillPath: "skills/matilha-init/SKILL.md"
          },
          "matilha-scout": {
            slug: "matilha-scout",
            name: "Scout",
            skillPath: "skills/matilha-scout/SKILL.md"
          }
        }), { status: 200 });
      }
      if (url.endsWith("matilha-init/SKILL.md")) {
        return new Response("# Init SKILL", { status: 200 });
      }
      if (url.endsWith("matilha-scout/SKILL.md")) {
        return new Response("# Scout SKILL", { status: 200 });
      }
      return new Response("", { status: 404 });
    }
  );
}

describe("writeSkills", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "matilha-ws-"));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it("writes .agents/skills/ and .claude/skills/ for Claude Code detected", async () => {
    const detected: Tool[] = ["claude-code"];
    const result = await writeSkills(detected, tmp, false, makeMockClient());
    expect(result).toHaveLength(2);
    expect(existsSync(join(tmp, ".claude", "skills", "matilha-init", "SKILL.md"))).toBe(true);
    expect(existsSync(join(tmp, ".agents", "skills", "matilha-init", "SKILL.md"))).toBe(true);
    expect(existsSync(join(tmp, ".cursor", "skills", "matilha-init", "SKILL.md"))).toBe(false);
  });

  it("writes to all detected tool dirs", async () => {
    const detected: Tool[] = ["claude-code", "cursor", "codex", "gemini-cli"];
    await writeSkills(detected, tmp, false, makeMockClient());
    for (const toolDir of [".claude", ".cursor", ".codex", ".gemini", ".agents"]) {
      expect(existsSync(join(tmp, toolDir, "skills", "matilha-init", "SKILL.md"))).toBe(true);
    }
  });

  it("always writes .agents/ even when no tools detected", async () => {
    const detected: Tool[] = [];
    await writeSkills(detected, tmp, false, makeMockClient());
    expect(existsSync(join(tmp, ".agents", "skills", "matilha-init", "SKILL.md"))).toBe(true);
  });

  it("dryRun=true writes nothing but reports paths", async () => {
    const detected: Tool[] = ["claude-code"];
    const result = await writeSkills(detected, tmp, true, makeMockClient());
    expect(result).toHaveLength(2);
    expect(existsSync(join(tmp, ".claude", "skills"))).toBe(false);
  });

  it("content of written skill matches fetched SKILL.md", async () => {
    const detected: Tool[] = ["claude-code"];
    await writeSkills(detected, tmp, false, makeMockClient());
    const content = readFileSync(
      join(tmp, ".claude", "skills", "matilha-init", "SKILL.md"),
      "utf-8"
    );
    expect(content).toBe("# Init SKILL");
  });
});
