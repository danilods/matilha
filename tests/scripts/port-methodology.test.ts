import { describe, it, expect } from "vitest";
import { transformWikilinks } from "../../src/scripts/port-methodology";

describe("transformWikilinks", () => {
  it("converts internal methodology wikilink to relative path", () => {
    const input = "See [[10-prd|PRD]] for details.";
    const output = transformWikilinks(input);
    expect(output).toBe("See [PRD](./10-prd.md) for details.");
  });

  it("converts bare methodology wikilink using slug as label", () => {
    const input = "Next: [[00-mapeamento-problema]].";
    const output = transformWikilinks(input);
    expect(output).toBe("Next: [00-mapeamento-problema](./00-mapeamento-problema.md).");
  });

  it("strips raw/ wikilinks keeping only the label", () => {
    const input = "Based on [[raw/methodology/2026-04-15-danilo-brain-dump|brain dump]].";
    const output = transformWikilinks(input);
    expect(output).toBe("Based on brain dump.");
  });

  it("strips raw/ wikilinks without label (use filename)", () => {
    const input = "Based on [[raw/methodology/2026-04-15-danilo-brain-dump]].";
    const output = transformWikilinks(input);
    expect(output).toBe("Based on 2026-04-15-danilo-brain-dump.");
  });

  it("converts concepts wikilinks to GitHub URLs", () => {
    const input = "See [[wiki/concepts/harness-engineering|harness]].";
    const output = transformWikilinks(input);
    expect(output).toContain("[harness](https://github.com/danilods/matilha-skills/tree/main/concepts)");
  });

  it("converts wiki/methodology wikilinks to relative paths (full form)", () => {
    const input = "Back to [[wiki/methodology/10-prd|PRD]].";
    const output = transformWikilinks(input);
    expect(output).toBe("Back to [PRD](./10-prd.md).");
  });

  it("converts ==highlights== to bold", () => {
    const input = "This is ==critical== knowledge.";
    const output = transformWikilinks(input);
    expect(output).toBe("This is **critical** knowledge.");
  });

  it("handles multiple wikilinks in one line", () => {
    const input = "See [[10-prd|PRD]] and [[20-stack|Stack]] pages.";
    const output = transformWikilinks(input);
    expect(output).toBe("See [PRD](./10-prd.md) and [Stack](./20-stack.md) pages.");
  });

  it("does not touch code blocks", () => {
    const input = "```\n[[should-not-transform]]\n```";
    const output = transformWikilinks(input);
    expect(output).toBe("```\n[[should-not-transform]]\n```");
  });

  it("does not touch inline code", () => {
    const input = "Use `[[wikilink]]` syntax.";
    const output = transformWikilinks(input);
    expect(output).toBe("Use `[[wikilink]]` syntax.");
  });
});
