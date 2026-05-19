import { describe, it, expect, beforeAll } from "vitest";
import { execFileSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import pkg from "../package.json";

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
    expect(output).toBe(pkg.version);
  });

  it("--help lists three commands", () => {
    const output = execFileSync("node", [cliPath, "--help"], {
      encoding: "utf-8"
    });
    expect(output).toContain("list");
    expect(output).toContain("pull");
    expect(output).toContain("init");
  });

  it("init command is present in help", () => {
    const output = execFileSync("node", [cliPath, "--help"], {
      encoding: "utf-8"
    });
    expect(output).toContain("init");
  });

  it("--help exposes didactic workflow commands with legacy aliases", () => {
    const output = execFileSync("node", [cliPath, "--help"], {
      encoding: "utf-8"
    });

    for (const command of [
      "start|init",
      "status|howl",
      "discover|scout",
      "spec|plan",
      "approve|attest",
      "progress|plan-status",
      "split|hunt",
      "merge|gather",
      "jira",
      "install|install-plugins"
    ]) {
      expect(output).toContain(command);
    }
  });

  it("legacy and didactic command names both expose help", () => {
    const didactic = execFileSync("node", [cliPath, "status", "--help"], {
      encoding: "utf-8"
    });
    const legacy = execFileSync("node", [cliPath, "howl", "--help"], {
      encoding: "utf-8"
    });

    expect(didactic).toContain("Show Matilha project state");
    expect(legacy).toContain("Show Matilha project state");
  });
});
