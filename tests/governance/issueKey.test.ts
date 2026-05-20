import { describe, it, expect } from "vitest";
import {
  extractIssueKeys,
  resolveIssueKeyPattern,
  DEFAULT_ISSUE_KEY_PATTERN
} from "../../src/governance/issueKey";

describe("issue key extraction", () => {
  it("extracts a single key from a commit message", () => {
    expect(extractIssueKeys("feat: cascata camada 2  BOIAA-1042")).toEqual(["BOIAA-1042"]);
  });

  it("extracts and dedups multiple keys preserving first-appearance order", () => {
    expect(extractIssueKeys("BOIAA-1 ref BOIAA-2 and BOIAA-1 again")).toEqual(["BOIAA-1", "BOIAA-2"]);
  });

  it("returns an empty array when no key is present", () => {
    expect(extractIssueKeys("chore: tidy things up")).toEqual([]);
  });

  it("resolves the pattern from env, falling back to the default", () => {
    expect(resolveIssueKeyPattern({})).toBe(DEFAULT_ISSUE_KEY_PATTERN);
    expect(resolveIssueKeyPattern({ MATILHA_ISSUE_KEY_PATTERN: "JIRA-\\d+" })).toBe("JIRA-\\d+");
  });

  it("honors a custom pattern", () => {
    expect(extractIssueKeys("see ticket #4567 now", "#\\d+")).toEqual(["#4567"]);
  });

  it("throws a clear error for an invalid pattern", () => {
    expect(() => extractIssueKeys("x", "([")).toThrow(/invalid issue-key pattern/);
  });
});
