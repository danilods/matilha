import { z } from "zod";
import { ARCHETYPES } from "../config";

const gateValue = z.enum(["yes", "no", "pending"]);

const phase10Gates = z.object({
  problem_defined: gateValue,
  target_user_clear: gateValue,
  rfs_enumerated: gateValue,
  rnfs_covered: gateValue,
  risks_listed: gateValue,
  premissas_listed: gateValue,
  success_metrics_defined: gateValue,
  aha_moment_identified: gateValue,
  scope_boundaries_locked: gateValue,
  peer_review_done: gateValue
});

const phase20Gates = z.object({
  stack_table_declared: gateValue,
  architecture_doc_exists: gateValue,
  rnf_traceability: gateValue,
  docker_compose_mirrors_prod: gateValue,
  env_example_created: gateValue,
  versions_pinned: gateValue
});

const phase30Gates = z.object({
  claude_md_declares_stack_rules: gateValue,
  skills_by_domain: gateValue,
  skills_by_key_tech: gateValue,
  agents_with_models: gateValue,
  one_blocking_hook: gateValue
});

export const specSchema = z.object({
  name: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  created: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  archetype: z.enum(ARCHETYPES),
  methodology_phase: z.union([
    z.literal(0), z.literal(10), z.literal(20), z.literal(30),
    z.literal(40), z.literal(50), z.literal(60), z.literal(70)
  ]),
  gates_covered: z.union([phase10Gates, phase20Gates, phase30Gates])
});

export type Spec = z.infer<typeof specSchema>;
export type Phase10Gates = z.infer<typeof phase10Gates>;
export type Phase20Gates = z.infer<typeof phase20Gates>;
export type Phase30Gates = z.infer<typeof phase30Gates>;
