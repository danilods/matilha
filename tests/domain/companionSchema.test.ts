import { describe, it, expect } from "vitest";
import { companionSchema, companionsFileSchema } from "../../src/domain/companionSchema";

describe("companionSchema", () => {
  it("accepts a valid companion definition", () => {
    const valid = {
      slug: "impeccable",
      name: "Impeccable",
      description: "Design harness",
      detect: {
        "claude-code": "~/.claude/skills/impeccable/",
        "cursor": ".cursor/skills/impeccable/"
      },
      install: { universal: "npx skills add pbakaus/impeccable" },
      tutorial: { title: "Install", body: "Run ..." },
      optional_per_archetype: ["saas-b2b"]
    };
    expect(companionSchema.safeParse(valid).success).toBe(true);
  });

  it("detect requires at least one key", () => {
    const invalid = {
      slug: "x",
      name: "X",
      description: "x",
      detect: {},
      install: {},
      tutorial: { title: "t", body: "b" },
      optional_per_archetype: []
    };
    expect(companionSchema.safeParse(invalid).success).toBe(false);
  });

  it("install object can have zero keys (some companions are tutorial-only)", () => {
    const valid = {
      slug: "superpowers-claude",
      name: "SP",
      description: "Claude-only",
      detect: { "claude-code": "~/.claude/foo" },
      install: {},
      tutorial: { title: "t", body: "b" },
      optional_per_archetype: []
    };
    expect(companionSchema.safeParse(valid).success).toBe(true);
  });

  it("slug must be lowercase kebab", () => {
    const invalid = {
      slug: "Impeccable",
      name: "X", description: "x",
      detect: { "claude-code": "~/x" },
      install: {},
      tutorial: { title: "t", body: "b" },
      optional_per_archetype: []
    };
    expect(companionSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects invalid tool key (e.g. camelCase)", () => {
    const invalid = {
      slug: "x",
      name: "X", description: "x",
      detect: { claudeCode: "~/x" },
      install: {},
      tutorial: { title: "t", body: "b" },
      optional_per_archetype: []
    };
    expect(companionSchema.safeParse(invalid).success).toBe(false);
  });
});

describe("companionsFileSchema", () => {
  it("accepts a map of slug to companion", () => {
    const valid = {
      impeccable: {
        slug: "impeccable",
        name: "Impeccable",
        description: "d",
        detect: { "claude-code": "~/x" },
        install: {},
        tutorial: { title: "t", body: "b" },
        optional_per_archetype: []
      }
    };
    expect(companionsFileSchema.safeParse(valid).success).toBe(true);
  });
});
