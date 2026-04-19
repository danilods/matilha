// tests/hunt/dispatcher.test.ts
import { describe, it, expect } from "vitest";
import { PrintDispatcher, type DispatchContext } from "../../src/hunt/dispatcher";
import type { ParsedSP } from "../../src/hunt/planParser";

const sp: ParsedSP = {
  id: "SP1",
  title: "t",
  description: "",
  touches: ["x.ts"],
  acceptance: ["a"],
  tests: []
};

describe("PrintDispatcher", () => {
  it("produces a cd + editor command referencing the worktree and kickoff path", async () => {
    const d = new PrintDispatcher();
    const ctx: DispatchContext = {
      sp,
      worktreePath: "/tmp/sp-foo",
      branchName: "wave-01-sp-foo",
      kickoffPath: "/tmp/sp-foo/kickoff.md",
      companions: { superpowers: false }
    };
    const report = await d.dispatch(ctx);
    expect(report.sp_id).toBe("SP1");
    expect(report.command).toContain("/tmp/sp-foo");
    expect(report.command).toContain("kickoff.md");
    expect(report.session_id).toBeNull();
  });

  it("returns a report for every dispatch (no exceptions in print path)", async () => {
    const d = new PrintDispatcher();
    const report = await d.dispatch({
      sp, worktreePath: "a", branchName: "b", kickoffPath: "a/kickoff.md", companions: { superpowers: true }
    });
    expect(report).toBeDefined();
    expect(report.session_id).toBeNull();
  });
});
