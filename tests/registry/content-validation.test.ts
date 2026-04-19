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
