import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { formatError, MatilhaUserError, type MatilhaError } from "../../src/ui/errorFormat";

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

  it("respects NO_COLOR env var (no ansi escapes in output)", () => {
    process.env.NO_COLOR = "1";
    const out = formatError(baseError);
    expect(out).not.toMatch(/\u001b\[/);
  });

  it("preserves plain ASCII when --ascii mode is set via env", () => {
    process.env.MATILHA_ASCII = "1";
    const out = formatError(baseError);
    // No unicode box-drawing characters in the output.
    expect(out).not.toMatch(/[\u2500-\u257F]/);
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
