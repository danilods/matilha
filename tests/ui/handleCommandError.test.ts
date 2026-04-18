import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { handleCommandError } from "../../src/ui/handleCommandError";
import { MatilhaUserError } from "../../src/ui/errorFormat";

describe("handleCommandError", () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>;
  let captured: string[];
  let originalExitCode: number | string | undefined;

  beforeEach(() => {
    captured = [];
    stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation((c: unknown) => {
      captured.push(String(c));
      return true;
    });
    originalExitCode = process.exitCode;
  });

  afterEach(() => {
    stderrSpy.mockRestore();
    process.exitCode = originalExitCode;
  });

  it("renders MatilhaUserError via its structured payload", () => {
    const err = new MatilhaUserError({
      summary: "test user error",
      context: "matilha cmd was testing",
      problem: "it was a test.",
      nextActions: ["try again"]
    });
    handleCommandError(err, "running 'matilha cmd'");
    const out = captured.join("");
    expect(out).toContain("test user error");
    expect(out).toContain("try again");
    expect(process.exitCode).toBe(1);
  });

  it("wraps a plain Error via translateUnknownError", () => {
    handleCommandError(new Error("something broke"), "running 'matilha cmd'");
    const out = captured.join("");
    expect(out.toLowerCase()).toContain("unexpected");
    expect(out).toContain("something broke");
    expect(out).toContain("running 'matilha cmd'"); // context preserved
    expect(process.exitCode).toBe(1);
  });

  it("handles non-Error throws (strings, numbers)", () => {
    handleCommandError("plain string error", "context");
    const out = captured.join("");
    expect(out).toContain("plain string error");
    expect(process.exitCode).toBe(1);
  });

  it("always sets process.exitCode to 1", () => {
    process.exitCode = 0;
    handleCommandError(new Error("x"), "ctx");
    expect(process.exitCode).toBe(1);
  });
});
