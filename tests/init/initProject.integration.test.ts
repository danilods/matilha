import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { initProject } from "../../src/init/initProject";
import type { MockInstance } from "vitest";

vi.mock("@clack/prompts", () => ({
  intro: () => {},
  outro: () => {},
  cancel: () => {},
  note: () => {},
  isCancel: () => false,
  confirm: async () => true,
  text: async () => "test-proj",
  select: async ({ options }: { options: Array<{ value: unknown }> }) => options[0].value
}));

describe("initProject integration", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "matilha-int-"));
    mkdirSync(join(tmp, ".claude"));  // Claude Code "detected"

    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("CLAUDE.md.tmpl")) {
        return new Response("# {{project_name}}\narchetype={{archetype}}\ndate={{date}}\n{{archetype_index}}", { status: 200 });
      }
      if (url.endsWith("AGENTS.md.tmpl")) {
        return new Response("# {{project_name}} AGENTS\narchetype={{archetype}}\n{{agents_index}}", { status: 200 });
      }
      if (url.endsWith("project-status.md.tmpl")) {
        return new Response("---\nname: {{project_name}}\narchetype: {{archetype}}\ncreated: \"{{created_iso}}\"\ntools_detected:\n{{tools_detected_yaml}}\naesthetic_direction: {{aesthetic_direction_yaml}}\n---", { status: 200 });
      }
      if (url.endsWith("design-spec.md.tmpl")) {
        return new Response("# {{project_name}} Design\naesthetic={{aesthetic_direction}}\n{{design_spec_body}}", { status: 200 });
      }
      if (url.endsWith("companions.json")) {
        return new Response(JSON.stringify({
          impeccable: {
            slug: "impeccable",
            name: "Impeccable",
            description: "d",
            detect: { "claude-code": "~/nonexistent-path-for-test/" },
            install: { universal: "echo installed" },
            tutorial: { title: "t", body: "b" },
            optional_per_archetype: []
          }
        }), { status: 200 });
      }
      if (url.endsWith("index.json")) {
        return new Response(JSON.stringify({
          "matilha-init": {
            slug: "matilha-init",
            name: "Init",
            skillPath: "skills/matilha-init/SKILL.md"
          }
        }), { status: 200 });
      }
      if (url.endsWith("matilha-init/SKILL.md")) {
        return new Response("# Init SKILL", { status: 200 });
      }
      return new Response("", { status: 404 });
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("dry-run does not write files but reports full plan", async () => {
    const result = await initProject(tmp, { dryRun: true });
    expect(result.tools).toEqual(["claude-code"]);
    expect(result.inputs.projectName).toBe("test-proj");
    expect(result.inputs.archetype).toBe("saas-b2b");
    expect(existsSync(join(tmp, "CLAUDE.md"))).toBe(false);
  });

  it("writes files when not dry-run", async () => {
    const result = await initProject(tmp, { dryRun: false });
    expect(existsSync(join(tmp, "CLAUDE.md"))).toBe(true);
    expect(existsSync(join(tmp, "AGENTS.md"))).toBe(true);
    expect(existsSync(join(tmp, "project-status.md"))).toBe(true);
    expect(existsSync(join(tmp, "design-spec.md"))).toBe(true);
    expect(existsSync(join(tmp, ".claude", "skills", "matilha-init", "SKILL.md"))).toBe(true);
    expect(existsSync(join(tmp, ".agents", "skills", "matilha-init", "SKILL.md"))).toBe(true);

    const claude = readFileSync(join(tmp, "CLAUDE.md"), "utf-8");
    expect(claude).toContain("test-proj");
    expect(claude).toContain("saas-b2b");

    const pstatus = readFileSync(join(tmp, "project-status.md"), "utf-8");
    expect(pstatus).toContain("claude-code");  // tools_detected_yaml rendered

    expect(result.writtenFiles).toHaveLength(4);
    expect(result.writtenSkills).toHaveLength(1);
    expect(result.companionOutcomes.get("impeccable")).toBeDefined();
  });
});

describe("initProject streaming (Wave 2f)", () => {
  let tmp: string;
  let stdoutSpy: MockInstance;
  let captured: string[];

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "matilha-stream-"));
    mkdirSync(join(tmp, ".claude"));  // Claude Code "detected"

    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("CLAUDE.md.tmpl")) {
        return new Response("# {{project_name}}\narchetype={{archetype}}\ndate={{date}}\n{{archetype_index}}", { status: 200 });
      }
      if (url.endsWith("AGENTS.md.tmpl")) {
        return new Response("# {{project_name}} AGENTS\narchetype={{archetype}}\n{{agents_index}}", { status: 200 });
      }
      if (url.endsWith("project-status.md.tmpl")) {
        return new Response("---\nname: {{project_name}}\narchetype: {{archetype}}\ncreated: \"{{created_iso}}\"\ntools_detected:\n{{tools_detected_yaml}}\naesthetic_direction: {{aesthetic_direction_yaml}}\n---", { status: 200 });
      }
      if (url.endsWith("design-spec.md.tmpl")) {
        return new Response("# {{project_name}} Design\naesthetic={{aesthetic_direction}}\n{{design_spec_body}}", { status: 200 });
      }
      if (url.endsWith("companions.json")) {
        return new Response(JSON.stringify({
          impeccable: {
            slug: "impeccable",
            name: "Impeccable",
            description: "d",
            detect: { "claude-code": "~/nonexistent-path-for-test/" },
            install: { universal: "echo installed" },
            tutorial: { title: "t", body: "b" },
            optional_per_archetype: []
          }
        }), { status: 200 });
      }
      if (url.endsWith("index.json")) {
        return new Response(JSON.stringify({
          "matilha-init": {
            slug: "matilha-init",
            name: "Init",
            skillPath: "skills/matilha-init/SKILL.md"
          }
        }), { status: 200 });
      }
      if (url.endsWith("matilha-init/SKILL.md")) {
        return new Response("# Init SKILL", { status: 200 });
      }
      return new Response("", { status: 404 });
    }) as unknown as typeof fetch;

    captured = [];
    stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation((chunk: unknown) => {
      captured.push(String(chunk));
      return true;
    });
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  function getOutput(): string {
    return captured.join("");
  }

  it("emits phase 1/4 header + phase 2/4 header etc", async () => {
    await initProject(tmp, { dryRun: true });
    const out = getOutput();
    expect(out).toContain("phase 1 / 4");
    expect(out).toContain("phase 2 / 4");
    expect(out).toContain("phase 3 / 4");
    expect(out).toContain("phase 4 / 4");
  });

  it("emits step-level status for template rendering", async () => {
    await initProject(tmp, { dryRun: true });
    const out = getOutput();
    expect(out).toContain("rendering claude");
    expect(out).toContain("ok");
  });

  it("emits bookend with next action suggestion", async () => {
    await initProject(tmp, { dryRun: true });
    const out = getOutput();
    expect(out).toContain("run 'matilha scout'");
  });

  it("dry-run mode uses [dry-run] marker, no disk writes", async () => {
    await initProject(tmp, { dryRun: true });
    const out = getOutput();
    expect(out).toContain("dry-run");
    expect(existsSync(join(tmp, "CLAUDE.md"))).toBe(false);
    expect(existsSync(join(tmp, "AGENTS.md"))).toBe(false);
    expect(existsSync(join(tmp, "project-status.md"))).toBe(false);
  });
});
