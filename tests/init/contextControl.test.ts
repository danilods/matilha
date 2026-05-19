import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  compactProviderTemplates,
  renderContextIndex,
  writeContextIndex
} from "../../src/init/contextControl";
import type { InitInputs } from "../../src/init/askInputs";
import type { TemplateName } from "../../src/init/fetchTemplates";

describe("context control plane", () => {
  const inputs: InitInputs = {
    projectName: "test-proj",
    archetype: "saas-b2b",
    aestheticDirection: "minimal",
    overwriteExisting: false
  };

  it("keeps provider control files compact and reference-based", () => {
    const longTemplate = `# Big provider file\n${"FULL METHODOLOGY SHOULD NOT LIVE HERE\n".repeat(120)}`;
    const rendered = new Map<TemplateName, string>([
      ["claude", longTemplate],
      ["agents", longTemplate],
      ["project-status", "---\nname: test-proj\n---"]
    ]);

    const compacted = compactProviderTemplates(rendered, inputs, ["claude-code", "codex"]);
    const claude = compacted.get("claude") ?? "";
    const agents = compacted.get("agents") ?? "";

    expect(claude.length).toBeLessThan(1800);
    expect(agents.length).toBeLessThan(1800);
    expect(claude).toContain("project-status.md");
    expect(claude).toContain("docs/matilha/context.md");
    expect(agents).toContain("docs/matilha/context.md");
    expect(claude).not.toContain("FULL METHODOLOGY SHOULD NOT LIVE HERE");
    expect(compacted.get("project-status")).toBe("---\nname: test-proj\n---");
  });

  it("renders a stable context index for clean-session recovery", () => {
    const index = renderContextIndex(inputs, ["claude-code", "cursor"]);

    expect(index).toContain("# Matilha Context Map");
    expect(index).toContain("project-status.md");
    expect(index).toContain("docs/matilha/specs/");
    expect(index).toContain("docs/matilha/plans/");
    expect(index).toContain("docs/matilha/waves/");
    expect(index).toContain("matilha status");
  });

  describe("writeContextIndex", () => {
    let tmp: string;

    beforeEach(() => {
      tmp = mkdtempSync(join(tmpdir(), "matilha-context-"));
    });

    afterEach(() => {
      rmSync(tmp, { recursive: true, force: true });
    });

    it("writes docs/matilha/context.md without touching provider files", async () => {
      const result = await writeContextIndex(inputs, ["codex"], tmp, false);
      const contextPath = join(tmp, "docs", "matilha", "context.md");

      expect(result.path).toBe(contextPath);
      expect(existsSync(contextPath)).toBe(true);
      expect(readFileSync(contextPath, "utf-8")).toContain("test-proj");
      expect(existsSync(join(tmp, "CLAUDE.md"))).toBe(false);
    });

    it("does not overwrite an existing context index unless overwriteExisting=true", async () => {
      const contextPath = join(tmp, "docs", "matilha", "context.md");
      await writeContextIndex(inputs, ["codex"], tmp, false);
      writeFileSync(contextPath, "CUSTOM", "utf-8");

      const result = await writeContextIndex(inputs, ["codex"], tmp, false);

      expect(readFileSync(contextPath, "utf-8")).toBe("CUSTOM");
      expect(result.overwritten).toBe(false);
    });
  });
});
