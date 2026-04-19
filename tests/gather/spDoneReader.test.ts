// tests/gather/spDoneReader.test.ts
import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { readAndValidateSPDone } from "../../src/gather/spDoneReader";
import { MatilhaUserError } from "../../src/ui/errorFormat";

const VALID_SP_DONE = `---
type: sp-done
sp_id: SP1
feature: feat-auth
wave: w1
status: completed
completed_at: "2026-04-19T12:00:00Z"
commits:
  - abc123
  - def456
tests:
  passed: true
  count: 5
---

# SP-DONE — SP1 / feat-auth

Body content — not validated.
`;

function setup(): string {
  return mkdtempSync(join(tmpdir(), "matilha-gather-spd-"));
}

const EXPECTED = { sp_id: "SP1", feature: "feat-auth", wave: "w1" };

describe("readAndValidateSPDone — happy path", () => {
  it("returns parsed SPDone when all gates pass", () => {
    const worktree = setup();
    try {
      writeFileSync(join(worktree, "SP-DONE.md"), VALID_SP_DONE, "utf-8");
      const result = readAndValidateSPDone(worktree, EXPECTED);
      expect(result.status).toBe("completed");
      expect(result.tests.passed).toBe(true);
      expect(result.tests.count).toBe(5);
      expect(result.commits).toEqual(["abc123", "def456"]);
    } finally { rmSync(worktree, { recursive: true, force: true }); }
  });
});

describe("readAndValidateSPDone — strict gate violations", () => {
  it("throws when SP-DONE.md is missing", () => {
    const worktree = setup();
    try {
      expect(() => readAndValidateSPDone(worktree, EXPECTED)).toThrow(MatilhaUserError);
      try { readAndValidateSPDone(worktree, EXPECTED); } catch (e) {
        if (!(e instanceof MatilhaUserError)) throw e;
        expect(e.matilhaError.summary).toContain("SP-DONE.md");
      }
    } finally { rmSync(worktree, { recursive: true, force: true }); }
  });

  it("throws when frontmatter is missing", () => {
    const worktree = setup();
    try {
      writeFileSync(join(worktree, "SP-DONE.md"), "# body only\n", "utf-8");
      expect(() => readAndValidateSPDone(worktree, EXPECTED)).toThrow(MatilhaUserError);
    } finally { rmSync(worktree, { recursive: true, force: true }); }
  });

  it("throws when status is 'pending'", () => {
    const worktree = setup();
    try {
      const bad = VALID_SP_DONE.replace("status: completed", "status: pending");
      writeFileSync(join(worktree, "SP-DONE.md"), bad, "utf-8");
      expect(() => readAndValidateSPDone(worktree, EXPECTED)).toThrow(MatilhaUserError);
      try { readAndValidateSPDone(worktree, EXPECTED); } catch (e) {
        if (!(e instanceof MatilhaUserError)) throw e;
        expect(e.matilhaError.problem).toContain("pending");
      }
    } finally { rmSync(worktree, { recursive: true, force: true }); }
  });

  it("throws when tests.passed is false", () => {
    const worktree = setup();
    try {
      const bad = VALID_SP_DONE.replace("passed: true", "passed: false");
      writeFileSync(join(worktree, "SP-DONE.md"), bad, "utf-8");
      expect(() => readAndValidateSPDone(worktree, EXPECTED)).toThrow(MatilhaUserError);
    } finally { rmSync(worktree, { recursive: true, force: true }); }
  });

  it("throws when commits array is empty", () => {
    const worktree = setup();
    try {
      const bad = VALID_SP_DONE.replace(/commits:\n  - abc123\n  - def456/, "commits: []");
      writeFileSync(join(worktree, "SP-DONE.md"), bad, "utf-8");
      expect(() => readAndValidateSPDone(worktree, EXPECTED)).toThrow(MatilhaUserError);
    } finally { rmSync(worktree, { recursive: true, force: true }); }
  });

  it("throws when completed_at is null", () => {
    const worktree = setup();
    try {
      const bad = VALID_SP_DONE.replace(`completed_at: "2026-04-19T12:00:00Z"`, "completed_at: null");
      writeFileSync(join(worktree, "SP-DONE.md"), bad, "utf-8");
      expect(() => readAndValidateSPDone(worktree, EXPECTED)).toThrow(MatilhaUserError);
    } finally { rmSync(worktree, { recursive: true, force: true }); }
  });

  it("throws when sp_id does not match expected", () => {
    const worktree = setup();
    try {
      writeFileSync(join(worktree, "SP-DONE.md"), VALID_SP_DONE, "utf-8");
      expect(() => readAndValidateSPDone(worktree, { sp_id: "SP2", feature: "feat-auth", wave: "w1" }))
        .toThrow(MatilhaUserError);
    } finally { rmSync(worktree, { recursive: true, force: true }); }
  });

  it("throws when feature does not match expected", () => {
    const worktree = setup();
    try {
      writeFileSync(join(worktree, "SP-DONE.md"), VALID_SP_DONE, "utf-8");
      expect(() => readAndValidateSPDone(worktree, { sp_id: "SP1", feature: "other-feature", wave: "w1" }))
        .toThrow(MatilhaUserError);
    } finally { rmSync(worktree, { recursive: true, force: true }); }
  });

  it("throws when tests.count is zero", () => {
    const worktree = setup();
    try {
      const bad = VALID_SP_DONE.replace("count: 5", "count: 0");
      writeFileSync(join(worktree, "SP-DONE.md"), bad, "utf-8");
      expect(() => readAndValidateSPDone(worktree, EXPECTED)).toThrow(MatilhaUserError);
    } finally { rmSync(worktree, { recursive: true, force: true }); }
  });
});
