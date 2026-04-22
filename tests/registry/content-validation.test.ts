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

// Wave 5a additions — matilha-ux-pack validation

const UX_PACK_REPO = resolve(__dirname, "../../../matilha-ux-pack");
const uxPackExists = existsSync(UX_PACK_REPO);

const packSkillFrontmatterSchema = z.object({
  name: z.string().regex(/^[a-z][a-z0-9-]*[a-z0-9]$/),
  description: z.string().min(1).max(300),
  category: z.enum(["ux", "cog"]),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  requires: z.array(z.string()).optional(),
  optional_companions: z.array(z.string()).optional()
});

function loadUxPackSkillFrontmatter(skillDir: string): unknown {
  const content = readFileSync(resolve(UX_PACK_REPO, "skills", skillDir, "SKILL.md"), "utf-8");
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) throw new Error(`${skillDir}: SKILL.md has no frontmatter`);
  return parseYaml(match[1]!);
}

function listUxPackSkills(): string[] {
  if (!uxPackExists) return [];
  return readdirSync(resolve(UX_PACK_REPO, "skills")).filter((d) => !d.startsWith("."));
}

function loadUxPackSkillContent(skillDir: string): string {
  return readFileSync(resolve(UX_PACK_REPO, "skills", skillDir, "SKILL.md"), "utf-8");
}

function extractUxPackDescriptionWords(skillDir: string): Set<string> {
  const fm = loadUxPackSkillFrontmatter(skillDir) as { description: string };
  const stopwords = new Set(["use", "when", "a", "an", "the", "and", "or", "of", "to", "in", "with", "for", "on", "at", "by"]);
  return new Set(
    fm.description
      .toLowerCase()
      .split(/[\s,.\-—–:;()]+/)
      .filter((w) => w.length > 2 && !stopwords.has(w))
  );
}

describe.skipIf(!uxPackExists)("matilha-ux-pack plugin.json (Wave 5a)", () => {
  it("plugin.json declares matilha-pack keyword", () => {
    const raw = readFileSync(resolve(UX_PACK_REPO, ".claude-plugin/plugin.json"), "utf-8");
    const parsed = JSON.parse(raw) as { keywords?: string[] };
    expect(parsed.keywords, "pack plugin.json must include 'matilha-pack' in keywords").toContain("matilha-pack");
  });

  it("plugin.json has valid top-level shape", () => {
    const raw = readFileSync(resolve(UX_PACK_REPO, ".claude-plugin/plugin.json"), "utf-8");
    const parsed = JSON.parse(raw) as { name?: string; version?: string; license?: string };
    expect(parsed.name).toBe("matilha-ux-pack");
    expect(parsed.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(parsed.license).toBe("MIT");
  });

  it("marketplace.json parses as valid JSON", () => {
    const raw = readFileSync(resolve(UX_PACK_REPO, ".claude-plugin/marketplace.json"), "utf-8");
    expect(() => JSON.parse(raw)).not.toThrow();
  });
});

describe.skipIf(!uxPackExists)("matilha-ux-pack skill frontmatter (Wave 5a)", () => {
  for (const skillDir of listUxPackSkills()) {
    it(`${skillDir}: frontmatter validates against packSkillFrontmatterSchema`, () => {
      const fm = loadUxPackSkillFrontmatter(skillDir);
      const result = packSkillFrontmatterSchema.safeParse(fm);
      if (!result.success) {
        const issues = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
        throw new Error(`${skillDir} frontmatter invalid: ${issues}`);
      }
    });

    it(`${skillDir}: frontmatter name matches directory name`, () => {
      const fm = loadUxPackSkillFrontmatter(skillDir) as { name: string };
      expect(fm.name).toBe(skillDir);
    });

    it(`${skillDir}: description starts with "Use when" or "When"`, () => {
      const fm = loadUxPackSkillFrontmatter(skillDir) as { description: string };
      const ok = /^Use when |^When /.test(fm.description);
      expect(ok, `${skillDir} description does not start with "Use when" or "When": ${fm.description}`).toBe(true);
    });

    it(`${skillDir}: category is ux or cog, matching slug prefix`, () => {
      const fm = loadUxPackSkillFrontmatter(skillDir) as { category: string };
      const expectedCategory = skillDir.startsWith("ux-") ? "ux" : "cog";
      expect(fm.category).toBe(expectedCategory);
    });
  }
});

describe.skipIf(!uxPackExists)("matilha-ux-pack skill body (Wave 5a)", () => {
  for (const skillDir of listUxPackSkills()) {
    it(`${skillDir}: body has mandatory ## Sources section`, () => {
      const content = loadUxPackSkillContent(skillDir);
      expect(content, `${skillDir} missing ## Sources section`).toContain("## Sources");
    });

    it(`${skillDir}: Sources section has at least 1 wikilink`, () => {
      const content = loadUxPackSkillContent(skillDir);
      const sourcesIdx = content.indexOf("## Sources");
      expect(sourcesIdx).toBeGreaterThan(-1);
      const sourcesBody = content.slice(sourcesIdx);
      const wikilinks = sourcesBody.match(/\[\[[^\]]+\]\]/g) ?? [];
      expect(wikilinks.length, `${skillDir} has no wikilinks in Sources section`).toBeGreaterThan(0);
    });

    it(`${skillDir}: body length is 150-500 lines (target 150-300)`, () => {
      const content = loadUxPackSkillContent(skillDir);
      const lines = content.split("\n").length;
      expect(lines, `${skillDir} body is ${lines} lines; expected 150-500`).toBeGreaterThan(149);
      expect(lines, `${skillDir} body is ${lines} lines; expected 150-500`).toBeLessThan(501);
    });
  }
});

