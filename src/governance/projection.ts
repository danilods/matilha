import { z } from "zod";
import type { GovernanceEvent } from "./events";

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
  rebuiltAt: string = new Date().toISOString()
): GovernanceState {
  const byIssue = new Map<string, GovernanceEvent[]>();
  for (const event of events) {
    const list = byIssue.get(event.external_id) ?? [];
    list.push(event);
    byIssue.set(event.external_id, list);
  }

  const issues: Record<string, IssueState> = {};
  for (const [externalId, list] of byIssue) {
    const sorted = [...list].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    issues[externalId] = projectIssue(sorted);
  }
  return { schema_version: GOVERNANCE_STATE_VERSION, rebuilt_at: rebuiltAt, issues };
}

function projectIssue(sorted: GovernanceEvent[]): IssueState {
  let status: IssueState["status"] = "created";
  let storyPoints: number | null = null;
  let category: string | null = null;
  let issueKind: string | null = null;
  let jiraKey: string | null = null;
  let agent: IssueState["agent"] = null;
  const intervals: Array<{ start: string; end: string }> = [];
  const commits: string[] = [];
  let openStart: string | null = null;
  let sawStart = false;

  for (const event of sorted) {
    if (event.issue_key) jiraKey = event.issue_key;
    agent = { tool: event.actor.tool, ...(event.actor.model ? { model: event.actor.model } : {}) };

    if (event.type === "task.created") {
      if (event.payload.story_points !== undefined) storyPoints = event.payload.story_points;
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
        if (!commits.includes(commit)) commits.push(commit);
      }
      status = "completed";
    }
  }

  const minutes = intervals.reduce((sum, i) => sum + diffMinutes(i.start, i.end), 0);
  const last = sorted[sorted.length - 1]!;
  return {
    jira_key: jiraKey,
    status,
    story_points: storyPoints,
    worklog_active_minutes: round1(minutes),
    worklog_estimated: status === "completed" && !sawStart,
    intervals,
    commits,
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
