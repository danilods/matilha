import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";

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
      expect(skillContent, `${entry.slug}: missing MATILHA_MANAGED_START`).toContain("MATILHA_MANAGED_START");
      expect(skillContent, `${entry.slug}: missing MATILHA_MANAGED_END`).toContain("MATILHA_MANAGED_END");
    }
  });

  it("every skill has all 12 blueprint sections", () => {
    const content = readFileSync(resolve(SKILLS_REPO, "index.json"), "utf-8");
    const parsed = registryIndexSchema.parse(JSON.parse(content));
    const sections = [
      "## Mission",
      "## SoR Reference",
      "## Preconditions",
      "## Execution Workflow",
      "## Rules: Do",
      "## Rules: Don't",
      "## Expected Behavior",
      "## Quality Gates",
      "## Companion Integration",
      "## Output Artifacts",
      "## Example Constraint Language",
      "## Troubleshooting"
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
