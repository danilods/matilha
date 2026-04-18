import { z } from "zod";
import { ARCHETYPES, TOOLS } from "../config";

const archetypeEnum = z.enum(ARCHETYPES);

// Install keys: any TOOLS member OR the literal "universal" (cross-tool command)
const installKeyValues = [...TOOLS, "universal"] as const;
const installKeySchema = z.enum(installKeyValues);

export const companionSchema = z.object({
  slug: z.string().regex(/^[a-z0-9](?:[a-z0-9-_]*[a-z0-9])?$/),
  name: z.string().min(1),
  description: z.string().min(1),
  detect: z.record(z.enum(TOOLS), z.string()).refine(
    (obj) => Object.keys(obj).length >= 1,
    { message: "detect must have at least one tool path" }
  ),
  install: z.record(installKeySchema, z.string()),
  tutorial: z.object({
    title: z.string().min(1),
    body: z.string().min(1)
  }),
  optional_per_archetype: z.array(archetypeEnum)
});
export type Companion = z.infer<typeof companionSchema>;

export const companionsFileSchema = z.record(z.string(), companionSchema);
export type CompanionsFile = z.infer<typeof companionsFileSchema>;
