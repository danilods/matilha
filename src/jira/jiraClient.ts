import { MatilhaUserError } from "../ui/errorFormat";
import type { JiraConfig } from "./config";

export class JiraClient {
  constructor(private readonly config: JiraConfig) {}

  async createIssue(fields: Record<string, unknown>): Promise<unknown> {
    return await this.request("/rest/api/3/issue", {
      method: "POST",
      body: JSON.stringify({ fields })
    });
  }

  async setIssueProperty(issueKey: string, propertyKey: string, value: unknown): Promise<void> {
    await this.request(`/rest/api/3/issue/${encodeURIComponent(issueKey)}/properties/${encodeURIComponent(propertyKey)}`, {
      method: "PUT",
      body: JSON.stringify(value)
    });
  }

  async addComment(issueKey: string, body: unknown): Promise<unknown> {
    return await this.request(`/rest/api/3/issue/${encodeURIComponent(issueKey)}/comment`, {
      method: "POST",
      body: JSON.stringify({ body })
    });
  }

  async addWorklog(issueKey: string, worklog: unknown): Promise<unknown> {
    return await this.request(`/rest/api/3/issue/${encodeURIComponent(issueKey)}/worklog`, {
      method: "POST",
      body: JSON.stringify(worklog)
    });
  }

  async updateIssueFields(issueKey: string, fields: Record<string, unknown>): Promise<unknown> {
    return await this.request(`/rest/api/3/issue/${encodeURIComponent(issueKey)}`, {
      method: "PUT",
      body: JSON.stringify({ fields })
    });
  }

  async getTransitions(issueKey: string): Promise<Array<{ id: string; name: string }>> {
    const result = (await this.request(
      `/rest/api/3/issue/${encodeURIComponent(issueKey)}/transitions`,
      { method: "GET" }
    )) as { transitions?: Array<{ id: string; name: string }> };
    return result.transitions ?? [];
  }

  async transitionIssue(issueKey: string, transitionName: string): Promise<void> {
    const transitions = await this.getTransitions(issueKey);
    const match = transitions.find(
      (t) => t.name.toLowerCase() === transitionName.toLowerCase()
    );
    if (!match) {
      throw new MatilhaUserError({
        summary: `Jira transition "${transitionName}" not available`,
        context: `matilha jira tried to transition ${issueKey}`,
        problem: `available transitions: ${transitions.map((t) => t.name).join(", ") || "none"}`,
        nextActions: [
          "confirm the Jira workflow allows this transition from the issue's current status",
          "set JIRA_TRANSITION_IN_PROGRESS / JIRA_TRANSITION_DONE to match your Jira workflow"
        ]
      });
    }
    await this.request(`/rest/api/3/issue/${encodeURIComponent(issueKey)}/transitions`, {
      method: "POST",
      body: JSON.stringify({ transition: { id: match.id } })
    });
  }

  private async request(path: string, init: RequestInit): Promise<unknown> {
    const auth = Buffer.from(`${this.config.email}:${this.config.apiToken}`).toString("base64");
    const response = await fetch(`${this.config.baseUrl}${path}`, {
      ...init,
      headers: {
        "Accept": "application/json",
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/json",
        ...(init.headers ?? {})
      }
    });

    const text = await response.text();
    const parsed = text.length > 0 ? safeJson(text) : {};

    if (!response.ok) {
      throw new MatilhaUserError({
        summary: `Jira API request failed (${response.status})`,
        context: `matilha jira called ${path}`,
        problem: typeof parsed === "string" ? parsed : JSON.stringify(parsed, null, 2),
        nextActions: [
          "confirm the Jira project key, issue type, permissions, and story point custom field",
          "re-run with --dry-run to inspect the request payload before calling Jira"
        ]
      });
    }

    return parsed;
  }
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
