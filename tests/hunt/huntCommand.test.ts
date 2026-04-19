// tests/hunt/huntCommand.test.ts
import { describe, it, expect, vi } from "vitest";
import { mkdtempSync, writeFileSync, mkdirSync, existsSync, rmSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { huntCommand } from "../../src/hunt/huntCommand";
import { MatilhaUserError } from "../../src/ui/errorFormat";

const KICKOFF_TMPL = `# Kickoff — {{feature_slug}} / wave-{{wave_num_padded}} / {{sp_id}}
**{{sp_title}}**
{{sp_description}}
### Acceptance
{{acceptance_checklist}}
### Touches
{{touches_list}}
### Tests
{{tests_list}}
{{#if superpowers_detected}}superpowers{{else}}standalone{{/if}}
`;

const SP_DONE_TMPL = `---
type: sp-done
sp_id: {{sp_id}}
feature: {{feature_slug}}
wave: {{wave_id}}
---
# SP-DONE — {{sp_id}}
`;

const PLAN_MD = `---
name: feat-auth
spec: ../specs/feat-auth-spec.md
created: "2026-04-20"
waves:
  w1:
    - SP1
    - SP2
---

# Feat Auth

## Wave 1

### SP1 — Database schema
Desc.

**Acceptance**
- [ ] a1

**Touches**
- migrations/001.sql

**Tests**
- tests/a.test.ts

### SP2 — Session tokens
Desc.

**Acceptance**
- [ ] a2

**Touches**
- src/auth.ts

**Tests**
- tests/auth.test.ts
`;

const PROJECT_STATUS = `---
schema_version: 1
name: test
archetype: api-standalone
created: "2026-04-20T00:00:00Z"
last_update: "2026-04-20T00:00:00Z"
current_phase: 30
phase_status: complete
next_action: "Run /hunt"
tools_detected: []
companion_skills:
  impeccable: not_installed
  shadcn: not_installed
  superpowers: not_installed
  typeui: not_installed
active_waves: []
completed_waves: []
feature_artifacts:
  - name: feat-auth
    spec: docs/matilha/specs/feat-auth-spec.md
    plan: docs/matilha/plans/feat-auth-plan.md
    phase: 30
    wave: w1
    owned_by: matilha
recent_decisions: []
pending_decisions: []
blockers: []
aesthetic_direction: null
design_locked: false
---
# Test
`;

function initProject(): string {
  const root = mkdtempSync(join(tmpdir(), "matilha-hunt-cmd-"));
  const repo = join(root, "main-repo");
  execFileSync("git", ["init", repo]);
  execFileSync("git", ["config", "user.email", "t@e.com"], { cwd: repo });
  execFileSync("git", ["config", "user.name", "T"], { cwd: repo });
  mkdirSync(join(repo, "docs/matilha/plans"), { recursive: true });
  writeFileSync(join(repo, "docs/matilha/plans/feat-auth-plan.md"), PLAN_MD);
  writeFileSync(join(repo, "project-status.md"), PROJECT_STATUS);
  writeFileSync(join(repo, "README.md"), "# test\n");
  execFileSync("git", ["add", "."], { cwd: repo });
  execFileSync("git", ["commit", "-m", "init"], { cwd: repo });
  return repo;
}

function mockRegistry() {
  return {
    pullRaw: vi.fn(async (slug: string) => {
      if (slug === "templates/kickoff.md.tmpl") return KICKOFF_TMPL;
      if (slug === "templates/sp-done.md.tmpl") return SP_DONE_TMPL;
      throw new Error(`unknown slug: ${slug}`);
    })
  };
}

describe("huntCommand — happy path", () => {
  it("creates branches + worktrees + kickoff.md + sp-done.md + wave-status.md", async () => {
    const repo = initProject();
    try {
      const registry = mockRegistry();
      await huntCommand(repo, "feat-auth", { registry: registry as never });

      const waveStatus = readFileSync(join(repo, "docs/matilha/waves/wave-01-status.md"), "utf-8");
      expect(waveStatus).toContain("SP1");
      expect(waveStatus).toContain("SP2");

      const wt1 = join(dirname(repo), "test-sp-database-schema");
      const wt2 = join(dirname(repo), "test-sp-session-tokens");
      expect(existsSync(join(wt1, "kickoff.md"))).toBe(true);
      expect(existsSync(join(wt2, "kickoff.md"))).toBe(true);
      expect(existsSync(join(wt1, "SP-DONE.md"))).toBe(true);

      const branches = execFileSync("git", ["branch"], { cwd: repo, encoding: "utf-8" });
      expect(branches).toContain("wave-01-sp-database-schema");
      expect(branches).toContain("wave-01-sp-session-tokens");
    } finally { rmSync(dirname(repo), { recursive: true, force: true }); }
  });
});

describe("huntCommand — error paths", () => {
  it("throws MatilhaUserError when current_phase < 30", async () => {
    const repo = initProject();
    const altStatus = PROJECT_STATUS.replace("current_phase: 30", "current_phase: 10");
    writeFileSync(join(repo, "project-status.md"), altStatus);
    try {
      const registry = mockRegistry();
      await expect(huntCommand(repo, "feat-auth", { registry: registry as never })).rejects.toThrow(MatilhaUserError);
    } finally { rmSync(dirname(repo), { recursive: true, force: true }); }
  });

  it("throws MatilhaUserError on disjunction violation without --allow-overlap", async () => {
    const repo = initProject();
    const overlapPlan = PLAN_MD.replace("src/auth.ts", "migrations/001.sql");
    writeFileSync(join(repo, "docs/matilha/plans/feat-auth-plan.md"), overlapPlan);
    try {
      const registry = mockRegistry();
      await expect(huntCommand(repo, "feat-auth", { registry: registry as never })).rejects.toThrow(MatilhaUserError);
    } finally { rmSync(dirname(repo), { recursive: true, force: true }); }
  });

  it("throws MatilhaUserError on uncommitted changes", async () => {
    const repo = initProject();
    writeFileSync(join(repo, "dirty.txt"), "x");
    try {
      const registry = mockRegistry();
      await expect(huntCommand(repo, "feat-auth", { registry: registry as never })).rejects.toThrow(MatilhaUserError);
    } finally { rmSync(dirname(repo), { recursive: true, force: true }); }
  });

  it("--dry-run does not mutate git or create worktrees", async () => {
    const repo = initProject();
    try {
      const registry = mockRegistry();
      await huntCommand(repo, "feat-auth", { registry: registry as never, dryRun: true });
      expect(existsSync(join(dirname(repo), "test-sp-database-schema"))).toBe(false);
      expect(existsSync(join(repo, "docs/matilha/waves/wave-01-status.md"))).toBe(false);
      const branches = execFileSync("git", ["branch"], { cwd: repo, encoding: "utf-8" });
      expect(branches).not.toContain("wave-01-sp-database-schema");
    } finally { rmSync(dirname(repo), { recursive: true, force: true }); }
  });
});
