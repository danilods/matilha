import { randomUUID } from "node:crypto";
import { z } from "zod";
import { MatilhaUserError } from "../ui/errorFormat";

export const GOVERNANCE_SCHEMA_VERSION = 1;

const isoTimestamp = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/, "must be an ISO 8601 UTC timestamp");

export const actorSchema = z.object({
  tool: z.string().min(1),
  model: z.string().min(1).optional(),
  session_id: z.string().min(1).optional()
});
export type Actor = z.infer<typeof actorSchema>;

const baseFields = {
  schema_version: z.literal(GOVERNANCE_SCHEMA_VERSION),
  event_id: z.string().min(1),
  external_id: z.string().min(1),
  issue_key: z.string().min(1).nullable(),
  timestamp: isoTimestamp,
  actor: actorSchema
};

const taskCreatedSchema = z.object({
  ...baseFields,
  type: z.literal("task.created"),
  payload: z
    .object({
      summary: z.string().min(1).optional(),
      category: z.string().min(1).optional(),
      issue_kind: z.string().min(1).optional()
    })
    .default({})
});

const taskStartedSchema = z.object({
  ...baseFields,
  type: z.literal("task.started"),
  payload: z.object({}).default({})
});

const taskResumedSchema = z.object({
  ...baseFields,
  type: z.literal("task.resumed"),
  payload: z.object({}).default({})
});

const taskPausedSchema = z.object({
  ...baseFields,
  type: z.literal("task.paused"),
  payload: z.object({ reason: z.string().min(1).optional() }).default({})
});

const taskProgressSchema = z.object({
  ...baseFields,
  type: z.literal("task.progress"),
  payload: z
    .object({
      commits: z.array(z.string().min(1)).default([]),
      summary_markdown: z.string().min(1).optional()
    })
    .default({})
});

const taskCompletedSchema = z.object({
  ...baseFields,
  type: z.literal("task.completed"),
  payload: z
    .object({
      commits: z.array(z.string().min(1)).default([]),
      summary_markdown: z.string().min(1).optional()
    })
    .default({})
});

export const governanceEventSchema = z.discriminatedUnion("type", [
  taskCreatedSchema,
  taskStartedSchema,
  taskResumedSchema,
  taskPausedSchema,
  taskProgressSchema,
  taskCompletedSchema
]);

export type GovernanceEvent = z.infer<typeof governanceEventSchema>;
export type GovernanceEventType = GovernanceEvent["type"];

export function parseGovernanceEvent(input: unknown): GovernanceEvent {
  const result = governanceEventSchema.safeParse(input);
  if (!result.success) {
    throw new MatilhaUserError({
      summary: "invalid Matilha governance event",
      context: "matilha governance was validating an event",
      problem: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      nextActions: [
        "fix or remove the invalid event line in docs/matilha/governance/events.ndjson",
        "rerun 'matilha governance rebuild'"
      ]
    });
  }
  return result.data;
}

export type NewEventInput = {
  type: GovernanceEventType;
  external_id: string;
  issue_key?: string | null;
  actor: Actor;
  payload?: Record<string, unknown>;
  timestamp?: string;
  event_id?: string;
};

export function makeGovernanceEvent(input: NewEventInput): GovernanceEvent {
  return parseGovernanceEvent({
    schema_version: GOVERNANCE_SCHEMA_VERSION,
    event_id: input.event_id ?? randomUUID(),
    type: input.type,
    external_id: input.external_id,
    issue_key: input.issue_key ?? null,
    timestamp: input.timestamp ?? new Date().toISOString(),
    actor: input.actor,
    payload: input.payload ?? {}
  });
}

export function resolveActor(env: NodeJS.ProcessEnv = process.env): Actor {
  const actor: Actor = { tool: env.MATILHA_AGENT_TOOL ?? "cli" };
  if (env.MATILHA_AGENT_MODEL) actor.model = env.MATILHA_AGENT_MODEL;
  if (env.MATILHA_SESSION_ID) actor.session_id = env.MATILHA_SESSION_ID;
  return actor;
}

const ISSUE_KEY_SHAPE = /^[A-Z][A-Z0-9]+-\d+$/;

export function looksLikeIssueKey(id: string): boolean {
  return ISSUE_KEY_SHAPE.test(id);
}