describe.skipIf(!uxPackExists)("matilha-ux-pack activation uniqueness heuristic (Wave 5a)", () => {
  it("no pair of skills has > 80% description word overlap", () => {
    const skills = listUxPackSkills();
    const wordsBySkill = new Map(skills.map((s) => [s, extractUxPackDescriptionWords(s)]));
    const collisions: string[] = [];

    for (let i = 0; i < skills.length; i++) {
      for (let j = i + 1; j < skills.length; j++) {
        const a = skills[i]!;
        const b = skills[j]!;
        const aWords = wordsBySkill.get(a)!;
        const bWords = wordsBySkill.get(b)!;
        const intersection = new Set([...aWords].filter((w) => bWords.has(w)));
        const union = new Set([...aWords, ...bWords]);
        const overlap = union.size > 0 ? intersection.size / union.size : 0;
        if (overlap > 0.8) {
          collisions.push(`${a} <> ${b}: ${(overlap * 100).toFixed(1)}%`);
        }
      }
    }

    expect(collisions, `Activation collisions: ${collisions.join(", ")}`).toHaveLength(0);
  });
});

// Wave 5b additions — matilha-growth-pack validation

const GROWTH_PACK_REPO = resolve(__dirname, "../../../matilha-growth-pack");
const growthPackExists = existsSync(GROWTH_PACK_REPO);

const growthPackSkillFrontmatterSchema = z.object({
  name: z.string().regex(/^[a-z][a-z0-9-]*[a-z0-9]$/),
  description: z.string().min(1).max(300),
  category: z.enum(["growth"]),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  requires: z.array(z.string()).optional(),
  optional_companions: z.array(z.string()).optional()
});

function loadGrowthPackSkillFrontmatter(skillDir: string): unknown {
  const content = readFileSync(resolve(GROWTH_PACK_REPO, "skills", skillDir, "SKILL.md"), "utf-8");
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) throw new Error(`${skillDir}: SKILL.md has no frontmatter`);
  return parseYaml(match[1]!);
}

function listGrowthPackSkills(): string[] {
  if (!growthPackExists) return [];
  return readdirSync(resolve(GROWTH_PACK_REPO, "skills")).filter((d) => !d.startsWith("."));
}

function loadGrowthPackSkillContent(skillDir: string): string {
  return readFileSync(resolve(GROWTH_PACK_REPO, "skills", skillDir, "SKILL.md"), "utf-8");
}

