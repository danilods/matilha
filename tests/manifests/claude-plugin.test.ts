import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe(".claude-plugin/plugin.json", () => {
  const manifestPath = resolve(__dirname, "../../.claude-plugin/plugin.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));

  it("has required fields", () => {
    expect(manifest.name).toBe("matilha");
    expect(manifest.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(typeof manifest.description).toBe("string");
    expect(manifest.license).toBe("MIT");
  });

  it("declares arrays for commands/skills/agents (populated in later waves)", () => {
    expect(Array.isArray(manifest.commands)).toBe(true);
    expect(Array.isArray(manifest.skills)).toBe(true);
    expect(Array.isArray(manifest.agents)).toBe(true);
  });
});
