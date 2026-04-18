import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MATILHA_BANNER, printBanner, printMiniBanner } from "../../src/ui/banner";

describe("banner", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let captured: string[];

  beforeEach(() => {
    captured = [];
    logSpy = vi.spyOn(console, "log").mockImplementation((msg: unknown) => {
      captured.push(String(msg));
    });
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it("MATILHA_BANNER contains project identity", () => {
    expect(MATILHA_BANNER).toContain("Humanos lideram");
    expect(MATILHA_BANNER).toContain("Agentes caçam");
  });

  it("printBanner emits the full ASCII banner", () => {
    printBanner();
    expect(captured.join("\n")).toContain("Humanos lideram");
  });

  it("printMiniBanner emits a command-scoped header (no ASCII art)", () => {
    printMiniBanner("matilha scout", "Phase 00 Discovery");
    const out = captured.join("\n");
    expect(out).toContain("matilha scout");
    expect(out).toContain("Phase 00 Discovery");
    expect(out).not.toContain("███"); // no ASCII art blocks
  });
});
