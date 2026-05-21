import { describe, it, expect, vi, afterEach } from "vitest";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { governanceSyncCommand } from "../../src/governance/syncCommand";
import { appendEvent } from "../../src/governance/ledger";
import { makeGovernanceEvent } from "../../src/governance/events";
import { readSyncState, syncStatePath } from "../../src/governance/syncState";

const actor = { tool: "cli" };

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

function ledgerWithCompletedIssue(): string {
  const dir = mkdtempSync(join(tmpdir(), "matilha-synccmd-"));
  appendEvent(dir, makeGovernanceEvent({ type: "task.started", external_id: "BOIAA-1", issue_key: "BOIAA-1", actor, timestamp: "2026-05-21T10:00:00Z" }));
  appendEvent(dir, makeGovernanceEvent({ type: "task.completed", external_id: "BOIAA-1", issue_key: "BOIAA-1", actor, timestamp: "2026-05-21T10:40:00Z", payload: { commits: ["c1"] } }));
  return dir;
}

function stubJiraEnv(): void {
  vi.stubEnv("JIRA_BASE_URL", "https://example.atlassian.net");
  vi.stubEnv("JIRA_EMAIL", "e@example.com");
  vi.stubEnv("JIRA_API_TOKEN", "token");
  vi.stubEnv("JIRA_PROJECT_KEY", "BOIAA");
}

function jiraFetchMock(calls: Array<{ url: string; method: string; body?: string }>) {
  return vi.fn(async (url: string, init: { method?: string; body?: string }) => {
    calls.push({ url, method: init.method ?? "GET", body: init.body });
    if (url.endsWith("/transitions") && (init.method ?? "GET") === "GET") {
      return new Response(
        JSON.stringify({ transitions: [{ id: "11", name: "Em andamento" }, { id: "31", name: "Concluído" }] }),
        { status: 200 }
      );
    }
    return new Response("{}", { status: 200 });
  });
}

