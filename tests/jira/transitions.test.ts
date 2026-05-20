import { describe, it, expect, vi, afterEach } from "vitest";
import { JiraClient } from "../../src/jira/jiraClient";
import type { JiraConfig } from "../../src/jira/config";

const config: JiraConfig = {
  baseUrl: "https://example.atlassian.net",
  email: "e@example.com",
  apiToken: "token",
  projectKey: "BOIAA",
  storyPointsField: "customfield_10016",
  transitions: { inProgress: "In Progress", done: "Done" }
};

afterEach(() => vi.unstubAllGlobals());

describe("JiraClient.transitionIssue", () => {
  it("resolves a transition name to its id and posts it", async () => {
    const calls: Array<{ url: string; method: string; body?: string }> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: { method?: string; body?: string }) => {
        calls.push({ url, method: init.method ?? "GET", body: init.body });
        if ((init.method ?? "GET") === "GET") {
          return new Response(
            JSON.stringify({ transitions: [{ id: "31", name: "Done" }, { id: "11", name: "In Progress" }] }),
            { status: 200 }
          );
        }
        return new Response(null, { status: 204 });
      })
    );

    const client = new JiraClient(config);
    await client.transitionIssue("BOIAA-1042", "Done");

    expect(calls).toHaveLength(2);
    expect(calls[0]!.method).toBe("GET");
    expect(calls[1]!.method).toBe("POST");
    expect(JSON.parse(calls[1]!.body!)).toEqual({ transition: { id: "31" } });
  });

  it("throws a clear error when the transition name is not available", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ transitions: [{ id: "11", name: "In Progress" }] }), { status: 200 })
      )
    );
    const client = new JiraClient(config);
    await expect(client.transitionIssue("BOIAA-1042", "Done")).rejects.toThrow(/transition "Done" not available/);
  });
});
