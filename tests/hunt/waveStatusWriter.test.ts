// tests/hunt/waveStatusWriter.test.ts
import { describe, it, expect } from "vitest";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { writeWaveStatus } from "../../src/hunt/waveStatusWriter";
import { parse as parseYaml } from "yaml";
import { waveSchema, type Wave } from "../../src/domain/waveSchema";

describe("writeWaveStatus", () => {
  it("writes valid YAML frontmatter conforming to waveSchema", () => {
    const dir = mkdtempSync(join(tmpdir(), "matilha-wsw-"));
    try {
      const wave: Wave = {
        wave: "w1",
        created: "2026-04-20T12:00:00Z",
        started: null,
        ended: null,
        status: "pending",
        plan: "docs/matilha/plans/feat-auth-plan.md",
        sps: {
          SP1: { branch: "wave-01-sp-db", worktree: "../matilha-sp-db", status: "pending", started: null, session_id: null },
          SP2: { branch: "wave-01-sp-tok", worktree: "../matilha-sp-tok", status: "pending", started: null, session_id: null }
        },
        merge_order: ["SP1", "SP2"],
        regression_status: "pending",
        review_report: null
      };
      const outPath = writeWaveStatus(dir, wave, "feat-auth");
      expect(outPath).toContain("docs/matilha/waves/wave-01-status.md");
      const content = readFileSync(outPath, "utf-8");
      const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
      expect(fmMatch).toBeDefined();
      const fm = waveSchema.parse(parseYaml(fmMatch![1]));
      expect(fm.wave).toBe("w1");
      expect(fm.sps.SP1.branch).toBe("wave-01-sp-db");
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  it("includes human-readable markdown body after frontmatter", () => {
    const dir = mkdtempSync(join(tmpdir(), "matilha-wsw-"));
    try {
      const wave: Wave = {
        wave: "w2", created: "2026-04-20T00:00:00Z", started: null, ended: null,
        status: "pending", plan: "docs/plans/x.md",
        sps: { SP1: { branch: "b", worktree: "w", status: "pending", started: null, session_id: null } },
        merge_order: ["SP1"], regression_status: "pending", review_report: null
      };
      const outPath = writeWaveStatus(dir, wave, "x");
      const content = readFileSync(outPath, "utf-8");
      expect(content).toContain("# Wave 02 Status");
      expect(content).toContain("SP1");
      expect(content).toContain("Merge order");
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  it("pads wave number to 2 digits in filename", () => {
    const dir = mkdtempSync(join(tmpdir(), "matilha-wsw-"));
    try {
      const wave: Wave = {
        wave: "w7", created: "2026-04-20T00:00:00Z", started: null, ended: null,
        status: "pending", plan: "p",
        sps: { SP1: { branch: "b", worktree: "w", status: "pending", started: null, session_id: null } },
        merge_order: ["SP1"], regression_status: "pending", review_report: null
      };
      const outPath = writeWaveStatus(dir, wave, "x");
      expect(outPath).toContain("wave-07-status.md");
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
});
