import { describe, it, expect } from "vitest";
import { renderGate } from "../../src/ui/gateStatus";

function strip(s: string): string {
  return s.replace(/\u001b\[[0-9;]*m/g, "");
}

describe("renderGate", () => {
  it("renders 'yes' label with name", () => {
    const out = renderGate("problem_defined", "yes");
    expect(strip(out)).toContain("[yes]");
    expect(strip(out)).toContain("problem_defined");
  });

  it("renders 'pending' label with name", () => {
    const out = renderGate("target_user_clear", "pending");
    expect(strip(out)).toContain("[pending]");
    expect(strip(out)).toContain("target_user_clear");
  });

  it("renders 'no' label with name", () => {
    const out = renderGate("risks_listed", "no");
    expect(strip(out)).toContain("[no]");
    expect(strip(out)).toContain("risks_listed");
  });

  it("keeps label + name alignment consistent across widths", () => {
    const yes = strip(renderGate("x", "yes"));
    const pending = strip(renderGate("x", "pending"));
    // Both names should appear at the same column (after padded label)
    const yesNameIdx = yes.indexOf("x", 3);
    const pendingNameIdx = pending.indexOf("x", 3);
    expect(yesNameIdx).toBe(pendingNameIdx);
  });

  it("text label always present even under NO_COLOR + FORCE_COLOR (no color-only signal)", () => {
    const originalNo = process.env.NO_COLOR;
    const originalForce = process.env.FORCE_COLOR;
    process.env.FORCE_COLOR = "1";
    process.env.NO_COLOR = "1";
    try {
      const out = renderGate("x", "yes");
      // Under NO_COLOR+FORCE_COLOR, output must have no ANSI AND still contain "[yes]"
      // eslint-disable-next-line no-control-regex
      expect(out).not.toMatch(/\u001b\[/);
      expect(out).toContain("[yes]");
    } finally {
      if (originalNo === undefined) delete process.env.NO_COLOR;
      else process.env.NO_COLOR = originalNo;
      if (originalForce === undefined) delete process.env.FORCE_COLOR;
      else process.env.FORCE_COLOR = originalForce;
    }
  });
});
