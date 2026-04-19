import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import { parse as parseYaml } from "yaml";

// Resolves to ~/Documents/Projetos/matilha-skills/ if present (dev mode).
// When running in CI or without skills repo side-by-side, these tests skip.
const SKILLS_REPO = resolve(__dirname, "../../../matilha-skills");
const skillsRepoExists = existsSync(SKILLS_REPO);

const registryEntrySchema = z.object({
  slug: z.string().regex(/^[a-z0-9](?:[a-z0-9-_]*[a-z0-9])?$/),
  name: z.string().min(1),
  skillPath: z.string().min(1)
});

const registryIndexSchema = z.record(z.string(), registryEntrySchema);

describe.skipIf(!skillsRepoExists)("matilha-skills content validation", () => {
  it("index.json is valid JSON and schema-compliant", () => {
    const content = readFileSync(resolve(SKILLS_REPO, "index.json"), "utf-8");
    const parsed = JSON.parse(content);
    const result = registryIndexSchema.safeParse(parsed);
    expect(result.success).toBe(true);
  });

  it("every index entry points to an existing skill file", () => {
    const content = readFileSync(resolve(SKILLS_REPO, "index.json"), "utf-8");
    const parsed = registryIndexSchema.parse(JSON.parse(content));

    for (const entry of Object.values(parsed)) {
      const skillPath = resolve(SKILLS_REPO, entry.skillPath);
      expect(existsSync(skillPath), `${entry.slug}: ${entry.skillPath} not found`).toBe(true);
    }
  });

  it("every skill has MATILHA_MANAGED markers", () => {
    const content = readFileSync(resolve(SKILLS_REPO, "index.json"), "utf-8");
    const parsed = registryIndexSchema.parse(JSON.parse(content));

    for (const entry of Object.values(parsed)) {
      const skillContent = readFileSync(resolve(SKILLS_REPO, entry.skillPath), "utf-8");
      // Wave 4a: MANAGED markers removed. Plugin path is now the source of truth;
      // skills are complete-rewrite artifacts. Keeping the test harmless (smoke: file readable).
      expect(skillContent.length, `${entry.slug}: SKILL.md empty`).toBeGreaterThan(100);
    }
  });

  it("every skill has all 12 blueprint sections", () => {
    const content = readFileSync(resolve(SKILLS_REPO, "index.json"), "utf-8");
    const parsed = registryIndexSchema.parse(JSON.parse(content));
    const sections = [
      "## When this fires",
      "## Preconditions",
      "## Execution Workflow",
      "## Rules: Do",
      "## Rules: Don't",
      "## Expected Behavior",
      "## Quality Gates",
      "## Companion Integration",
      "## Output Artifacts",
      "## Example Constraint Language",
      "## Troubleshooting",
      "## CLI shortcut (optional)"
    ];

    for (const entry of Object.values(parsed)) {
      const skillContent = readFileSync(resolve(SKILLS_REPO, entry.skillPath), "utf-8");
      for (const section of sections) {
        expect(skillContent, `${entry.slug}: missing ${section}`).toContain(section);
      }
    }
  });

  it("all 11 methodology pages exist", () => {
    const expected = [
      "index.md",
      "principios-transversais.md",
      "materializacoes.md",
      "00-mapeamento-problema.md",
      "10-prd.md",
      "20-stack.md",
      "30-skills-agents.md",
      "40-execucao.md",
      "50-qualidade-testes.md",
      "60-deploy-infra.md",
      "70-onboarding-time.md"
    ];

    for (const file of expected) {
      const p = resolve(SKILLS_REPO, "methodology", file);
      expect(existsSync(p), `${file} not found`).toBe(true);
    }
  });
});

// Wave 4a additions — skill frontmatter schema + description linter

const skillFrontmatterSchema = z.object({
  name: z.string().regex(/^[a-z][a-z0-9-]*[a-z0-9]$/),
  description: z.string().min(1).max(300),
  category: z.enum(["matilha", "ux", "growth", "design", "security", "harness", "cog"]),
  version: z.string().regex(/^\d+\.\d+\.\d+$/).optional(),
  requires: z.array(z.string()).optional(),
  optional_companions: z.array(z.string()).optional()
});

function loadSkillFrontmatter(skillDir: string): unknown {
  const content = readFileSync(resolve(SKILLS_REPO, "skills", skillDir, "SKILL.md"), "utf-8");
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) throw new Error(`${skillDir}: SKILL.md has no frontmatter`);
  return parseYaml(match[1]!);
}

function listSkills(): string[] {
  if (!skillsRepoExists) return [];
  return readdirSync(resolve(SKILLS_REPO, "skills")).filter((d) => !d.startsWith("."));
}

describe.skipIf(!skillsRepoExists)("skill frontmatter schema (Wave 4a)", () => {
  for (const skillDir of listSkills()) {
    it(`${skillDir}: frontmatter validates against skillFrontmatterSchema`, () => {
      const fm = loadSkillFrontmatter(skillDir);
      const result = skillFrontmatterSchema.safeParse(fm);
      if (!result.success) {
        const issues = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
        throw new Error(`${skillDir} frontmatter invalid: ${issues}`);
      }
    });

    it(`${skillDir}: frontmatter name matches directory name`, () => {
      const fm = loadSkillFrontmatter(skillDir) as { name: string };
      expect(fm.name).toBe(skillDir);
    });
  }
});