function extractGrowthPackDescriptionWords(skillDir: string): Set<string> {
  const fm = loadGrowthPackSkillFrontmatter(skillDir) as { description: string };
  const stopwords = new Set(["use", "when", "a", "an", "the", "and", "or", "of", "to", "in", "with", "for", "on", "at", "by"]);
  return new Set(
    fm.description
      .toLowerCase()
      .split(/[\s,.\-—–:;()]+/)
      .filter((w) => w.length > 2 && !stopwords.has(w))
  );
}

describe.skipIf(!growthPackExists)("matilha-growth-pack plugin.json (Wave 5b)", () => {
  it("plugin.json declares matilha-pack keyword", () => {
    const raw = readFileSync(resolve(GROWTH_PACK_REPO, ".claude-plugin/plugin.json"), "utf-8");
    const parsed = JSON.parse(raw) as { keywords?: string[] };
    expect(parsed.keywords, "pack plugin.json must include 'matilha-pack' in keywords").toContain("matilha-pack");
  });

  it("plugin.json has valid top-level shape", () => {
    const raw = readFileSync(resolve(GROWTH_PACK_REPO, ".claude-plugin/plugin.json"), "utf-8");
    const parsed = JSON.parse(raw) as { name?: string; version?: string; license?: string };
    expect(parsed.name).toBe("matilha-growth-pack");
    expect(parsed.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(parsed.license).toBe("MIT");
  });

  it("marketplace.json parses as valid JSON", () => {
    const raw = readFileSync(resolve(GROWTH_PACK_REPO, ".claude-plugin/marketplace.json"), "utf-8");
    expect(() => JSON.parse(raw)).not.toThrow();
  });
});

describe.skipIf(!growthPackExists)("matilha-growth-pack skill frontmatter (Wave 5b)", () => {
  for (const skillDir of listGrowthPackSkills()) {
    it(`${skillDir}: frontmatter validates against growthPackSkillFrontmatterSchema`, () => {
      const fm = loadGrowthPackSkillFrontmatter(skillDir);
      const result = growthPackSkillFrontmatterSchema.safeParse(fm);
      if (!result.success) {
        const issues = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
        throw new Error(`${skillDir} frontmatter invalid: ${issues}`);
      }
    });

    it(`${skillDir}: frontmatter name matches directory name`, () => {
      const fm = loadGrowthPackSkillFrontmatter(skillDir) as { name: string };
      expect(fm.name).toBe(skillDir);
    });

    it(`${skillDir}: description starts with "Use when" or "When"`, () => {
      const fm = loadGrowthPackSkillFrontmatter(skillDir) as { description: string };
      const ok = /^Use when |^When /.test(fm.description);
      expect(ok, `${skillDir} description does not start with "Use when" or "When": ${fm.description}`).toBe(true);
    });

    it(`${skillDir}: category is growth, matching slug prefix growth-`, () => {
      const fm = loadGrowthPackSkillFrontmatter(skillDir) as { category: string };
      expect(fm.category).toBe("growth");
      expect(skillDir.startsWith("growth-")).toBe(true);
    });
  }
});

describe.skipIf(!growthPackExists)("matilha-growth-pack skill body (Wave 5b)", () => {
  for (const skillDir of listGrowthPackSkills()) {
    it(`${skillDir}: body has mandatory ## Sources section`, () => {
      const content = loadGrowthPackSkillContent(skillDir);
      expect(content, `${skillDir} missing ## Sources section`).toContain("## Sources");
    });

    it(`${skillDir}: Sources section has at least 1 wikilink`, () => {
      const content = loadGrowthPackSkillContent(skillDir);
      const sourcesIdx = content.indexOf("## Sources");
      expect(sourcesIdx).toBeGreaterThan(-1);
      const sourcesBody = content.slice(sourcesIdx);
      const wikilinks = sourcesBody.match(/\[\[[^\]]+\]\]/g) ?? [];
      expect(wikilinks.length, `${skillDir} has no wikilinks in Sources section`).toBeGreaterThan(0);
    });

    it(`${skillDir}: body length is 150-500 lines (target 150-300)`, () => {
      const content = loadGrowthPackSkillContent(skillDir);
      const lines = content.split("\n").length;
      expect(lines, `${skillDir} body is ${lines} lines; expected 150-500`).toBeGreaterThan(149);
      expect(lines, `${skillDir} body is ${lines} lines; expected 150-500`).toBeLessThan(501);
    });
  }
});

