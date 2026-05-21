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

describe("governanceSyncCommand", () => {
  it("refuses to run without --preview or --yes", async () => {
    const dir = ledgerWithCompletedIssue();
    try {
      await expect(governanceSyncCommand(dir, {})).rejects.toThrow(/requires explicit approval/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("--preview prints the plan and does NOT touch Jira or sync-state.json", async () => {
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

  it("--yes projects the issue to Jira and records the sync trail", async () => {
    const dir = ledgerWithCompletedIssue();
    try {
      stubJiraEnv();
      const calls: Array<{ url: string; method: string }> = [];
      vi.stubGlobal("fetch", vi.fn(async (url: string, init: { method?: string }) => {
        calls.push({ url, method: init.method ?? "GET" });
        if (url.endsWith("/transitions") && (init.method ?? "GET") === "GET") {
          return new Response(JSON.stringify({ transitions: [{ id: "11", name: "In Progress" }, { id: "31", name: "Done" }] }), { status: 200 });
        }
        return new Response("{}", { status: 200 });
      }));
      vi.spyOn(console, "log").mockImplementation(() => {});
      await governanceSyncCommand(dir, { yes: true });

      expect(calls.some((c) => c.url.endsWith("/worklog"))).toBe(true);
      expect(calls.some((c) => c.url.endsWith("/comment"))).toBe(true);
      const trail = readSyncState(dir);
      expect(trail.issues["BOIAA-1"]!.synced_status).toBe("completed");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("--yes a second time is idempotent — nothing left to project", async () => {
    const dir = ledgerWithCompletedIssue();
    try {
      stubJiraEnv();
      vi.stubGlobal("fetch", vi.fn(async (url: string, init: { method?: string }) => {
        if (url.endsWith("/transitions") && (init.method ?? "GET") === "GET") {
          return new Response(JSON.stringify({ transitions: [{ id: "11", name: "In Progress" }, { id: "31", name: "Done" }] }), { status: 200 });
        }
        return new Response("{}", { status: 200 });
      }));
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

  it("--yes skips a transition the Jira workflow does not offer, without aborting", async () => {
    const dir = ledgerWithCompletedIssue();
    try {
      stubJiraEnv();
      const calls: string[] = [];
      vi.stubGlobal("fetch", vi.fn(async (url: string, init: { method?: string }) => {
        calls.push(`${init.method ?? "GET"} ${url}`);
        if (url.endsWith("/transitions") && (init.method ?? "GET") === "GET") {
          return new Response(JSON.stringify({ transitions: [] }), { status: 200 });
        }
        return new Response("{}", { status: 200 });
      }));
      vi.spyOn(console, "log").mockImplementation(() => {});
      await expect(governanceSyncCommand(dir, { yes: true })).resolves.not.toThrow();
      expect(calls.some((c) => c.endsWith("/worklog"))).toBe(true);
      expect(readSyncState(dir).issues["BOIAA-1"]!.synced_status).toBe("completed");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
