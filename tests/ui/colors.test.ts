import { describe, it, expect } from "vitest";
import { colors } from "../../src/ui/colors";

describe("colors()", () => {
  it("returns pc identity when no env overrides set", async () => {
    const { default: pc } = await import("picocolors");
    const originalNo = process.env.NO_COLOR;
    const originalAscii = process.env.MATILHA_ASCII;
    delete process.env.NO_COLOR;
    delete process.env.MATILHA_ASCII;
    try {
      // colors() returns pc unchanged (reference equality) when no overrides are set
      expect(colors()).toBe(pc);
    } finally {
      if (originalNo === undefined) delete process.env.NO_COLOR;
      else process.env.NO_COLOR = originalNo;
      if (originalAscii === undefined) delete process.env.MATILHA_ASCII;
      else process.env.MATILHA_ASCII = originalAscii;
    }
  });

  it("strips ANSI when NO_COLOR=1 (even with FORCE_COLOR=1)", () => {
    const originalNo = process.env.NO_COLOR;
    const originalForce = process.env.FORCE_COLOR;
    process.env.FORCE_COLOR = "1";
    process.env.NO_COLOR = "1";
    try {
      const c = colors();
      const out = c.red("x");
      // eslint-disable-next-line no-control-regex
      expect(out).not.toMatch(/\u001b\[/);
      expect(out).toContain("x");
    } finally {
      if (originalNo === undefined) delete process.env.NO_COLOR;
      else process.env.NO_COLOR = originalNo;
      if (originalForce === undefined) delete process.env.FORCE_COLOR;
      else process.env.FORCE_COLOR = originalForce;
    }
  });

  it("strips ANSI when MATILHA_ASCII=1 (even with FORCE_COLOR=1)", () => {
    const originalAscii = process.env.MATILHA_ASCII;
    const originalForce = process.env.FORCE_COLOR;
    process.env.FORCE_COLOR = "1";
    process.env.MATILHA_ASCII = "1";
    try {
      const c = colors();
      const out = c.bold("y");
      // eslint-disable-next-line no-control-regex
      expect(out).not.toMatch(/\u001b\[/);
      expect(out).toContain("y");
    } finally {
      if (originalAscii === undefined) delete process.env.MATILHA_ASCII;
      else process.env.MATILHA_ASCII = originalAscii;
      if (originalForce === undefined) delete process.env.FORCE_COLOR;
      else process.env.FORCE_COLOR = originalForce;
    }
  });
});