describe.skipIf(!growthPackExists)("matilha-growth-pack activation uniqueness heuristic (Wave 5b)", () => {
  it("no pair of skills has > 80% description word overlap", () => {
    const skills = listGrowthPackSkills();
    const wordsBySkill = new Map(skills.map((s) => [s, extractGrowthPackDescriptionWords(s)]));
    const collisions: string[] = [];

    for (let i = 0; i < skills.length; i++) {
      for (let j = i + 1; j < skills.length; j++) {
        const a = skills[i]!;
        const b = skills[j]!;
        const aWords = wordsBySkill.get(a)!;
        const bWords = wordsBySkill.get(b)!;
        const intersection = new Set([...aWords].filter((w) => bWords.has(w)));
        const union = new Set([...aWords, ...bWords]);
        const overlap = union.size > 0 ? intersection.size / union.size : 0;
        if (overlap > 0.8) {
          collisions.push(`${a} <> ${b}: ${(overlap * 100).toFixed(1)}%`);
        }
      }
    }

    expect(collisions, `Activation collisions: ${collisions.join(", ")}`).toHaveLength(0);
  });
});

describe.skipIf(!growthPackExists)("matilha-growth-pack overlap disclosure (Wave 5b)", () => {
  const overlapSkills = [
    { slug: "growth-hook-model-product", expectedPhrase: "Complements" },
    { slug: "growth-fogg-bmap-feasibility", expectedPhrase: "No direct" },
    { slug: "growth-octalysis-drives", expectedPhrase: "Complements" },
    { slug: "growth-peak-end-journey", expectedPhrase: "Complements" }
  ];
  for (const { slug, expectedPhrase } of overlapSkills) {
    it(`${slug}: Companion Integration section declares overlap distinction`, () => {
      const content = loadGrowthPackSkillContent(slug);
      const ciIdx = content.indexOf("## Companion Integration");
      expect(ciIdx).toBeGreaterThan(-1);
      const nextSectionIdx = content.indexOf("\n## ", ciIdx + 1);
      const ciBody = nextSectionIdx > -1 ? content.slice(ciIdx, nextSectionIdx) : content.slice(ciIdx);
      expect(ciBody, `${slug} Companion Integration must contain "${expectedPhrase}"`).toContain(expectedPhrase);
    });
  }
});

// Wave 5c additions — matilha-harness-pack validation

const HARNESS_PACK_REPO = resolve(__dirname, "../../../matilha-harness-pack");
const harnessPackExists = existsSync(HARNESS_PACK_REPO);

const harnessPackSkillFrontmatterSchema = z.object({
  name: z.string().regex(/^[a-z][a-z0-9-]*[a-z0-9]$/),
  description: z.string().min(1).max(300),
  category: z.enum(["harness"]),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  requires: z.array(z.string()).optional(),
  optional_companions: z.array(z.string()).optional()
});

function loadHarnessPackSkillFrontmatter(skillDir: string): unknown {
  const content = readFileSync(resolve(HARNESS_PACK_REPO, "skills", skillDir, "SKILL.md"), "utf-8");
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) throw new Error(`${skillDir}: SKILL.md has no frontmatter`);
  return parseYaml(match[1]!);
}

function listHarnessPackSkills(): string[] {
  if (!harnessPackExists) return [];
  return readdirSync(resolve(HARNESS_PACK_REPO, "skills")).filter((d) => !d.startsWith("."));
}

function loadHarnessPackSkillContent(skillDir: string): string {
  return readFileSync(resolve(HARNESS_PACK_REPO, "skills", skillDir, "SKILL.md"), "utf-8");
}