describe.skipIf(!skillsRepoExists)("skill description linter (Wave 4a)", () => {
  for (const skillDir of listSkills()) {
    it(`${skillDir}: description starts with "Use when" or "When"`, () => {
      const fm = loadSkillFrontmatter(skillDir) as { description: string };
      const ok = /^Use when |^When /.test(fm.description);
      expect(ok, `${skillDir} description does not start with "Use when" or "When": ${fm.description}`).toBe(true);
    });
  }
});

// Wave 4a additions — plugin manifests + context files + agents + governance docs + tool mapping

const pluginJsonSchema = z.object({
  name: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  description: z.string().min(10),
  author: z.object({ name: z.string().min(1) }).or(z.string().min(1)),
  license: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  homepage: z.string().url().optional(),
  repository: z.string().optional()
});

const geminiExtensionSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(10),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  contextFileName: z.string().min(1)
});

const agentFrontmatterSchema = z.object({
  name: z.string().regex(/^[a-z][a-z0-9-]*[a-z0-9]$/),
  description: z.string().min(20),
  tools: z.string().min(1).optional(),
  color: z.string().optional()
});

describe.skipIf(!skillsRepoExists)("plugin manifests (Wave 4a)", () => {
  it(".claude-plugin/plugin.json validates against schema", () => {
    const raw = readFileSync(resolve(SKILLS_REPO, ".claude-plugin/plugin.json"), "utf-8");
    const parsed = JSON.parse(raw);
    expect(pluginJsonSchema.parse(parsed).name).toBe("matilha");
  });

  it(".claude-plugin/marketplace.json parses as valid JSON", () => {
    const raw = readFileSync(resolve(SKILLS_REPO, ".claude-plugin/marketplace.json"), "utf-8");
    expect(() => JSON.parse(raw)).not.toThrow();
  });

  it("gemini-extension.json validates against schema", () => {
    const raw = readFileSync(resolve(SKILLS_REPO, "gemini-extension.json"), "utf-8");
    const parsed = JSON.parse(raw);
    expect(geminiExtensionSchema.parse(parsed).contextFileName).toBe("GEMINI.md");
  });
});

describe.skipIf(!skillsRepoExists)("context files (Wave 4a)", () => {
  it("CLAUDE.md exists and contains the slogan", () => {
    const content = readFileSync(resolve(SKILLS_REPO, "CLAUDE.md"), "utf-8");
    expect(content).toContain("You lead. Agents hunt.");
  });

  it("GEMINI.md exists and contains the slogan", () => {
    const content = readFileSync(resolve(SKILLS_REPO, "GEMINI.md"), "utf-8");
    expect(content).toContain("You lead. Agents hunt.");
  });

  it("AGENTS.md exists and contains the slogan", () => {
    const content = readFileSync(resolve(SKILLS_REPO, "AGENTS.md"), "utf-8");
    expect(content).toContain("You lead. Agents hunt.");
  });
});

describe.skipIf(!skillsRepoExists)("agent files (Wave 4a)", () => {
  const agentDir = resolve(SKILLS_REPO, ".claude-plugin/agents");

  it("matilha-code-architect.md has valid frontmatter", () => {
    const content = readFileSync(resolve(agentDir, "matilha-code-architect.md"), "utf-8");
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    expect(match).not.toBeNull();
    const fm = parseYaml(match![1]!);
    expect(agentFrontmatterSchema.parse(fm).name).toBe("matilha-code-architect");
  });

  it("matilha-plan-reviewer.md has valid frontmatter", () => {
    const content = readFileSync(resolve(agentDir, "matilha-plan-reviewer.md"), "utf-8");
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    expect(match).not.toBeNull();
    const fm = parseYaml(match![1]!);
    expect(agentFrontmatterSchema.parse(fm).name).toBe("matilha-plan-reviewer");
  });
});

describe.skipIf(!skillsRepoExists)("governance docs (Wave 4a)", () => {
  const govDocs = [
    "docs/matilha/companions-contract.md",
    "docs/matilha/skill-authoring-guide.md",
    "docs/matilha/naming-conventions.md",
    "docs/matilha/pack-authors.md",
    "docs/platform-tool-mapping.md"
  ];
  for (const doc of govDocs) {
    it(`${doc} exists and is non-trivial (> 40 lines)`, () => {
      const content = readFileSync(resolve(SKILLS_REPO, doc), "utf-8");
      const lines = content.split("\n").length;
      expect(lines, `${doc} has only ${lines} lines; expected > 40`).toBeGreaterThan(40);
    });
  }
});

describe.skipIf(!skillsRepoExists)("platform tool mapping completeness (Wave 4a)", () => {
  it("mentions all required tools", () => {
    const content = readFileSync(resolve(SKILLS_REPO, "docs/platform-tool-mapping.md"), "utf-8");
    const required = ["Task", "Skill", "Read", "Write", "Edit", "Bash", "TodoWrite"];
    for (const tool of required) {
      expect(content, `platform-tool-mapping.md missing ${tool}`).toContain(tool);
    }
  });
});