describe("governanceSyncCommand", () => {
  it("refuses to run without --preview or --yes", async () => {
    const dir = ledgerWithCompletedIssue();
    try {
      await expect(governanceSyncCommand(dir, {})).rejects.toThrow(/requires explicit approval/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("--preview prints the plan and touches neither Jira nor sync-state.json", async () => {
    const dir = ledgerWithCompletedIssue();
    try {
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);
      const lines: string[] = [];
      vi.spyOn(console, "log").mockImplementation((l?: unknown) => { lines.push(String(l)); });
      await governanceSyncCommand(dir, { preview: true });
      expect(fetchMock).not.toHaveBeenCalled();
      expect(existsSync(syncStatePath(dir))).toBe(false);
      expect(lines.join("\n")).toContain("BOIAA-1");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("--yes sets story points BEFORE transitioning to the done status", async () => {
    const dir = ledgerWithCompletedIssue();
    try {
      stubJiraEnv();
      vi.stubEnv("JIRA_TRANSITION_DONE", "Concluído");
      const calls: Array<{ url: string; method: string; body?: string }> = [];
      vi.stubGlobal("fetch", jiraFetchMock(calls));
      vi.spyOn(console, "log").mockImplementation(() => {});
      await governanceSyncCommand(dir, { yes: true });

      const fieldUpdate = calls.findIndex((c) => c.method === "PUT" && /\/issue\/BOIAA-1$/.test(c.url));
      const transitionPost = calls.findIndex((c) => c.method === "POST" && c.url.endsWith("/transitions"));
      expect(fieldUpdate).toBeGreaterThanOrEqual(0);
      expect(transitionPost).toBeGreaterThanOrEqual(0);
      expect(fieldUpdate).toBeLessThan(transitionPost);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("--yes records synced worklog and commits in the sync trail", async () => {
    const dir = ledgerWithCompletedIssue();
    try {
      stubJiraEnv();
      const calls: Array<{ url: string; method: string; body?: string }> = [];
      vi.stubGlobal("fetch", jiraFetchMock(calls));
      vi.spyOn(console, "log").mockImplementation(() => {});
      await governanceSyncCommand(dir, { yes: true });

      const trail = readSyncState(dir).issues["BOIAA-1"]!;
      expect(trail.synced_status).toBe("completed");
      expect(trail.synced_worklog_minutes).toBe(40);
      expect(trail.synced_commits).toEqual(["c1"]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("--yes posts a progress comment listing the new commits on an in-progress sync", async () => {
    const dir = mkdtempSync(join(tmpdir(), "matilha-synccmd-prog-"));
    try {
      stubJiraEnv();
      appendEvent(dir, makeGovernanceEvent({ type: "task.started", external_id: "BOIAA-1", issue_key: "BOIAA-1", actor, timestamp: "2026-05-21T10:00:00Z" }));
      appendEvent(dir, makeGovernanceEvent({ type: "task.progress", external_id: "BOIAA-1", issue_key: "BOIAA-1", actor, timestamp: "2026-05-21T10:10:00Z", payload: { commits: ["abc1234"] } }));
      const calls: Array<{ url: string; method: string; body?: string }> = [];
      vi.stubGlobal("fetch", jiraFetchMock(calls));
      vi.spyOn(console, "log").mockImplementation(() => {});
      await governanceSyncCommand(dir, { yes: true });

      const commentPost = calls.find((c) => c.method === "POST" && c.url.endsWith("/comment"));
      expect(commentPost).toBeDefined();
      expect(commentPost!.body).toContain("Progresso");
      expect(commentPost!.body).toContain("abc1234");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("--yes a second time is idempotent — nothing left to project", async () => {
    const dir = ledgerWithCompletedIssue();
    try {
      stubJiraEnv();
      vi.stubGlobal("fetch", jiraFetchMock([]));
      vi.spyOn(console, "log").mockImplementation(() => {});
      await governanceSyncCommand(dir, { yes: true });

      const second = vi.fn(async () => new Response("{}", { status: 200 }));
      vi.stubGlobal("fetch", second);
      await governanceSyncCommand(dir, { yes: true });
      expect(second).not.toHaveBeenCalled();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("--yes projects only the worklog delta on an incremental sync", async () => {
    const dir = mkdtempSync(join(tmpdir(), "matilha-synccmd-inc-"));
    try {
      stubJiraEnv();
      appendEvent(dir, makeGovernanceEvent({ type: "task.started", external_id: "BOIAA-1", issue_key: "BOIAA-1", actor, timestamp: "2026-05-21T10:00:00Z" }));
      appendEvent(dir, makeGovernanceEvent({ type: "task.paused", external_id: "BOIAA-1", issue_key: "BOIAA-1", actor, timestamp: "2026-05-21T10:40:00Z", payload: { reason: "pausa" } }));
      vi.stubGlobal("fetch", jiraFetchMock([]));
      vi.spyOn(console, "log").mockImplementation(() => {});
      await governanceSyncCommand(dir, { yes: true });
      expect(readSyncState(dir).issues["BOIAA-1"]!.synced_worklog_minutes).toBe(40);

      appendEvent(dir, makeGovernanceEvent({ type: "task.resumed", external_id: "BOIAA-1", issue_key: "BOIAA-1", actor, timestamp: "2026-05-21T14:00:00Z" }));
      appendEvent(dir, makeGovernanceEvent({ type: "task.paused", external_id: "BOIAA-1", issue_key: "BOIAA-1", actor, timestamp: "2026-05-21T14:20:00Z", payload: { reason: "pausa" } }));
      const calls: Array<{ url: string; method: string; body?: string }> = [];
      vi.stubGlobal("fetch", jiraFetchMock(calls));
      await governanceSyncCommand(dir, { yes: true });

      const worklogPost = calls.find((c) => c.method === "POST" && c.url.endsWith("/worklog"));
      expect(worklogPost).toBeDefined();
      expect(JSON.parse(worklogPost!.body!).timeSpentSeconds).toBe(20 * 60);
      expect(readSyncState(dir).issues["BOIAA-1"]!.synced_worklog_minutes).toBe(60);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
