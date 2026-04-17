import { z } from "zod";

const isoDateTime = z.string().regex(
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/,
  "Must be ISO 8601 UTC datetime"
);

const waveStatus = z.enum(["pending", "in_progress", "completed", "failed"]);
const spStatus = z.enum(["pending", "in_progress", "completed", "failed"]);
const regressionStatus = z.enum(["pending", "passed", "failed"]);

const spEntry = z.object({
  branch: z.string().min(1),
  worktree: z.string().min(1),
  status: spStatus,
  started: isoDateTime.nullable(),
  session_id: z.string().nullable()
});

export const waveSchema = z
  .object({
    wave: z.string().regex(/^w\d+$/),
    created: isoDateTime,
    started: isoDateTime.nullable(),
    ended: isoDateTime.nullable(),
    status: waveStatus,
    plan: z.string().min(1),
    sps: z.record(z.string().regex(/^SP\d+$/), spEntry).refine(
      (obj) => Object.keys(obj).length > 0,
      { message: "At least one SP required" }
    ),
    merge_order: z.array(z.string().regex(/^SP\d+$/)).min(1),
    regression_status: regressionStatus,
    review_report: z.string().nullable()
  })
  .refine(
    (data) => data.merge_order.every((sp) => sp in data.sps),
    { message: "merge_order contains SP not defined in sps", path: ["merge_order"] }
  );

export type Wave = z.infer<typeof waveSchema>;
