import { readFileSync } from "node:fs";
import { z } from "zod";
import { MatilhaUserError } from "../ui/errorFormat";
import { markdownToAdf } from "./adf";

export const jiraTaskContractSchema = z.object({
  schema_version: z.literal(1),
  project_key: z.string().min(1),
  defaults: z.object({
    issue_type: z.string().min(1).default("Task"),
    labels: z.array(z.string().min(1)).default([]),
    story_points_field: z.string().min(1).default("customfield_10016")
  }).default({}),
  tasks: z.array(z.object({
    external_id: z.string().min(1),
    issue_type: z.string().min(1).optional(),
    summary: z.string().min(1),
    description_markdown: z.string().min(1),
    story_points: z.number().nonnegative().optional(),
    labels: z.array(z.string().min(1)).default([]),
    parent_external_id: z.string().min(1).optional(),
    category: z.string().min(1).optional(),
    issue_kind: z.enum(["foundation", "component", "feature", "risk"]).optional(),
    phase: z
      .object({
        matilha: z.number().int().optional(),
        argos: z.string().min(1).optional()
      })
      .optional(),
    source: z.object({
      spec: z.string().min(1).optional(),
      plan: z.string().min(1).optional(),
      sp: z.string().min(1).optional(),
      phase: z.number().int().optional()
    }).default({}),
    comments: z.array(z.object({
      body_markdown: z.string().min(1)
    })).default([]),
    worklogs: z.array(z.object({
      time_spent: z.string().min(1),
      started: z.string().min(1).optional(),
      comment_markdown: z.string().min(1).optional()
    })).default([])
  })).min(1)
});

export type JiraTaskContract = z.infer<typeof jiraTaskContractSchema>;
export type JiraTask = JiraTaskContract["tasks"][number];

export type JiraCreatePayload = {
  externalId: string;
  fields: Record<string, unknown>;
  properties: Record<string, unknown>;
  comments: Array<{ body: unknown }>;
  worklogs: Array<{ timeSpent: string; started?: string; comment?: unknown }>;
};

export function parseJiraTaskContract(input: unknown): JiraTaskContract {
  const result = jiraTaskContractSchema.safeParse(input);
  if (!result.success) {
    throw new MatilhaUserError({
      summary: "invalid Jira task contract",
      context: "matilha jira was validating the JSON contract",
      problem: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      nextActions: [
        "fix the JSON contract and rerun 'matilha jira validate <file>'",
        "generate a fresh example with 'matilha jira init'"
      ]
    });
  }

  const seen = new Set<string>();
  for (const task of result.data.tasks) {
    if (seen.has(task.external_id)) {
      throw new MatilhaUserError({
        summary: "duplicate external_id in Jira task contract",
        context: "matilha jira uses external_id as the stable task identity",
        problem: `duplicate external_id: ${task.external_id}`,
        nextActions: [
          "make each task external_id unique",
          "use a stable convention like <feature-slug>-SP1"
        ]
      });
    }
    seen.add(task.external_id);
  }

  return result.data;
}

export function readJiraTaskContract(path: string): JiraTaskContract {
  const raw = readFileSync(path, "utf-8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new MatilhaUserError({
      summary: "Jira task contract is not valid JSON",
      context: `matilha jira was reading ${path}`,
      problem: err instanceof Error ? err.message : String(err),
      nextActions: [
        "fix the JSON syntax",
        "rerun 'matilha jira validate <file>'"
      ]
    });
  }
  return parseJiraTaskContract(parsed);
}

export function toJiraCreatePayloads(contract: JiraTaskContract): JiraCreatePayload[] {
  return contract.tasks.map((task) => {
    const labels = [
      ...new Set([
        ...contract.defaults.labels,
        ...task.labels,
        ...(task.category ? [task.category] : [])
      ])
    ];
    const storyPointsField = contract.defaults.story_points_field;
    const fields: Record<string, unknown> = {
      project: { key: contract.project_key },
      summary: task.summary,
      issuetype: { name: task.issue_type ?? contract.defaults.issue_type },
      description: markdownToAdf(task.description_markdown),
      labels
    };

    if (task.story_points !== undefined) {
      fields[storyPointsField] = task.story_points;
    }

    return {
      externalId: task.external_id,
      fields,
      properties: {
        "matilha.external_id": { external_id: task.external_id },
        "matilha.source": task.source,
        "matilha.taxonomy": {
          category: task.category ?? null,
          issue_kind: task.issue_kind ?? null,
          phase: task.phase ?? null
        }
      },
      comments: task.comments.map((comment) => ({ body: markdownToAdf(comment.body_markdown) })),
      worklogs: task.worklogs.map((worklog) => {
        const entry: { timeSpent: string; started?: string; comment?: unknown } = {
          timeSpent: worklog.time_spent
        };
        if (worklog.started) entry.started = worklog.started;
        if (worklog.comment_markdown) entry.comment = markdownToAdf(worklog.comment_markdown);
        return entry;
      })
    };
  });
}
