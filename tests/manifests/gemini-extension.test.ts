import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("gemini-extension.json", () => {
  const manifest = JSON.parse(
    readFileSync(resolve(__dirname, "../../gemini-extension.json"), "utf-8")
  );

  it("has required fields", () => {
    expect(manifest.name).toBe("matilha");
    expect(manifest.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(manifest.license).toBe("MIT");
  });
});
