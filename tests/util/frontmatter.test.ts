import { describe, it, expect } from "vitest";
import { parseFrontmatter, serializeFrontmatter } from "../../src/util/frontmatter";

describe("parseFrontmatter", () => {
  it("parses YAML frontmatter and body", () => {
    const input = `---\nname: test\nphase: 0\n---\n\n# Body content\n\nHere is the body.`;
    const result = parseFrontmatter<{ name: string; phase: number }>(input);
    expect(result.data).toEqual({ name: "test", phase: 0 });
    expect(result.body.trim()).toContain("# Body content");
  });

  it("handles frontmatter-only (no body)", () => {
    const input = `---\nname: x\n---\n`;
    const result = parseFrontmatter<{ name: string }>(input);
    expect(result.data).toEqual({ name: "x" });
    expect(result.body.trim()).toBe("");
  });

  it("throws when opening --- missing", () => {
    expect(() => parseFrontmatter("no frontmatter here")).toThrow(/frontmatter/i);
  });

  it("throws when closing --- missing", () => {
    const input = `---\nname: x\nbody without closing`;
    expect(() => parseFrontmatter(input)).toThrow(/frontmatter/i);
  });

  it("throws on malformed YAML", () => {
    const input = `---\nname: : invalid\n---\nbody`;
    expect(() => parseFrontmatter(input)).toThrow();
  });
});

describe("serializeFrontmatter", () => {
  it("roundtrips parse -> serialize -> parse", () => {
    const original = `---\nname: test\nphase: 10\ntags:\n  - a\n  - b\n---\n\n# Body\n`;
    const parsed = parseFrontmatter<{ name: string; phase: number; tags: string[] }>(original);
    const serialized = serializeFrontmatter(parsed);
    const reparsed = parseFrontmatter<{ name: string; phase: number; tags: string[] }>(serialized);
    expect(reparsed.data).toEqual(parsed.data);
    expect(reparsed.body.trim()).toBe(parsed.body.trim());
  });

  it("wraps data between --- markers", () => {
    const out = serializeFrontmatter({ data: { x: 1 }, body: "# hello" });
    expect(out).toMatch(/^---\n/);
    expect(out).toContain("x: 1");
    expect(out).toContain("# hello");
  });
});
