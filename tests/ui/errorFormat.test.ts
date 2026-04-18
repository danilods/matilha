import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { formatError, printError, MatilhaUserError, type MatilhaError } from "../../src/ui/errorFormat";

const baseError: MatilhaError = {
  summary: "something went wrong",
  context: "matilha was reading companions.json",
  problem: "the file is missing",
  nextActions: ["run `matilha init` to scaffold companions.json"],
};

describe("formatError", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.NO_COLOR;
    delete process.env.MATILHA_ASCII;
    delete process.env.FORCE_COLOR;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("renders a minimal 5-rule error (no example)", () => {
    const out = formatError(baseError);
    expect(out).toContain("error:");
    expect(out).toContain("something went wrong");
    expect(out).toContain("matilha was reading companions.json");
    expect(out).toContain("the file is missing");
    expect(out).toContain("next:");
    expect(out).toContain("run `matilha init` to scaffold companions.json");
    expect(out).not.toContain("example:");
  });

  it("includes example block when provided", () => {
    const out = formatError({
      ...baseError,
      example: "matilha init --force",
    });
    expect(out).toContain("example:");
    expect(out).toContain("matilha init --force");
  });

  it("renders multiple next actions as separate lines", () => {
    const out = formatError({
      ...baseError,
      nextActions: [
        "run `matilha init` to scaffold",
        "check the current directory",
        "read `matilha --help`",
      ],
    });
    expect(out).toContain("run `matilha init` to scaffold");
    expect(out).toContain("check the current directory");
    expect(out).toContain("read `matilha --help`");
  });

  it("NO_COLOR=1 strips ANSI escapes even when terminal claims color support", () => {
    const originalNo = process.env.NO_COLOR;
    const originalForce = process.env.FORCE_COLOR;
    process.env.FORCE_COLOR = "1";
    process.env.NO_COLOR = "1";
    try {
      const err: MatilhaError = {
        summary: "test",
        context: "ctx",
        problem: "prob",
        nextActions: ["act"]
      };
      const out = formatError(err);
      // eslint-disable-next-line no-control-regex
      expect(out).not.toMatch(/\u001b\[/);
    } finally {
      if (originalNo === undefined) delete process.env.NO_COLOR;
      else process.env.NO_COLOR = originalNo;
      if (originalForce === undefined) delete process.env.FORCE_COLOR;
      else process.env.FORCE_COLOR = originalForce;
    }
  });

  it("MATILHA_ASCII=1 strips ANSI escapes (same as NO_COLOR)", () => {
    const originalAscii = process.env.MATILHA_ASCII;
    const originalForce = process.env.FORCE_COLOR;
    process.env.FORCE_COLOR = "1";  // force picocolors to claim color support
    process.env.MATILHA_ASCII = "1";
    try {
      const err: MatilhaError = {
        summary: "test",
        context: "ctx",
        problem: "prob",
        nextActions: ["act"]
      };
      const out = formatError(err);
      // eslint-disable-next-line no-control-regex
      expect(out).not.toMatch(/\u001b\[/);
    } finally {
      if (originalAscii === undefined) delete process.env.MATILHA_ASCII;
      else process.env.MATILHA_ASCII = originalAscii;
      if (originalForce === undefined) delete process.env.FORCE_COLOR;
      else process.env.FORCE_COLOR = originalForce;
    }
  });
});

describe("printError", () => {
  it("printError writes to stderr (not stdout)", () => {
    const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    try {
      const err: MatilhaError = {
        summary: "s",
        context: "c",
        problem: "p",
        nextActions: ["a"]
      };
      printError(err);
      expect(stderrSpy).toHaveBeenCalled();
      expect(stdoutSpy).not.toHaveBeenCalled();
      const captured = String(stderrSpy.mock.calls[0][0]);
      // Strip ANSI escapes so the assertion holds regardless of FORCE_COLOR.
      // eslint-disable-next-line no-control-regex
      const plain = captured.replace(/\u001b\[[0-9;]*m/g, "");
      expect(plain).toContain("error: s");
    } finally {
      stderrSpy.mockRestore();
      stdoutSpy.mockRestore();
    }
  });
});

describe("MatilhaUserError", () => {
  it("is an instance of Error", () => {
    const err = new MatilhaUserError(baseError);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("MatilhaUserError");
    expect(err.message).toBe(baseError.summary);
    expect(err.matilhaError).toEqual(baseError);
  });
});
