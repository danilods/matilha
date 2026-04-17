import { z } from "zod";
import {
  ARCHETYPES,
  PHASE_STATUSES,
  TOOLS,
  COMPANION_STATUSES,
  AESTHETIC_DIRECTIONS,
  SCHEMA_VERSION
} from "../config";

const isoDateTime = z.string().regex(
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/,
  "Must be ISO 8601 UTC datetime"
);

const gateValue = z.enum(["yes", "no", "pending"]);
const gateObject = z.record(z.string(), gateValue);

const featureArtifact = z.object({
  name: z.string().min(1),
  spec: z.string().min(1),
  plan: z.string().min(1),
  phase: z.enum(["planning", "in_progress", "completed", "blocked"]),
  wave: z.string().regex(/^w\d+$/),
  owned_by: z.enum(["matilha", "superpowers"])
});

const decision = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  what: z.string().min(1),
  why: z.string().min(1)
});

export const projectStatusSchema = z.object({
  schema_version: z.literal(SCHEMA_VERSION),
  name: z.string().min(1).max(100),
  archetype: z.enum(ARCHETYPES),
  created: isoDateTime,
  last_update: isoDateTime,

  current_phase: z.union([
    z.literal(0), z.literal(10), z.literal(20), z.literal(30),
    z.literal(40), z.literal(50), z.literal(60), z.literal(70)
  ]),
  phase_status: z.enum(PHASE_STATUSES),
  next_action: z.string().min(1),

  phase_00_gates: gateObject.optional(),
  phase_10_gates: gateObject.optional(),
  phase_20_gates: gateObject.optional(),
  phase_30_gates: gateObject.optional(),
  phase_40_gates: gateObject.optional(),
  phase_50_gates: gateObject.optional(),
  phase_60_gates: gateObject.optional(),
  phase_70_gates: gateObject.optional(),

  aesthetic_direction: z.enum(AESTHETIC_DIRECTIONS).nullable().optional(),
  design_locked: z.boolean().optional(),

  tools_detected: z.array(z.enum(TOOLS)).min(1),

  companion_skills: z.object({
    impeccable: z.enum(COMPANION_STATUSES),
    shadcn: z.enum(COMPANION_STATUSES),
    superpowers: z.enum(COMPANION_STATUSES),
    typeui: z.enum(COMPANION_STATUSES)
  }),

  active_waves: z.array(z.string().regex(/^w\d+$/)),
  completed_waves: z.array(z.string()),
  feature_artifacts: z.array(featureArtifact),
  recent_decisions: z.array(decision).max(10),
  pending_decisions: z.array(z.string()),
  blockers: z.array(z.string()),

  links: z.object({
    latest_prd: z.string().optional(),
    design_spec: z.string().optional(),
    latest_review: z.string().optional()
  }).optional()
});

export type ProjectStatus = z.infer<typeof projectStatusSchema>;
