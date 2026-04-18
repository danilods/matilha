import { describe, it, expect } from "vitest";
import {
  buildClaudeIndex,
  buildAgentsIndex,
  buildDesignSpecBody,
  type Archetype,
  type AestheticDirection
} from "../../src/init/archetypeContent";

const ARCHETYPES_LIST: Archetype[] = [
  "saas-b2b", "saas-b2c", "frontend-only", "cli", "library", "ml-service", "marketplace"
];

describe("buildClaudeIndex snapshots", () => {
  for (const archetype of ARCHETYPES_LIST) {
    it(`matches snapshot for ${archetype}`, () => {
      expect(buildClaudeIndex(archetype)).toMatchSnapshot();
    });
  }
});

describe("buildAgentsIndex snapshots", () => {
  for (const archetype of ARCHETYPES_LIST) {
    it(`matches snapshot for ${archetype}`, () => {
      expect(buildAgentsIndex(archetype)).toMatchSnapshot();
    });
  }
});

describe("buildDesignSpecBody snapshots", () => {
  const cases: Array<{ a: Archetype; ae: AestheticDirection }> = [
    { a: "frontend-only", ae: "brutalist" },
    { a: "saas-b2b", ae: "editorial" },
    { a: "marketplace", ae: "maximalist" }
  ];
  for (const { a, ae } of cases) {
    it(`matches snapshot for ${a} + ${ae}`, () => {
      expect(buildDesignSpecBody(a, ae)).toMatchSnapshot();
    });
  }
});
