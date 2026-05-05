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
    expect(MATILHA_BANNER).toContain("matilha");
    expect(MATILHA_BANNER).toContain("You lead. Agents hunt.");
    expect(MATILHA_BANNER).not.toContain("#################################################################################################");
  });

  it("printBanner emits the compact ASCII banner", () => {
    printBanner();
    const out = captured.join("\n");
    expect(out).toContain("matilha");
    expect(out).not.toContain("#################################################################################################");
  });

  it("printMiniBanner emits a command-scoped header (no ASCII art)", () => {
    printMiniBanner("matilha scout", "Phase 00 Discovery");
    const out = captured.join("\n");
    expect(out).toContain("matilha scout");
    expect(out).toContain("Phase 00 Discovery");
    expect(out).not.toContain("███"); // no ASCII art blocks
  });
});
