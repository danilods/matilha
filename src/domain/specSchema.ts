import { z } from "zod";
import { ARCHETYPES } from "../config";

const gateValue = z.enum(["yes", "no", "pending"]);

const phase10Gates = z.object({
  problem_defined: gateValue,
  target_user_clear: gateValue,
  success_metrics_defined: gateValue,
  scope_boundaries_locked: gateValue
});

export const specSchema = z.object({
  name: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  created: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  archetype: z.enum(ARCHETYPES),
  methodology_phase: z.union([
    z.literal(0), z.literal(10), z.literal(20), z.literal(30),
    z.literal(40), z.literal(50), z.literal(60), z.literal(70)
  ]),
  gates_covered: phase10Gates
});

export type Spec = z.infer<typeof specSchema>;
