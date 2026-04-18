// tests/hunt/kickoffRenderer.test.ts
import { describe, it, expect } from "vitest";
import { renderKickoff, renderSPDone } from "../../src/hunt/kickoffRenderer";
import type { ParsedSP } from "../../src/hunt/planParser";

const sampleSP: ParsedSP = {
  id: "SP1",
  title: "Database schema for users",
  description: "Sets up the initial users table.",
  touches: ["migrations/001_users.sql", "src/db/schema.ts"],
  acceptance: ["users table created", "migration runs clean"],
  tests: ["tests/db/schema.test.ts"]
};

const TEMPLATE = `# Kickoff — {{feature_slug}} / wave-{{wave_num_padded}} / {{sp_id}}

**{{sp_title}}**
{{sp_description}}

### Acceptance
{{acceptance_checklist}}

### Touches
{{touches_list}}

### Tests
{{tests_list}}

{{#if superpowers_detected}}
superpowers path
{{else}}
standalone path
{{/if}}
`;

describe("renderKickoff", () => {
  it("fills feature_slug, wave_num_padded, sp_id, sp_title, sp_description", () => {
    const out = renderKickoff(TEMPLATE, {
      feature_slug: "feat-auth",
      wave_num: 1,
      wave_id: "w1",
      sp: sampleSP,
      worktree_path: "/tmp/wt",
      branch_name: "wave-01-sp-db",
      main_repo_path: "/repo",
      superpowers_detected: false
    });
    expect(out).toContain("feat-auth");
    expect(out).toContain("wave-01");
    expect(out).toContain("SP1");
    expect(out).toContain("Database schema for users");
    expect(out).toContain("Sets up the initial users table.");
  });

  it("renders acceptance as checkbox list", () => {
    const out = renderKickoff(TEMPLATE, {
      feature_slug: "f", wave_num: 1, wave_id: "w1", sp: sampleSP,
      worktree_path: "x", branch_name: "b", main_repo_path: "r", superpowers_detected: false
    });
    expect(out).toContain("- [ ] users table created");
    expect(out).toContain("- [ ] migration runs clean");
  });

  it("renders touches as bullet list", () => {
    const out = renderKickoff(TEMPLATE, {
      feature_slug: "f", wave_num: 1, wave_id: "w1", sp: sampleSP,
      worktree_path: "x", branch_name: "b", main_repo_path: "r", superpowers_detected: false
    });
    expect(out).toContain("- migrations/001_users.sql");
    expect(out).toContain("- src/db/schema.ts");
  });

  it("includes superpowers block when detected", () => {
    const out = renderKickoff(TEMPLATE, {
      feature_slug: "f", wave_num: 1, wave_id: "w1", sp: sampleSP,
      worktree_path: "x", branch_name: "b", main_repo_path: "r", superpowers_detected: true
    });
    expect(out).toContain("superpowers path");
    expect(out).not.toContain("standalone path");
  });

  it("includes standalone block when superpowers absent", () => {
    const out = renderKickoff(TEMPLATE, {
      feature_slug: "f", wave_num: 1, wave_id: "w1", sp: sampleSP,
      worktree_path: "x", branch_name: "b", main_repo_path: "r", superpowers_detected: false
    });
    expect(out).toContain("standalone path");
    expect(out).not.toContain("superpowers path");
  });

  it("pads wave_num to 2 digits", () => {
    const out = renderKickoff(TEMPLATE, {
      feature_slug: "f", wave_num: 7, wave_id: "w7", sp: sampleSP,
      worktree_path: "x", branch_name: "b", main_repo_path: "r", superpowers_detected: false
    });
    expect(out).toContain("wave-07");
  });

  it("renders _(none)_ when sp.tests is empty", () => {
    const out = renderKickoff(TEMPLATE, {
      feature_slug: "f", wave_num: 1, wave_id: "w1",
      sp: { ...sampleSP, tests: [] },
      worktree_path: "x", branch_name: "b", main_repo_path: "r", superpowers_detected: false
    });
    expect(out).toContain("_(none)_");
  });

  it("does not reinject mustache patterns from substituted values", () => {
    const out = renderKickoff(TEMPLATE, {
      feature_slug: "f", wave_num: 1, wave_id: "w1",
      sp: { ...sampleSP, description: "mentions {{sp_id}} literally" },
      worktree_path: "x", branch_name: "b", main_repo_path: "r", superpowers_detected: false
    });
    expect(out).toContain("mentions {{sp_id}} literally");
  });
});

describe("renderSPDone", () => {
  it("fills sp_id / feature / wave placeholders in frontmatter", () => {
    const tpl = `---
type: sp-done
sp_id: {{sp_id}}
feature: {{feature_slug}}
wave: {{wave_id}}
---
# SP-DONE — {{sp_id}} / {{feature_slug}}
`;
    const out = renderSPDone(tpl, { feature_slug: "feat-auth", wave_id: "w1", sp_id: "SP1" });
    expect(out).toContain("sp_id: SP1");
    expect(out).toContain("feature: feat-auth");
    expect(out).toContain("wave: w1");
    expect(out).toContain("# SP-DONE — SP1 / feat-auth");
  });
});
