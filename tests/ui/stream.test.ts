import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createStream } from "../../src/ui/stream";

describe("stream", () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>;
  let captured: string[];

  beforeEach(() => {
    captured = [];
    stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation((chunk: unknown) => {
      captured.push(String(chunk));
      return true;
    });
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
  });

  it("emits a header via intro()", () => {
    const s = createStream();
    s.intro("matilha init", "bootstrap a Matilha project");
    const out = captured.join("");
    expect(out).toContain("matilha init");
    expect(out).toContain("bootstrap a Matilha project");
  });

  it("emits a section label", () => {
    const s = createStream();
    s.section("creating branches + worktrees:");
    expect(captured.join("")).toContain("creating branches + worktrees:");
  });

  it("step().ok() emits label + ok status", () => {
    const s = createStream();
    const h = s.step("fetching templates");
    h.ok("6 templates");
    const out = captured.join("");
    expect(out).toContain("fetching templates");
    expect(out).toContain("ok");
    expect(out).toContain("6 templates");
  });

  it("step().fail() emits label + fail status + detail", () => {
    const s = createStream();
    s.step("validating disjunction").fail("overlap at src/auth.ts");
    const out = captured.join("");
    expect(out).toContain("fail");
    expect(out).toContain("overlap at src/auth.ts");
  });

  it("supports all 5 status types: ok, warn, fail, skip, dry-run", () => {
    const s = createStream();
    s.step("one").ok();
    s.step("two").warn();
    s.step("three").fail();
    s.step("four").skip();
    s.step("five").dryRun();
    const out = captured.join("");
    expect(out).toContain("ok");
    expect(out).toContain("warn");
    expect(out).toContain("fail");
    expect(out).toContain("skip");
    expect(out).toContain("dry-run");
  });

  it("footer() emits bookend text", () => {
    const s = createStream();
    s.footer("matilha is ready. next: run 'matilha scout'");
    expect(captured.join("")).toContain("matilha is ready");
  });

  it("respects NO_COLOR (no ansi escapes, but text labels still present)", () => {
    const originalNo = process.env.NO_COLOR;
    const originalForce = process.env.FORCE_COLOR;
    process.env.FORCE_COLOR = "1";
    process.env.NO_COLOR = "1";
    try {
      const s = createStream();
      s.step("one").ok("detail");
      const out = captured.join("");
      // eslint-disable-next-line no-control-regex
      expect(out).not.toMatch(/\u001b\[/);
      expect(out).toContain("ok"); // text label still present
    } finally {
      if (originalNo === undefined) delete process.env.NO_COLOR;
      else process.env.NO_COLOR = originalNo;
      if (originalForce === undefined) delete process.env.FORCE_COLOR;
      else process.env.FORCE_COLOR = originalForce;
    }
  });

  it("step emits label and status on the SAME line", () => {
    const s = createStream();
    s.step("fetching templates").ok();
    const out = captured.join("");
    // Find the line containing both the label and the status
    const lines = out.split("\n");
    const line = lines.find((l) => l.includes("fetching templates"));
    expect(line).toBeDefined();
    // Strip ANSI for text check
    const stripped = line!.replace(/\u001b\[[0-9;]*m/g, "");
    expect(stripped).toContain("ok");
  });

  it("step respects LABEL_COLUMN alignment for short labels", () => {
    const s = createStream();
    s.step("a").ok();
    const out = captured.join("");
    const line = out.split("\n").find((l) => l.includes("a"))!;
    const stripped = line.replace(/\u001b\[[0-9;]*m/g, "");
    // Expect "  a" followed by at least 20 spaces before "ok" (LABEL_COLUMN=28, label is 1 char, 2-space prefix)
    expect(stripped).toMatch(/^ {2}a {20,}ok/);
  });

  it("respects MATILHA_ASCII (strips ANSI; text labels present)", () => {
    const originalAscii = process.env.MATILHA_ASCII;
    const originalForce = process.env.FORCE_COLOR;
    process.env.FORCE_COLOR = "1";
    process.env.MATILHA_ASCII = "1";
    try {
      const s = createStream();
      s.step("one").warn("x");
      const out = captured.join("");
      // eslint-disable-next-line no-control-regex
      expect(out).not.toMatch(/\u001b\[/);
      expect(out).toContain("warn");
    } finally {
      if (originalAscii === undefined) delete process.env.MATILHA_ASCII;
      else process.env.MATILHA_ASCII = originalAscii;
      if (originalForce === undefined) delete process.env.FORCE_COLOR;
      else process.env.FORCE_COLOR = originalForce;
    }
  });
});
