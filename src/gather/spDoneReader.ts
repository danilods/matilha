// src/gather/spDoneReader.ts
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import { z } from "zod";
import { MatilhaUserError } from "../ui/errorFormat";

const spDoneSchema = z.object({
  type: z.literal("sp-done"),
  sp_id: z.string().regex(/^SP\d+$/),
  feature: z.string().min(1),
  wave: z.string().regex(/^w\d+$/),
  status: z.literal("completed"),
  completed_at: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/),
  commits: z.array(z.string().min(1)).min(1),
  tests: z.object({
    passed: z.literal(true),
    count: z.number().int().positive()
  })
});

export type SPDone = z.infer<typeof spDoneSchema>;

export type ExpectedContext = {
  sp_id: string;
  feature: string;
  wave: string;
};

function matilhaErrorFor(sp_id: string, summary: string, problem: string, nextActions: string[]): MatilhaUserError {
  return new MatilhaUserError({
    summary: `${sp_id} ${summary}`,
    context: `matilha gather was validating SP-DONE.md gates for ${sp_id}`,
    problem,
    nextActions
  });
}

export function readAndValidateSPDone(worktreePath: string, expected: ExpectedContext): SPDone {
  const path = join(worktreePath, "SP-DONE.md");

  if (!existsSync(path)) {
    throw matilhaErrorFor(
      expected.sp_id,
      "missing SP-DONE.md",
      `${path} does not exist; the SP has not written its completion marker.`,
      [
        `inspect the worktree: cd ${worktreePath}`,
        `ensure the SP author filled SP-DONE.md, committed it, and the branch holds that commit`
      ]
    );
  }

  const raw = readFileSync(path, "utf-8");
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) {
    throw matilhaErrorFor(
      expected.sp_id,
      "SP-DONE.md has no frontmatter",
      `${path} lacks a YAML frontmatter block between '---' fences.`,
      [
        `open the file and restore the frontmatter from templates/sp-done.md.tmpl`,
        `or re-dispatch the SP: matilha hunt <slug> --force --wave <N>`
      ]
    );
  }

  const parsed = parseYaml(fmMatch[1]!);
  const result = spDoneSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues.map((i) => {
      const received = "received" in i ? ` (received: ${JSON.stringify((i as { received: unknown }).received)})` : "";
      return `${i.path.join(".")}: ${i.message}${received}`;
    }).join("; ");
    throw matilhaErrorFor(
      expected.sp_id,
      "SP-DONE.md fails strict gates",
      `schema violation: ${issues}`,
      [
        `fix the frontmatter to match: status=completed, tests.passed=true, non-empty commits[], tests.count>=1, completed_at non-null`,
        `see templates/sp-done.md.tmpl for the canonical shape`
      ]
    );
  }

  const sp = result.data;
  if (sp.sp_id !== expected.sp_id || sp.feature !== expected.feature || sp.wave !== expected.wave) {
    throw matilhaErrorFor(
      expected.sp_id,
      "SP-DONE.md context drift",
      `expected sp_id=${expected.sp_id}, feature=${expected.feature}, wave=${expected.wave}; got sp_id=${sp.sp_id}, feature=${sp.feature}, wave=${sp.wave}.`,
      [
        `verify you are gathering the correct wave — pass --wave ${expected.wave.slice(1)} explicitly`,
        `or regenerate the SP-DONE.md if the worktree was reused across features`
      ]
    );
  }

  return sp;
}
