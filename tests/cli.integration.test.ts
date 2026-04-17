import { describe, it, expect, beforeAll } from "vitest";
import { execFileSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliPath = resolve(__dirname, "../dist/cli.js");

describe("CLI integration", () => {
  beforeAll(() => {
    if (!existsSync(cliPath)) {
      throw new Error(
        `CLI not built. Run 'npm run build' before integration tests. Expected: ${cliPath}`
      );
    }
  });

  it("--version prints version string", () => {
    const output = execFileSync("node", [cliPath, "--version"], {
      encoding: "utf-8"
    }).trim();
    expect(output).toBe("0.1.0");
  });

  it("--help lists three commands", () => {
    const output = execFileSync("node", [cliPath, "--help"], {
      encoding: "utf-8"
    });
    expect(output).toContain("list");
    expect(output).toContain("pull");
    expect(output).toContain("init");
  });

  it("init prints coming-soon message", () => {
    const output = execFileSync("node", [cliPath, "init"], {
      encoding: "utf-8"
    });
    expect(output).toContain("Wave 2");
  });
});
