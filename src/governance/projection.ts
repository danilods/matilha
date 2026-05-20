import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { z } from "zod";
import type { GovernanceEvent } from "./events";
import { MatilhaUserError } from "../ui/errorFormat";
import { minutesToStoryPoints, resolveMinutesPerStoryPoint } from "./storyPoints";

export const GOVERNANCE_STATE_VERSION = 1;

const intervalSchema = z.object({ start: z.string().min(1), end: z.string().min(1) });

const issueStateSchema = z.object({
  jira_key: z.string().min(1).nullable(),
  status: z.enum(["created", "in_progress", "paused", "completed"]),
  story_points: z.number().nonnegative().nullable(),
  worklog_active_minutes: z.number().nonnegative(),
  worklog_estimated: z.boolean(),
  intervals: z.array(intervalSchema),
  commits: z.array(z.string().min(1)),
  agent: z
    .object({ tool: z.string().min(1), model: z.string().min(1).optional() })
    .nullable(),
  category: z.string().min(1).nullable(),
  issue_kind: z.string().min(1).nullable(),
  last_event_id: z.string().min(1),
  last_event_at: z.string().min(1)
});

export const governanceStateSchema = z.object({
  schema_version: z.literal(GOVERNANCE_STATE_VERSION),
  rebuilt_at: z.string().min(1),
  issues: z.record(z.string().min(1), issueStateSchema).default({})
});

export type GovernanceState = z.infer<typeof governanceStateSchema>;
export type IssueState = z.infer<typeof issueStateSchema>;

export function buildProjection(
  events: GovernanceEvent[],
  rebuiltAt: string = new Date().toISOString(),
  opts: { minutesPerStoryPoint?: number } = {}
): GovernanceState {
  const minutesPerStoryPoint = opts.minutesPerStoryPoint ?? resolveMinutesPerStoryPoint();
  const byIssue = new Map<string, GovernanceEvent[]>();
  for (const event of events) {
    const list = byIssue.get(event.external_id) ?? [];
    list.push(event);
    byIssue.set(event.external_id, list);
  }

  const issues: Record<string, IssueState> = {};
  for (const [externalId, list] of byIssue) {
    const sorted = [...list].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    issues[externalId] = projectIssue(sorted, minutesPerStoryPoint);
  }
  return { schema_version: GOVERNANCE_STATE_VERSION, rebuilt_at: rebuiltAt, issues };
}

function projectIssue(sorted: GovernanceEvent[], minutesPerStoryPoint: number): IssueState {
  let status: IssueState["status"] = "created";
  let category: string | null = null;
  let issueKind: string | null = null;
  let jiraKey: string | null = null;
  let agent: IssueState["agent"] = null;
  const intervals: Array<{ start: string; end: string }> = [];
  const commitSet = new Set<string>();
  let openStart: string | null = null;
  let sawStart = false;

  for (const event of sorted) {
    if (event.issue_key) jiraKey = event.issue_key;
    agent = { tool: event.actor.tool, ...(event.actor.model ? { model: event.actor.model } : {}) };

    if (event.type === "task.created") {
      if (event.payload.category !== undefined) category = event.payload.category;
      if (event.payload.issue_kind !== undefined) issueKind = event.payload.issue_kind;
    } else if (event.type === "task.started" || event.type === "task.resumed") {
      sawStart = true;
      if (openStart === null) openStart = event.timestamp;
      status = "in_progress";
    } else if (event.type === "task.paused") {
      if (openStart !== null) {
        intervals.push({ start: openStart, end: event.timestamp });
        openStart = null;
      }
      status = "paused";
    } else if (event.type === "task.completed") {
      if (openStart !== null) {
        intervals.push({ start: openStart, end: event.timestamp });
        openStart = null;
      }
      for (const commit of event.payload.commits) {
        commitSet.add(commit);
      }
      status = "completed";
    }
  }

  // An interval still open at the end of the fold is intentionally not counted.
  // Worklog accrues only when an interval closes (task.paused / task.completed).
  // Counting the open span up to "now" would change the worklog on every rebuild,
  // breaking the determinism the design requires.
  const minutes = Math.max(0, intervals.reduce((sum, i) => sum + diffMinutes(i.start, i.end), 0));
  const worklogActiveMinutes = round1(minutes);
  // Story point é medido, não estimado: nasce só na conclusão, derivado do
  // worklog. Antes da conclusão é null (spec §7.2 D7).
  const storyPoints =
    status === "completed"
      ? minutesToStoryPoints(worklogActiveMinutes, minutesPerStoryPoint)
      : null;
  const last = sorted[sorted.length - 1]!;
  return {
    jira_key: jiraKey,
    status,
    story_points: storyPoints,
    worklog_active_minutes: worklogActiveMinutes,
    worklog_estimated: status === "completed" && !sawStart,
    intervals,
    commits: [...commitSet],
    agent,
    category,
    issue_kind: issueKind,
    last_event_id: last.event_id,
    last_event_at: last.timestamp
  };
}

function diffMinutes(start: string, end: string): number {
  return (new Date(end).getTime() - new Date(start).getTime()) / 60000;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function statePath(cwd: string): string {
  return join(cwd, "docs", "matilha", "governance", "state.json");
}

export function writeState(cwd: string, state: GovernanceState): void {
  const path = statePath(cwd);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(state, null, 2)}\n`, "utf-8");
}

export function readState(cwd: string): GovernanceState | null {
  const path = statePath(cwd);
  if (!existsSync(path)) return null;

  const raw = readFileSync(path, "utf-8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new MatilhaUserError({
      summary: "invalid governance state.json",
      context: `matilha was reading ${path}`,
      problem: err instanceof Error ? err.message : String(err),
      nextActions: ["delete state.json and rerun 'matilha governance rebuild'"]
    });
  }

  const result = governanceStateSchema.safeParse(parsed);
  if (!result.success) {
    throw new MatilhaUserError({
      summary: "governance state.json fails schema validation",
      context: `matilha was validating ${path}`,
      problem: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      nextActions: ["delete state.json and rerun 'matilha governance rebuild'"]
    });
  }
  return result.data;
}
