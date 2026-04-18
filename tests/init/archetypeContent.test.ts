import { describe, it, expect } from "vitest";
import {
  buildClaudeIndex,
  buildAgentsIndex,
  buildDesignSpecBody,
  hasFrontend,
  type Archetype,
  type AestheticDirection
} from "../../src/init/archetypeContent";

describe("buildClaudeIndex", () => {
  it("returns archetype-specific structure bullet list for saas-b2b", () => {
    const result = buildClaudeIndex("saas-b2b");
    expect(result).toContain("src/api/");
    expect(result).toContain("src/web/");
  });

  it("returns structure for frontend-only", () => {
    const result = buildClaudeIndex("frontend-only");
    expect(result).toContain("src/components/");
    expect(result).not.toContain("src/api/");
  });

  it("returns structure for cli", () => {
    expect(buildClaudeIndex("cli")).toContain("src/cli");
  });

  it("returns structure for library", () => {
    expect(buildClaudeIndex("library")).toContain("src/index");
  });
});

describe("hasFrontend", () => {
  it("returns true for saas-b2b, saas-b2c, frontend-only, marketplace", () => {
    expect(hasFrontend("saas-b2b")).toBe(true);
    expect(hasFrontend("saas-b2c")).toBe(true);
    expect(hasFrontend("frontend-only")).toBe(true);
    expect(hasFrontend("marketplace")).toBe(true);
  });

  it("returns false for cli, library, ml-service", () => {
    expect(hasFrontend("cli")).toBe(false);
    expect(hasFrontend("library")).toBe(false);
    expect(hasFrontend("ml-service")).toBe(false);
  });
});

describe("buildDesignSpecBody", () => {
  it("includes aesthetic direction heuristics for brutalist", () => {
    const result = buildDesignSpecBody("frontend-only", "brutalist");
    expect(result).toContain("brutalist");
    expect(result.length).toBeGreaterThan(50);
  });

  it("includes references for editorial aesthetic", () => {
    expect(buildDesignSpecBody("saas-b2b", "editorial")).toContain("editorial");
  });
});
