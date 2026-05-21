import { describe, it, expect } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import {
  readSyncState,
  writeSyncState,
  markIssueSynced,
  syncStatePath,
  SYNC_STATE_VERSION,
  type SyncState
} from "../../src/governance/syncState";

describe("syncState", () => {
  it("returns an empty state when sync-state.json does not exist", () => {
    const dir = mkdtempSync(join(tmpdir(), "matilha-syncstate-"));
    try {
      expect(readSyncState(dir)).toEqual({ schema_version: SYNC_STATE_VERSION, issues: {} });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("writes and reads sync-state round-trip", () => {
    const dir = mkdtempSync(join(tmpdir(), "matilha-syncstate-"));
    try {
      const state: SyncState = {
        schema_version: SYNC_STATE_VERSION,
        issues: {
          "BOIAA-1": {
            synced_event_id: "e9",
            synced_at: "2026-05-21T10:00:00Z",
            synced_status: "completed",
            synced_worklog_minutes: 0,
            synced_commits: []
          }
        }
      };
      writeSyncState(dir, state);
      expect(syncStatePath(dir)).toMatch(/docs\/matilha\/governance\/sync-state\.json$/);
      expect(readSyncState(dir)).toEqual(state);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("throws a clear error on malformed JSON", () => {
    const dir = mkdtempSync(join(tmpdir(), "matilha-syncstate-"));
    try {
      const path = syncStatePath(dir);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, "{ not json", "utf-8");
      expect(() => readSyncState(dir)).toThrow(/invalid governance sync-state/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("throws a schema-validation error on valid JSON with the wrong shape", () => {
    const dir = mkdtempSync(join(tmpdir(), "matilha-syncstate-"));
    try {
      const path = syncStatePath(dir);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, JSON.stringify({ schema_version: 99, issues: {} }), "utf-8");
      expect(() => readSyncState(dir)).toThrow(/fails schema validation/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("markIssueSynced adds or replaces an issue entry without mutating the input", () => {
    const before: SyncState = { schema_version: SYNC_STATE_VERSION, issues: {} };
    const after = markIssueSynced(before, "BOIAA-7", {
      synced_event_id: "e1",
      synced_at: "2026-05-21T11:00:00Z",
      synced_status: "in_progress",
      synced_worklog_minutes: 0,
      synced_commits: []
    });
    expect(before.issues).toEqual({});
    expect(after.issues["BOIAA-7"]).toEqual({
      synced_event_id: "e1",
      synced_at: "2026-05-21T11:00:00Z",
      synced_status: "in_progress",
      synced_worklog_minutes: 0,
      synced_commits: []
    });
  });

  it("round-trips synced_worklog_minutes and synced_commits", () => {
    const dir = mkdtempSync(join(tmpdir(), "matilha-syncstate-"));
    try {
      const state: SyncState = {
        schema_version: SYNC_STATE_VERSION,
        issues: {
          "BOIAA-1": {
            synced_event_id: "e9",
            synced_at: "2026-05-21T10:00:00Z",
            synced_status: "in_progress",
            synced_worklog_minutes: 42,
            synced_commits: ["c1", "c2"]
          }
        }
      };
      writeSyncState(dir, state);
      expect(readSyncState(dir)).toEqual(state);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("defaults synced_worklog_minutes and synced_commits for a legacy entry without them", () => {
    const dir = mkdtempSync(join(tmpdir(), "matilha-syncstate-"));
    try {
      const path = syncStatePath(dir);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(
        path,
        JSON.stringify({
          schema_version: SYNC_STATE_VERSION,
          issues: { "BOIAA-1": { synced_event_id: "e1", synced_at: "x", synced_status: "completed" } }
        }),
        "utf-8"
      );
      const issue = readSyncState(dir).issues["BOIAA-1"]!;
      expect(issue.synced_worklog_minutes).toBe(0);
      expect(issue.synced_commits).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
