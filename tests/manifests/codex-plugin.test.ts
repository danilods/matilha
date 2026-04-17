import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import toml from "@iarna/toml";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe(".codex/plugin.toml", () => {
  const parsed = toml.parse(
    readFileSync(resolve(__dirname, "../../.codex/plugin.toml"), "utf-8")
  );

  it("has required top-level fields", () => {
    expect(parsed.name).toBe("matilha");
    expect(parsed.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(parsed.license).toBe("MIT");
  });
});
