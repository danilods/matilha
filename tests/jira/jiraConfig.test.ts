import { describe, it, expect } from "vitest";
import { resolveJiraConfig } from "../../src/jira/config";

describe("resolveJiraConfig", () => {
  it("reads Jira credentials and story point field from env", () => {
    const config = resolveJiraConfig({
      JIRA_BASE_URL: "https://example.atlassian.net",
      JIRA_EMAIL: "dev@example.com",
      JIRA_API_TOKEN: "token",
      JIRA_PROJECT_KEY: "MAT",
      JIRA_STORY_POINTS_FIELD: "customfield_10016"
    });

    expect(config.baseUrl).toBe("https://example.atlassian.net");
    expect(config.projectKey).toBe("MAT");
    expect(config.storyPointsField).toBe("customfield_10016");
  });

  it("uses project override when provided", () => {
    const config = resolveJiraConfig({
      JIRA_BASE_URL: "https://example.atlassian.net",
      JIRA_EMAIL: "dev@example.com",
      JIRA_API_TOKEN: "token",
      JIRA_PROJECT_KEY: "MAT"
    }, { projectKey: "OPS" });

    expect(config.projectKey).toBe("OPS");
  });
});