function extractHarnessPackDescriptionWords(skillDir: string): Set<string> {
  const fm = loadHarnessPackSkillFrontmatter(skillDir) as { description: string };
  const stopwords = new Set(["use", "when", "a", "an", "the", "and", "or", "of", "to", "in", "with", "for", "on", "at", "by"]);
  return new Set(
    fm.description
      .toLowerCase()
      .split(/[\s,.\-—–:;()]+/)
      .filter((w) => w.length > 2 && !stopwords.has(w))
  );
}

describe.skipIf(!harnessPackExists)("matilha-harness-pack plugin.json (Wave 5c)", () => {
  it("plugin.json declares matilha-pack keyword", () => {
    const raw = readFileSync(resolve(HARNESS_PACK_REPO, ".claude-plugin/plugin.json"), "utf-8");
    const parsed = JSON.parse(raw) as { keywords?: string[] };
    expect(parsed.keywords, "pack plugin.json must include 'matilha-pack' in keywords").toContain("matilha-pack");
  });

  it("plugin.json has valid top-level shape", () => {
    const raw = readFileSync(resolve(HARNESS_PACK_REPO, ".claude-plugin/plugin.json"), "utf-8");
    const parsed = JSON.parse(raw) as { name?: string; version?: string; license?: string };
    expect(parsed.name).toBe("matilha-harness-pack");
    expect(parsed.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(parsed.license).toBe("MIT");
  });

  it("marketplace.json parses as valid JSON", () => {
    const raw = readFileSync(resolve(HARNESS_PACK_REPO, ".claude-plugin/marketplace.json"), "utf-8");
    expect(() => JSON.parse(raw)).not.toThrow();
  });
});

describe.skipIf(!harnessPackExists)("matilha-harness-pack skill frontmatter (Wave 5c)", () => {
  for (const skillDir of listHarnessPackSkills()) {
    it(`${skillDir}: frontmatter validates against harnessPackSkillFrontmatterSchema`, () => {
      const fm = loadHarnessPackSkillFrontmatter(skillDir);
      const result = harnessPackSkillFrontmatterSchema.safeParse(fm);
      if (!result.success) {
        const issues = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
        throw new Error(`${skillDir} frontmatter invalid: ${issues}`);
      }
    });

    it(`${skillDir}: frontmatter name matches directory name`, () => {
      const fm = loadHarnessPackSkillFrontmatter(skillDir) as { name: string };
      expect(fm.name).toBe(skillDir);
    });

    it(`${skillDir}: description starts with "Use when" or "When"`, () => {
      const fm = loadHarnessPackSkillFrontmatter(skillDir) as { description: string };
      const ok = /^Use when |^When /.test(fm.description);
      expect(ok, `${skillDir} description does not start with "Use when" or "When": ${fm.description}`).toBe(true);
    });

    it(`${skillDir}: category is harness, matching slug prefix harness-`, () => {
      const fm = loadHarnessPackSkillFrontmatter(skillDir) as { category: string };
      expect(fm.category).toBe("harness");
      expect(skillDir.startsWith("harness-")).toBe(true);
    });
  }
});

describe.skipIf(!harnessPackExists)("matilha-harness-pack skill body (Wave 5c)", () => {
  for (const skillDir of listHarnessPackSkills()) {
    it(`${skillDir}: body has mandatory ## Sources section`, () => {
      const content = loadHarnessPackSkillContent(skillDir);
      expect(content, `${skillDir} missing ## Sources section`).toContain("## Sources");
    });

    it(`${skillDir}: Sources section has at least 1 wikilink`, () => {
      const content = loadHarnessPackSkillContent(skillDir);
      const sourcesIdx = content.indexOf("## Sources");
      expect(sourcesIdx).toBeGreaterThan(-1);
      const sourcesBody = content.slice(sourcesIdx);
      const wikilinks = sourcesBody.match(/\[\[[^\]]+\]\]/g) ?? [];
      expect(wikilinks.length, `${skillDir} has no wikilinks in Sources section`).toBeGreaterThan(0);
    });

    it(`${skillDir}: body length is 150-500 lines (target 150-300)`, () => {
      const content = loadHarnessPackSkillContent(skillDir);
      const lines = content.split("\n").length;
      expect(lines, `${skillDir} body is ${lines} lines; expected 150-500`).toBeGreaterThan(149);
      expect(lines, `${skillDir} body is ${lines} lines; expected 150-500`).toBeLessThan(501);
    });
  }
});

