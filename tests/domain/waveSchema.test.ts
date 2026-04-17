import { describe, it, expect } from "vitest";
import { waveSchema } from "../../src/domain/waveSchema";

describe("waveSchema", () => {
  it("accepts valid wave status in progress", () => {
    const valid = {
      wave: "w2",
      created: "2026-04-17T14:00:00Z",
      started: "2026-04-17T14:05:00Z",
      ended: null,
      status: "in_progress",
      plan: "docs/matilha/plans/auth-plan.md",
      sps: {
        SP1: {
          branch: "matilha/w2/sp1-login-ui",
          worktree: "../w2-sp1-login-ui",
          status: "in_progress",
          started: "2026-04-17T14:10:00Z",
          session_id: null
        }
      },
      merge_order: ["SP1"],
      regression_status: "pending",
      review_report: null
    };

    const result = waveSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("rejects sp status outside enum", () => {
    const invalid = {
      wave: "w1",
      created: "2026-04-17T14:00:00Z",
      started: null,
      ended: null,
      status: "pending",
      plan: "docs/matilha/plans/x.md",
      sps: {
        SP1: {
          branch: "matilha/w1/sp1",
          worktree: "../w1-sp1",
          status: "bogus",
          started: null,
          session_id: null
        }
      },
      merge_order: ["SP1"],
      regression_status: "pending",
      review_report: null
    };

    const result = waveSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects merge_order with SP not in sps", () => {
    const invalid = {
      wave: "w1",
      created: "2026-04-17T14:00:00Z",
      started: null,
      ended: null,
      status: "pending",
      plan: "docs/matilha/plans/x.md",
      sps: {
        SP1: {
          branch: "matilha/w1/sp1",
          worktree: "../w1-sp1",
          status: "pending",
          started: null,
          session_id: null
        }
      },
      merge_order: ["SP1", "SP99"],
      regression_status: "pending",
      review_report: null
    };

    const result = waveSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});
