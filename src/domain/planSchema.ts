import { z } from "zod";

const waveKeyPattern = /^w\d+$/;
const spKeyPattern = /^SP\d+$/;

export const planSchema = z.object({
  name: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  spec: z.string().min(1),
  created: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  waves: z
    .record(
      z.string().regex(waveKeyPattern, "Wave key must match w<N> (e.g. w1, w2)"),
      z.array(z.string().regex(spKeyPattern, "SP key must match SP<N> (e.g. SP1)")).min(1)
    )
    .refine((obj) => Object.keys(obj).length > 0, {
      message: "At least one wave is required"
    })
});

export type Plan = z.infer<typeof planSchema>;
