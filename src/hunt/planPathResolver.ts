import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { MatilhaUserError } from "../ui/errorFormat";

const SEARCH_DIRS = ["docs/matilha/plans", "docs/superpowers/plans"];

export function resolvePlanPath(cwd: string, slug: string): string {
  for (const dir of SEARCH_DIRS) {
    const absDir = join(cwd, dir);
    if (!existsSync(absDir)) continue;
    const entries = readdirSync(absDir);
    const match = entries.find((e) => e === `${slug}-plan.md` || e.endsWith(`-${slug}-plan.md`));
    if (match) return join(absDir, match);
  }
  throw new MatilhaUserError({
    summary: `plan not found for feature "${slug}"`,
    context: `matilha hunt was looking in docs/matilha/plans/ and docs/superpowers/plans/`,
    problem: `no file named ${slug}-plan.md (or <date>-${slug}-plan.md) exists in either directory.`,
    nextActions: [
      `run 'matilha plan ${slug}' to scaffold the plan first`,
      `or check the slug spelling and the plan file name`
    ],
    example: `matilha plan ${slug} --import-research <research.md>`
  });
}
