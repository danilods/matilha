import { describe, it, expect } from "vitest";
import { validateDisjunction } from "../../src/hunt/disjunctionValidator";
import type { ParsedSP } from "../../src/hunt/planParser";

function sp(id: string, touches: string[]): ParsedSP {
  return { id, title: `t${id}`, description: "", touches, acceptance: ["a"], tests: [] };
}

describe("validateDisjunction", () => {
  it("no violations when all files disjoint", () => {
    const result = validateDisjunction([
      sp("SP1", ["src/a.ts"]),
      sp("SP2", ["src/b.ts"]),
      sp("SP3", ["src/c.ts"])
    ]);
    expect(result.violations).toHaveLength(0);
  });

  it("detects single-file overlap between two SPs", () => {
    const result = validateDisjunction([
      sp("SP1", ["src/auth.ts"]),
      sp("SP2", ["src/auth.ts"])
    ]);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].file).toBe("src/auth.ts");
    expect(result.violations[0].sps).toEqual(["SP1", "SP2"]);
  });

  it("detects multi-file overlap with separate violation entries", () => {
    const result = validateDisjunction([
      sp("SP1", ["src/a.ts", "src/b.ts"]),
      sp("SP2", ["src/a.ts", "src/b.ts"])
    ]);
    expect(result.violations).toHaveLength(2);
    expect(result.violations.map((v) => v.file).sort()).toEqual(["src/a.ts", "src/b.ts"]);
  });

  it("detects 3-way overlap (same file touched by 3 SPs)", () => {
    const result = validateDisjunction([
      sp("SP1", ["src/x.ts"]),
      sp("SP2", ["src/x.ts"]),
      sp("SP3", ["src/x.ts"])
    ]);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].sps.sort()).toEqual(["SP1", "SP2", "SP3"]);
  });

  it("treats globs as literal strings (Wave 3a conservative)", () => {
    const result = validateDisjunction([
      sp("SP1", ["src/auth/**/*.ts"]),
      sp("SP2", ["src/auth/**/*.ts"])
    ]);
    expect(result.violations).toHaveLength(1);
  });

  it("no violations for single SP (trivially disjoint)", () => {
    const result = validateDisjunction([sp("SP1", ["src/a.ts"])]);
    expect(result.violations).toHaveLength(0);
  });

  it("format() produces 5-rule error payload when violations present", () => {
    const result = validateDisjunction([
      sp("SP1", ["src/auth.ts"]),
      sp("SP2", ["src/auth.ts"])
    ]);
    const err = result.toError("w1");
    expect(err).not.toBeNull();
    expect(err!.summary.toLowerCase()).toMatch(/disjunction|overlap/);
    expect(err!.problem).toContain("src/auth.ts");
    expect(err!.nextActions.length).toBeGreaterThan(0);
    expect(err!.nextActions.some((a) => a.includes("--allow-overlap"))).toBe(true);
  });

  it("format() returns null when no violations", () => {
    const result = validateDisjunction([sp("SP1", ["a.ts"]), sp("SP2", ["b.ts"])]);
    expect(result.toError("w1")).toBeNull();
  });
});
