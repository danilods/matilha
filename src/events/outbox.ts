import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { z } from "zod";
import type { SPDone } from "../gather/spDoneReader";
import { MatilhaUserError } from "../ui/errorFormat";

const taskCompletedEventSchema = z.object({
  schema_version: z.literal(1),
  event: z.literal("task.completed"),
  id: z.string().min(1),
  created_at: z.string().min(1),
  external_id: z.string().min(1),
  source: z.object({
    feature: z.string().min(1),
    wave: z.string().min(1),
    sp: z.string().min(1),
    plan: z.string().min(1).optional(),
    branch: z.string().min(1).optional()
  }),
  result: z.object({
    status: z.literal("completed"),
    story_points: z.number().nonnegative().optional(),
    worklog: z.string().min(1).optional(),
    comment_markdown: z.string().min(1).optional(),
    evidence: z.array(z.string().min(1)).default([])
  })
});

export type TaskCompletedEvent = z.infer<typeof taskCompletedEventSchema>;

export type TaskCompletedEventInput = {
  featureSlug: string;
  wave: string;
  spId: string;
  plan?: string;
  branch?: string;
  spDone: SPDone;
};

export type PendingEvent = {
  path: string;
  event: TaskCompletedEvent;
};

export function emitTaskCompletedEvent(
  cwd: string,
  input: TaskCompletedEventInput
): { status: "written" | "exists"; path: string } {
  const event = buildTaskCompletedEvent(input);
  const outbox = outboxDir(cwd);
  const processed = processedDir(cwd);
  const fileName = `${sanitizeFileName(event.id)}.json`;
  const pendingPath = join(outbox, fileName);
  const processedPath = join(processed, fileName);

  if (existsSync(pendingPath) || existsSync(processedPath)) {
    return { status: "exists", path: existsSync(pendingPath) ? pendingPath : processedPath };
  }

  mkdirSync(outbox, { recursive: true });
  writeFileSync(pendingPath, `${JSON.stringify(event, null, 2)}\n`, "utf-8");
  return { status: "written", path: pendingPath };
}

export function readPendingTaskCompletedEvents(cwd: string): PendingEvent[] {
  const outbox = outboxDir(cwd);
  if (!existsSync(outbox)) return [];

  return readdirSync(outbox)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .map((file) => {
      const path = join(outbox, file);
      const raw = readFileSync(path, "utf-8");
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch (err) {
        throw new MatilhaUserError({
          summary: "invalid Matilha event JSON",
          context: `matilha was reading ${path}`,
          problem: err instanceof Error ? err.message : String(err),
          nextActions: ["fix or remove the invalid event file, then rerun the sync command"]
        });
      }
      const result = taskCompletedEventSchema.safeParse(parsed);
      if (!result.success) {
        throw new MatilhaUserError({
          summary: "invalid Matilha task.completed event",
          context: `matilha was validating ${path}`,
          problem: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
          nextActions: ["fix the event file or regenerate it from the completion source"]
        });
      }
      return { path, event: result.data };
    });
}

export function markEventProcessed(cwd: string, eventPath: string): string {
  const processed = processedDir(cwd);
  mkdirSync(processed, { recursive: true });
  const nextPath = join(processed, basename(eventPath));
  renameSync(eventPath, nextPath);
  return nextPath;
}

function buildTaskCompletedEvent(input: TaskCompletedEventInput): TaskCompletedEvent {
  const createdAt = new Date().toISOString();
  const id = `task.completed:${input.featureSlug}:${input.spId}:${input.spDone.completed_at}`;
  const event: TaskCompletedEvent = {
    schema_version: 1,
    event: "task.completed",
    id,
    created_at: createdAt,
    external_id: `${input.featureSlug}-${input.spId}`,
    source: {
      feature: input.featureSlug,
      wave: input.wave,
      sp: input.spId,
      ...(input.plan ? { plan: input.plan } : {}),
      ...(input.branch ? { branch: input.branch } : {})
    },
    result: {
      status: "completed",
      ...(input.spDone.tracking.story_points !== undefined ? { story_points: input.spDone.tracking.story_points } : {}),
      ...(input.spDone.tracking.worklog ? { worklog: input.spDone.tracking.worklog } : {}),
      comment_markdown: input.spDone.tracking.comment_markdown ?? `${input.spId} completed by Matilha merge. Regression passed.`,
      evidence: [
        "SP-DONE.md",
        `${input.spDone.tests.count} test(s) passed`,
        ...input.spDone.commits.map((commit) => `commit:${commit}`),
        ...(input.spDone.tracking.observations ?? [])
      ]
    }
  };
  return event;
}

function outboxDir(cwd: string): string {
  return join(cwd, "docs", "matilha", "events", "outbox");
}

function processedDir(cwd: string): string {
  return join(cwd, "docs", "matilha", "events", "processed");
}

function sanitizeFileName(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-");
}
