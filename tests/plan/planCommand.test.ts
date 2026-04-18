import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { planCommand } from "../../src/plan/planCommand";
import { RegistryClient } from "../../src/registry/registryClient";

const VALID_STATUS_PHASE_10 = `---
schema_version: 1
name: test-proj
archetype: saas-b2b
created: "2026-04-19T10:00:00Z"
last_update: "2026-04-19T10:00:00Z"
current_phase: 10
phase_status: not_started
next_action: "Run /plan"
tools_detected:
  - claude-code
companion_skills:
  impeccable: not_installed
  shadcn: not_installed
  superpowers: not_installed
  typeui: not_installed
active_waves: []
completed_waves: []
feature_artifacts: []
recent_decisions: []
pending_decisions: []
blockers: []
---
# Body`;

const SPEC_TMPL = `---
name: {{feature_slug}}
created: "{{date}}"
archetype: {{archetype}}
methodology_phase: 10
---

# {{feature_title}} — Matilha Spec

{{research_context_block}}

## 2. Problem Statement
[placeholder]

## Links
- Plan: {{plan_relative_path}}
`;

const PLAN_TMPL = `---
name: {{feature_slug}}
spec: {{spec_relative_path}}
created: "{{date}}"
waves:
  w1:
    - SP1
---

# {{feature_title}} — Plan

## Wave 1
## Links
- Spec: {{spec_relative_path}}
`;

function makeMockClient(): RegistryClient {
  return new RegistryClient(
    "https://raw.example.com/repo/main/index.json",
    "https://raw.example.com/repo/main",
    async (input) => {
      const url = String(input);
      if (url.endsWith("spec.md.tmpl")) return new Response(SPEC_TMPL, { status: 200 });
      if (url.endsWith("plan.md.tmpl")) return new Response(PLAN_TMPL, { status: 200 });
      return new Response("", { status: 404 });
    }
  );
}

describe("planCommand", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "plan-"));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it("native happy path: creates scaffolds under docs/matilha/", async () => {
    writeFileSync(join(tmp, "project-status.md"), VALID_STATUS_PHASE_10);
    await planCommand(tmp, "user-onboarding", { registryClient: makeMockClient() });

    const { readdirSync } = await import("node:fs");
    const specFiles = readdirSync(join(tmp, "docs", "matilha", "specs"));
    const planFiles = readdirSync(join(tmp, "docs", "matilha", "plans"));
    expect(specFiles.some((f: string) => f.endsWith("user-onboarding-spec.md"))).toBe(true);
    expect(planFiles.some((f: string) => f.endsWith("user-onboarding-plan.md"))).toBe(true);

    const updated = readFileSync(join(tmp, "project-status.md"), "utf-8");
    expect(updated).toContain("feature_artifacts:");
    expect(updated).toContain("name: user-onboarding");
    expect(updated).toContain("owned_by: matilha");
    expect(updated).toContain("problem_defined: pending");
    expect(updated).toContain("stack_table_declared: pending");
    expect(updated).toContain("claude_md_declares_stack_rules: pending");
  });

  it("superpowers detected: owned_by = superpowers but paths still docs/matilha/", async () => {
    const statusSp = VALID_STATUS_PHASE_10.replace("superpowers: not_installed", "superpowers: installed");
    writeFileSync(join(tmp, "project-status.md"), statusSp);
    await planCommand(tmp, "feat-sp", { registryClient: makeMockClient() });

    const updated = readFileSync(join(tmp, "project-status.md"), "utf-8");
    expect(updated).toContain("owned_by: superpowers");
    expect(existsSync(join(tmp, "docs", "matilha", "specs"))).toBe(true);
  });

  it("rejects when current_phase < 10", async () => {
    const statusPhase0 = VALID_STATUS_PHASE_10.replace("current_phase: 10", "current_phase: 0");
    writeFileSync(join(tmp, "project-status.md"), statusPhase0);
    await expect(planCommand(tmp, "feat-early", { registryClient: makeMockClient() })).rejects.toThrow(/scout|Phase 00|before PRD/i);
  });

  it("rejects when project-status.md missing", async () => {
    await expect(planCommand(tmp, "x", { registryClient: makeMockClient() })).rejects.toThrow(/Matilha project|project-status/i);
  });

  it("rejects invalid slug", async () => {
    writeFileSync(join(tmp, "project-status.md"), VALID_STATUS_PHASE_10);
    await expect(planCommand(tmp, "Invalid Slug!", { registryClient: makeMockClient() })).rejects.toThrow(/slug/i);
  });

  it("rejects existing spec without --force", async () => {
    writeFileSync(join(tmp, "project-status.md"), VALID_STATUS_PHASE_10);
    await planCommand(tmp, "dup-feat", { registryClient: makeMockClient() });
    await expect(
      planCommand(tmp, "dup-feat", { registryClient: makeMockClient() })
    ).rejects.toThrow(/already exists|force/i);
  });

  it("--force overwrites existing spec", async () => {
    writeFileSync(join(tmp, "project-status.md"), VALID_STATUS_PHASE_10);
    await planCommand(tmp, "dup-feat", { registryClient: makeMockClient() });
    // Should not throw when --force is set
    await planCommand(tmp, "dup-feat", { registryClient: makeMockClient(), force: true });
  });

  it("--dry-run does not write files", async () => {
    writeFileSync(join(tmp, "project-status.md"), VALID_STATUS_PHASE_10);
    await planCommand(tmp, "dry-feat", { registryClient: makeMockClient(), dryRun: true });
    expect(existsSync(join(tmp, "docs", "matilha", "specs"))).toBe(false);
  });

  it("--import-research injects research as Section 1", async () => {
    writeFileSync(join(tmp, "project-status.md"), VALID_STATUS_PHASE_10);
    const researchPath = join(tmp, "research.md");
    writeFileSync(researchPath, "# Deep Research\nFinding 1.", "utf-8");
    await planCommand(tmp, "feat-r", { registryClient: makeMockClient(), importResearchPath: researchPath });

    const { readdirSync } = await import("node:fs");
    const specDir = join(tmp, "docs", "matilha", "specs");
    const specFile = readdirSync(specDir).find((f: string) => f.endsWith("feat-r-spec.md"));
    const content = readFileSync(join(specDir, specFile!), "utf-8");
    expect(content).toContain("## 1. Research Context (imported)");
    expect(content).toContain("Imported from `research.md`");
    expect(content).toContain("<!-- MATILHA_RESEARCH_START -->");
    expect(content).toContain("# Deep Research");
  });
});
