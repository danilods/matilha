import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { z } from "zod";
import { MatilhaUserError } from "../ui/errorFormat";

export const SYNC_STATE_VERSION = 1;

const syncedIssueSchema = z.object({
  synced_event_id: z.string().min(1),
  synced_at: z.string().min(1),
  synced_status: z.enum(["created", "in_progress", "paused", "completed"]),
  synced_worklog_minutes: z.number().nonnegative().default(0),
  synced_commits: z.array(z.string().min(1)).default([])
});

export const syncStateSchema = z.object({
  schema_version: z.literal(SYNC_STATE_VERSION),
  issues: z.record(z.string().min(1), syncedIssueSchema).default({})
});

export type SyncState = z.infer<typeof syncStateSchema>;
export type SyncedIssue = z.infer<typeof syncedIssueSchema>;

export function syncStatePath(cwd: string): string {
  return join(cwd, "docs", "matilha", "governance", "sync-state.json");
}

export function readSyncState(cwd: string): SyncState {
  const path = syncStatePath(cwd);
  if (!existsSync(path)) return { schema_version: SYNC_STATE_VERSION, issues: {} };

  const raw = readFileSync(path, "utf-8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new MatilhaUserError({
      summary: "invalid governance sync-state.json",
      context: `matilha was reading ${path}`,
      problem: err instanceof Error ? err.message : String(err),
      nextActions: ["fix or delete docs/matilha/governance/sync-state.json, then rerun the sync"]
    });
  }

  const result = syncStateSchema.safeParse(parsed);
  if (!result.success) {
    throw new MatilhaUserError({
      summary: "governance sync-state.json fails schema validation",
      context: `matilha was validating ${path}`,
      problem: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      nextActions: ["fix the shape of docs/matilha/governance/sync-state.json, or delete it and rerun the sync"]
    });
  }
  return result.data;
}

export function writeSyncState(cwd: string, state: SyncState): void {
  const path = syncStatePath(cwd);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(state, null, 2)}\n`, "utf-8");
}

export function markIssueSynced(state: SyncState, externalId: string, synced: SyncedIssue): SyncState {
  return {
    ...state,
    issues: { ...state.issues, [externalId]: synced }
  };
}