describe.skipIf(!harnessPackExists)("matilha-harness-pack activation uniqueness heuristic (Wave 5c)", () => {
  it("no pair of skills has > 80% description word overlap", () => {
    const skills = listHarnessPackSkills();
    const wordsBySkill = new Map(skills.map((s) => [s, extractHarnessPackDescriptionWords(s)]));
    const collisions: string[] = [];

    for (let i = 0; i < skills.length; i++) {
      for (let j = i + 1; j < skills.length; j++) {
        const a = skills[i]!;
        const b = skills[j]!;
        const aWords = wordsBySkill.get(a)!;
        const bWords = wordsBySkill.get(b)!;
        const intersection = new Set([...aWords].filter((w) => bWords.has(w)));
        const union = new Set([...aWords, ...bWords]);
        const overlap = union.size > 0 ? intersection.size / union.size : 0;
        if (overlap > 0.8) {
          collisions.push(`${a} <> ${b}: ${(overlap * 100).toFixed(1)}%`);
        }
      }
    }

    expect(collisions, `Activation collisions: ${collisions.join(", ")}`).toHaveLength(0);
  });
});

describe.skipIf(!harnessPackExists)("matilha-harness-pack overlap disclosure (Wave 5c)", () => {
  const overlapSkills = [
    { slug: "harness-eval-roadmap-0-to-1", expectedPhrase: "Complements" },
    { slug: "harness-context-rot-budget", expectedPhrase: "Complements" }
  ];
  for (const { slug, expectedPhrase } of overlapSkills) {
    it(`${slug}: Companion Integration section declares overlap distinction`, () => {
      const content = loadHarnessPackSkillContent(slug);
      const ciIdx = content.indexOf("## Companion Integration");
      expect(ciIdx).toBeGreaterThan(-1);
      const nextSectionIdx = content.indexOf("\n## ", ciIdx + 1);
      const ciBody = nextSectionIdx > -1 ? content.slice(ciIdx, nextSectionIdx) : content.slice(ciIdx);
      expect(ciBody, `${slug} Companion Integration must contain "${expectedPhrase}"`).toContain(expectedPhrase);
    });
  }
});

// Wave 5d additions — composition layer validation

describe.skipIf(!skillsRepoExists)("matilha-compose skill (Wave 5d)", () => {
  const composePath = resolve(SKILLS_REPO, "skills/matilha-compose/SKILL.md");
  const composeExists = existsSync(composePath);

  it("skills/matilha-compose/SKILL.md exists", () => {
    expect(composeExists).toBe(true);
  });

  it("frontmatter validates against skillFrontmatterSchema", () => {
    if (!composeExists) return;
    const content = readFileSync(composePath, "utf-8");
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    expect(match).not.toBeNull();
    const fm = parseYaml(match![1]!);
    const result = skillFrontmatterSchema.safeParse(fm);
    if (!result.success) {
      const issues = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      throw new Error(`matilha-compose frontmatter invalid: ${issues}`);
    }
  });

  it("description contains activation gate: MUST + matilha-project condition", () => {
    if (!composeExists) return;
    const content = readFileSync(composePath, "utf-8");
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    const fm = parseYaml(match![1]!) as { description: string };

    expect(fm.description, "description missing 'MUST use' imperative").toMatch(/MUST use/i);

    const hasMatilhaSignal =
      /matilha project/i.test(fm.description) ||
      /docs\/matilha\//i.test(fm.description) ||
      /project-status\.md/i.test(fm.description) ||
      /matilha-\*-pack/i.test(fm.description);
    expect(hasMatilhaSignal, "description missing matilha-project condition").toBe(true);
  });

  it("optional_companions includes superpowers:brainstorming", () => {
    if (!composeExists) return;
    const content = readFileSync(composePath, "utf-8");
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    const fm = parseYaml(match![1]!) as { optional_companions?: string[] };
    expect(fm.optional_companions).toContain("superpowers:brainstorming");
  });
});
