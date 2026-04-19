import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { resolvePlanPath } from "../../src/hunt/planPathResolver";
import { MatilhaUserError } from "../../src/ui/errorFormat";

function setup() {
  const root = mkdtempSync(join(tmpdir(), "matilha-hunt-resolve-"));
  return root;
}

describe("resolvePlanPath", () => {
  it("resolves bare slug to docs/matilha/plans/<slug>-plan.md", () => {
    const root = setup();
    try {
      mkdirSync(join(root, "docs/matilha/plans"), { recursive: true });
      writeFileSync(join(root, "docs/matilha/plans/feat-auth-plan.md"), "# plan\n");
      const resolved = resolvePlanPath(root, "feat-auth");
      expect(resolved).toBe(join(root, "docs/matilha/plans/feat-auth-plan.md"));
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it("accepts date-prefixed filename (2026-04-20-feat-auth-plan.md)", () => {
    const root = setup();
    try {
      mkdirSync(join(root, "docs/matilha/plans"), { recursive: true });
      writeFileSync(join(root, "docs/matilha/plans/2026-04-20-feat-auth-plan.md"), "# plan\n");
      const resolved = resolvePlanPath(root, "feat-auth");
      expect(resolved).toContain("feat-auth-plan.md");
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it("throws MatilhaUserError when plan not found (5-rule format)", () => {
    const root = setup();
    try {
      expect(() => resolvePlanPath(root, "missing")).toThrow(MatilhaUserError);
      try {
        resolvePlanPath(root, "missing");
      } catch (e) {
        if (!(e instanceof MatilhaUserError)) throw e;
        expect(e.matilhaError.nextActions.some((a) => a.includes("matilha plan"))).toBe(true);
      }
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it("prefers docs/matilha/plans/ over docs/superpowers/plans/ when both exist", () => {
    const root = setup();
    try {
      mkdirSync(join(root, "docs/matilha/plans"), { recursive: true });
      mkdirSync(join(root, "docs/superpowers/plans"), { recursive: true });
      writeFileSync(join(root, "docs/matilha/plans/feat-auth-plan.md"), "matilha\n");
      writeFileSync(join(root, "docs/superpowers/plans/feat-auth-plan.md"), "superpowers\n");
      const resolved = resolvePlanPath(root, "feat-auth");
      expect(resolved).toContain("docs/matilha/plans");
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it("falls back to docs/superpowers/plans/ when matilha missing", () => {
    const root = setup();
    try {
      mkdirSync(join(root, "docs/superpowers/plans"), { recursive: true });
      writeFileSync(join(root, "docs/superpowers/plans/feat-auth-plan.md"), "sp\n");
      const resolved = resolvePlanPath(root, "feat-auth");
      expect(resolved).toContain("docs/superpowers/plans");
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
});
