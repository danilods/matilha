import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
  translateZodError,
  translateFsError,
  translateUnknownError
} from "../../src/ui/errorTranslator";

describe("translateZodError", () => {
  it("converts missing-field (undefined) error to 'is missing' summary with field name", () => {
    const schema = z.object({ waves: z.object({}) });
    try {
      schema.parse({});
      throw new Error("should have thrown");
    } catch (e) {
      if (!(e instanceof z.ZodError)) throw e;
      const me = translateZodError(e, {
        context: "matilha hunt read docs/matilha/plans/feat-auth.md",
        file: "docs/matilha/plans/feat-auth.md"
      });
      expect(me.summary.toLowerCase()).toMatch(/missing/);
      expect(me.summary).toContain("waves");
      expect(me.problem).toContain("waves");
      expect(me.nextActions.length).toBeGreaterThan(0);
      expect(me.context).toContain("hunt");
    }
  });

  it("converts invalid-type (wrong type, not undefined) error to 'invalid' summary", () => {
    const schema = z.object({ n: z.number() });
    try {
      schema.parse({ n: "not a number" });
      throw new Error("should have thrown");
    } catch (e) {
      if (!(e instanceof z.ZodError)) throw e;
      const me = translateZodError(e, {
        context: "validating input",
        file: "x.md"
      });
      expect(me.summary.toLowerCase()).toMatch(/invalid/);
      expect(me.problem).toContain("n");
    }
  });
});

describe("translateFsError", () => {
  it("converts ENOENT to not-found with path", () => {
    const e = Object.assign(new Error("ENOENT: no such file"), {
      code: "ENOENT",
      path: "/missing.md"
    }) as NodeJS.ErrnoException;
    const me = translateFsError(e, {
      context: "matilha hunt was reading the plan file",
      resource: "plan"
    });
    expect(me.summary.toLowerCase()).toMatch(/not found/);
    expect(me.problem).toContain("/missing.md");
    // resource === "plan" triggers the plan-specific next-step
    expect(me.nextActions.some((a) => a.includes("matilha plan"))).toBe(true);
  });

  it("converts EACCES to permission-denied with write-permission hint", () => {
    const e = Object.assign(new Error("EACCES: permission denied"), {
      code: "EACCES",
      path: "/protected/x.md"
    }) as NodeJS.ErrnoException;
    const me = translateFsError(e, {
      context: "matilha plan was writing the spec",
      resource: "spec"
    });
    expect(me.summary.toLowerCase()).toMatch(/permission/);
    expect(me.nextActions.some((a) => a.toLowerCase().includes("write") || a.toLowerCase().includes("permission"))).toBe(true);
  });
});

describe("translateUnknownError", () => {
  it("wraps arbitrary Error with generic fallback preserving the message + --debug hint", () => {
    const e = new Error("something broke");
    const me = translateUnknownError(e, {
      context: "unknown phase of matilha init"
    });
    expect(me.summary.toLowerCase()).toMatch(/unexpected/);
    expect(me.problem).toContain("something broke");
    expect(me.nextActions.some((a) => a.includes("--debug"))).toBe(true);
  });
});
