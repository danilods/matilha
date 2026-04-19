// tests/gather/waveStatusReader.test.ts
import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { readWaveStatus } from "../../src/gather/waveStatusReader";
import { MatilhaUserError } from "../../src/ui/errorFormat";

const VALID_WAVE_STATUS = `---
wave: w1
created: "2026-04-19T00:00:00Z"
started: null
ended: null
status: pending
plan: docs/matilha/plans/feat-auth-plan.md
sps:
  SP1:
    branch: wave-01-sp-database-schema
    worktree: ../matilha-sp-database-schema
    status: pending
    started: null
    session_id: null
  SP2:
    branch: wave-01-sp-session-tokens
    worktree: ../matilha-sp-session-tokens
    status: pending
    started: null
    session_id: null
merge_order:
  - SP1
  - SP2
regression_status: pending
review_report: null
---

# Wave 01 Status — feat-auth
`;

function setup(): string {
  const root = mkdtempSync(join(tmpdir(), "matilha-gather-wsr-"));
  mkdirSync(join(root, "docs/matilha/waves"), { recursive: true });
  return root;
}

describe("readWaveStatus", () => {
  it("parses a valid wave-01-status.md and returns { wave, absPath }", () => {
    const root = setup();
    try {
      const path = join(root, "docs/matilha/waves/wave-01-status.md");
      writeFileSync(path, VALID_WAVE_STATUS, "utf-8");
      const result = readWaveStatus(root, 1);
      expect(result.absPath).toBe(path);
      expect(result.wave.wave).toBe("w1");
      expect(result.wave.sps.SP1!.branch).toBe("wave-01-sp-database-schema");
      expect(result.wave.merge_order).toEqual(["SP1", "SP2"]);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it("throws MatilhaUserError when wave-NN-status.md is missing", () => {
    const root = setup();
    try {
      expect(() => readWaveStatus(root, 1)).toThrow(MatilhaUserError);
      try {
        readWaveStatus(root, 1);
      } catch (e) {
        if (!(e instanceof MatilhaUserError)) throw e;
        expect(e.matilhaError.summary).toContain("wave-01-status.md");
        expect(e.matilhaError.nextActions.some((a) => a.includes("matilha hunt"))).toBe(true);
      }
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it("throws MatilhaUserError when frontmatter is missing", () => {
    const root = setup();
    try {
      const path = join(root, "docs/matilha/waves/wave-01-status.md");
      writeFileSync(path, "# body only, no frontmatter\n", "utf-8");
      expect(() => readWaveStatus(root, 1)).toThrow(MatilhaUserError);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it("throws MatilhaUserError when schema is invalid (missing required field)", () => {
    const root = setup();
    try {
      const path = join(root, "docs/matilha/waves/wave-01-status.md");
      writeFileSync(path, `---\nwave: w1\n---\n# bad\n`, "utf-8");
      expect(() => readWaveStatus(root, 1)).toThrow(MatilhaUserError);
      try {
        readWaveStatus(root, 1);
      } catch (e) {
        if (!(e instanceof MatilhaUserError)) throw e;
        expect(e.matilhaError.summary).toContain("invalid frontmatter");
      }
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it("pads the wave number to 2 digits when constructing the filename (7 → wave-07)", () => {
    const root = setup();
    try {
      const path = join(root, "docs/matilha/waves/wave-07-status.md");
      writeFileSync(path, VALID_WAVE_STATUS.replace("wave: w1", "wave: w7"), "utf-8");
      const result = readWaveStatus(root, 7);
      expect(result.absPath).toContain("wave-07-status.md");
      expect(result.wave.wave).toBe("w7");
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
});
