import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import pc from "picocolors";
import { markEventProcessed, readPendingTaskCompletedEvents, type TaskCompletedEvent } from "../events/outbox";
import { markdownToAdf } from "./adf";
import { resolveJiraConfig } from "./config";
import { markJiraIssueSynced, readJiraIssueMap, recordCreatedJiraIssue, writeJiraIssueMap } from "./issueMap";
import { JiraClient } from "./jiraClient";
import {
  readJiraTaskContract,
  toJiraCreatePayloads,
  type JiraCreatePayload
} from "./contract";
import { JIRA_SKILL_MD, JIRA_TASKS_EXAMPLE_JSON, JIRA_TUTORIAL_MD } from "./templates";
import { detectTools, TOOL_TARGETS } from "../init/detectTools";
import { MatilhaUserError } from "../ui/errorFormat";

export type JiraCreateOptions = {
  summary: string;
  description?: string;
  type?: string;
  points?: string;
  project?: string;
  dryRun?: boolean;
};

export type JiraApplyOptions = {
  yes?: boolean;
  dryRun?: boolean;
  cwd?: string;
};

export type JiraInitOptions = {
  dryRun?: boolean;
};

export type JiraSyncOptions = {
  preview?: boolean;
  yes?: boolean;
};

export async function jiraCreateCommand(opts: JiraCreateOptions): Promise<void> {
  const dryRun = opts.dryRun ?? false;
  const storyPointsField = process.env.JIRA_STORY_POINTS_FIELD ?? process.env.JIRA_STORY_POINTS_CUSTOM_FIELD ?? "customfield_10016";
  const projectKey = opts.project ?? process.env.JIRA_PROJECT_KEY ?? "PROJECT";
  const fields = buildCreateIssueFields({
    ...opts,
    projectKey,
    storyPointsField
  });

  if (dryRun) {
    console.log(pc.bold("matilha jira create dry-run"));
    console.log(JSON.stringify({ fields }, null, 2));
    return;
  }

  const config = resolveJiraConfig(process.env, { projectKey: opts.project });
  const client = new JiraClient(config);
  const result = await client.createIssue(fields);
  console.log(pc.green("Jira issue created"));
  console.log(JSON.stringify(result, null, 2));
}

export async function jiraInitCommand(cwd: string, opts: JiraInitOptions = {}): Promise<void> {
  const dryRun = opts.dryRun ?? false;
  const targets = skillTargets(cwd);
  const files = [
    ...targets.map((dir) => ({
      path: join(cwd, dir, "skills", "matilha-jira", "SKILL.md"),
      content: JIRA_SKILL_MD
    })),
    {
      path: join(cwd, "docs", "matilha", "jira", "tasks.example.json"),
      content: JIRA_TASKS_EXAMPLE_JSON
    },
    {
      path: join(cwd, "docs", "matilha", "jira", "tutorial.md"),
      content: JIRA_TUTORIAL_MD
    }
  ];

  for (const file of files) {
    if (!dryRun) {
      mkdirSync(dirname(file.path), { recursive: true });
      writeFileSync(file.path, file.content, "utf-8");
    }
  }

  console.log(pc.green(dryRun ? "matilha jira init dry-run" : "matilha jira initialized"));
  for (const file of files) {
    console.log(`  ${file.path.replace(cwd + "/", "")}`);
  }
}

export async function jiraValidateCommand(path: string): Promise<void> {
  const contract = readJiraTaskContract(path);
  console.log(pc.green(`valid Jira task contract: ${contract.tasks.length} task(s)`));
}

export async function jiraPreviewCommand(path: string): Promise<void> {
  const contract = readJiraTaskContract(path);
  const payloads = toJiraCreatePayloads(contract);
  printPreview(payloads);
}

export async function jiraApplyCommand(path: string, opts: JiraApplyOptions = {}): Promise<void> {
  const contract = readJiraTaskContract(path);
  const payloads = toJiraCreatePayloads(contract);
  const cwd = opts.cwd ?? process.cwd();

  if (opts.dryRun) {
    printPreview(payloads);
    return;
  }

  if (!opts.yes) {
    throw new MatilhaUserError({
      summary: "Jira apply requires explicit approval",
      context: "matilha jira apply is a mutating operation",
      problem: "the command would create issues, comments, worklogs, and issue properties in Jira.",
      nextActions: [
        `review with 'matilha jira preview ${path}'`,
        `then apply with 'matilha jira apply ${path} --yes'`
      ]
    });
  }

  const config = resolveJiraConfig(process.env, { projectKey: contract.project_key });
  const client = new JiraClient(config);
  const created: string[] = [];

  for (const payload of payloads) {
    const result = await client.createIssue(payload.fields) as { key?: string; id?: string };
    const issueKey = result.key ?? result.id;
    if (!issueKey) {
      throw new MatilhaUserError({
        summary: "Jira createIssue response did not include key or id",
        context: `matilha jira apply created external_id ${payload.externalId}`,
        problem: JSON.stringify(result, null, 2),
        nextActions: ["inspect the Jira API response and retry after confirming the issue was not created twice"]
      });
    }

    for (const [propertyKey, value] of Object.entries(payload.properties)) {
      await client.setIssueProperty(issueKey, propertyKey, value);
    }
    for (const comment of payload.comments) {
      await client.addComment(issueKey, comment.body);
    }
    for (const worklog of payload.worklogs) {
      await client.addWorklog(issueKey, worklog);
    }
    recordCreatedJiraIssue(cwd, payload.externalId, issueKey);
    created.push(`${payload.externalId} -> ${issueKey}`);
  }

  console.log(pc.green(`Jira apply complete: ${created.length} issue(s)`));
  for (const line of created) console.log(`  ${line}`);
}

