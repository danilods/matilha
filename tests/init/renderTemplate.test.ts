import { describe, it, expect } from "vitest";
import { renderTemplate } from "../../src/init/renderTemplate";

describe("renderTemplate", () => {
  it("substitutes single placeholder", () => {
    expect(renderTemplate("Hello {{name}}!", { name: "Matilha" })).toBe("Hello Matilha!");
  });

  it("substitutes multiple placeholders", () => {
    expect(renderTemplate("{{a}} + {{b}} = {{c}}", { a: "1", b: "2", c: "3" })).toBe("1 + 2 = 3");
  });

  it("substitutes repeated placeholders", () => {
    expect(renderTemplate("{{name}} {{name}}", { name: "x" })).toBe("x x");
  });

  it("throws on missing variable", () => {
    expect(() => renderTemplate("Hello {{missing}}", {})).toThrow("Missing template var: missing");
  });

  it("leaves non-placeholder braces intact", () => {
    expect(renderTemplate("function {} { return; }", {})).toBe("function {} { return; }");
  });

  it("handles empty template", () => {
    expect(renderTemplate("", {})).toBe("");
  });

  it("handles placeholder adjacent to text", () => {
    expect(renderTemplate("pre{{x}}post", { x: "MID" })).toBe("preMIDpost");
  });
});
