// tests/hunt/naming.test.ts
import { describe, it, expect } from "vitest";
import { slugifySP, padWave } from "../../src/hunt/naming";

describe("slugifySP", () => {
  it("lowercases and replaces non-alphanumerics with hyphens", () => {
    expect(slugifySP("Database Schema")).toBe("database-schema");
  });

  it("trims leading and trailing hyphens", () => {
    expect(slugifySP(" Hello World! ")).toBe("hello-world");
  });

  it("collapses consecutive non-alphanumerics into a single hyphen", () => {
    expect(slugifySP("foo   bar__baz")).toBe("foo-bar-baz");
  });

  it("handles unicode by stripping to ascii-alphanumeric", () => {
    expect(slugifySP("Autenticação de Sessão")).toBe("autentica-o-de-sess-o");
  });

  it("truncates to 40 characters", () => {
    const long = "a".repeat(60);
    expect(slugifySP(long).length).toBeLessThanOrEqual(40);
  });
});

describe("padWave", () => {
  it("pads 0 to '00'", () => { expect(padWave(0)).toBe("00"); });
  it("pads 1 to '01'", () => { expect(padWave(1)).toBe("01"); });
  it("pads 9 to '09'", () => { expect(padWave(9)).toBe("09"); });
  it("keeps 10 as '10'", () => { expect(padWave(10)).toBe("10"); });
  it("keeps 99 as '99'", () => { expect(padWave(99)).toBe("99"); });
  it("keeps 100 as '100' (3 digits)", () => { expect(padWave(100)).toBe("100"); });
});