export async function jiraSyncCommand(cwd: string, opts: JiraSyncOptions = {}): Promise<void> {
  const events = readPendingTaskCompletedEvents(cwd);
  const issueMap = readJiraIssueMap(cwd);
  const preview = opts.preview ?? false;

  if (!preview && !opts.yes) {
    throw new MatilhaUserError({
      summary: "Jira sync requires explicit approval",
      context: "matilha jira sync is a mutating operation",
      problem: "the command may add comments, worklogs, issue fields, and issue properties in Jira.",
      nextActions: [
        "review with 'matilha jira sync --preview'",
        "then apply with 'matilha jira sync --yes'"
      ]
    });
  }

  printSyncPlan(events.map((event) => ({
    event,
    jiraKey: issueMap.issues[event.event.external_id]?.jira_key
  })), preview);

  if (preview || events.length === 0) return;

  const config = resolveJiraConfig(process.env);
  const client = new JiraClient(config);
  const storyPointsField = process.env.JIRA_STORY_POINTS_FIELD ?? process.env.JIRA_STORY_POINTS_CUSTOM_FIELD ?? "customfield_10016";
  let nextMap = issueMap;
  let synced = 0;
  let skipped = 0;

  for (const pending of events) {
    const issue = nextMap.issues[pending.event.external_id];
    if (!issue) {
      skipped++;
      continue;
    }

    const event = pending.event;
    const fields: Record<string, unknown> = {};
    if (event.result.story_points !== undefined) {
      fields[storyPointsField] = event.result.story_points;
    }
    if (Object.keys(fields).length > 0) {
      await client.updateIssueFields(issue.jira_key, fields);
    }

    const comment = completionComment(event);
    await client.addComment(issue.jira_key, markdownToAdf(comment));

    if (event.result.worklog) {
      await client.addWorklog(issue.jira_key, {
        timeSpent: event.result.worklog,
        comment: markdownToAdf(comment)
      });
    }

    const syncedAt = new Date().toISOString();
    await client.setIssueProperty(issue.jira_key, "matilha.last_event", {
      event_id: event.id,
      external_id: event.external_id,
      synced_at: syncedAt,
      source: event.source,
      result: event.result
    });
    nextMap = markJiraIssueSynced(nextMap, event.external_id, syncedAt);
    markEventProcessed(cwd, pending.path);
    synced++;
  }

  writeJiraIssueMap(cwd, nextMap);
  console.log(pc.green(`Jira sync complete: ${synced} event(s) synced, ${skipped} unmapped`));
}

type BuildFieldsInput = JiraCreateOptions & {
  projectKey: string;
  storyPointsField: string;
};

export function buildCreateIssueFields(input: BuildFieldsInput): Record<string, unknown> {
  const fields: Record<string, unknown> = {
    project: { key: input.projectKey },
    summary: input.summary,
    issuetype: { name: input.type ?? "Task" },
    description: markdownToAdf(input.description ?? input.summary)
  };

  if (input.points !== undefined) {
    const points = Number(input.points);
    fields[input.storyPointsField] = Number.isFinite(points) ? points : input.points;
  }

  return fields;
}

function skillTargets(cwd: string): string[] {
  const dirs = new Set<string>([".agents"]);
  for (const tool of detectTools(cwd)) {
    const dir = TOOL_TARGETS[tool].skillDir;
    if (dir) dirs.add(dir);
  }

  if (existsSync(join(cwd, ".cursor"))) dirs.add(".cursor");
  return [...dirs];
}

function printPreview(payloads: JiraCreatePayload[]): void {
  console.log(pc.bold("matilha jira preview"));
  console.log(pc.dim(`${payloads.length} task(s) ready for controlled apply`));
  console.log("");
  console.log("external_id          | type  | points | summary");
  console.log("---------------------|-------|--------|----------------");
  for (const payload of payloads) {
    const type = ((payload.fields.issuetype as { name?: string }).name ?? "Task").padEnd(5);
    const storyField = Object.entries(payload.fields).find(([key]) => key.startsWith("customfield_"));
    const points = String(storyField?.[1] ?? "-").padEnd(6);
    console.log(`${payload.externalId.padEnd(20)} | ${type} | ${points} | ${payload.fields.summary}`);
  }
  console.log("");
  if (payloads.length > 25) {
    console.log(pc.dim(`converted Jira payload omitted for large batch (${payloads.length} tasks). Review the contract file as the source of truth.`));
    return;
  }
  console.log(JSON.stringify({ issues: payloads }, null, 2));
}

function printSyncPlan(
  rows: Array<{ event: { path: string; event: TaskCompletedEvent }; jiraKey?: string }>,
  preview: boolean
): void {
  console.log(pc.bold(preview ? "matilha jira sync preview" : "matilha jira sync"));
  console.log(pc.dim(`${rows.length} pending event(s)`));
  if (rows.length === 0) return;
  console.log("");
  console.log("external_id          | jira    | event");
  console.log("---------------------|---------|----------------");
  for (const row of rows) {
    console.log(`${row.event.event.external_id.padEnd(20)} | ${(row.jiraKey ?? "unmapped").padEnd(7)} | ${row.event.event.id}`);
  }
}

function completionComment(event: TaskCompletedEvent): string {
  if (event.result.comment_markdown) return event.result.comment_markdown;
  const evidence = event.result.evidence.length > 0 ? ` Evidence: ${event.result.evidence.join(", ")}.` : "";
  return `${event.source.sp} completed by Matilha.${evidence}`;
}
