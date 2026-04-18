import type { ImportedResearch } from "./importResearch";
import { renderTemplate } from "../init/renderTemplate";

export type ScaffoldSpecInput = {
  featureSlug: string;
  archetype: string;
  date: string;           // YYYY-MM-DD
  planRelativePath: string;
  research?: ImportedResearch;
};

/**
 * Render the spec scaffold from template source + input vars.
 * Does NOT touch disk. Pure function.
 */
export function scaffoldSpec(source: string, input: ScaffoldSpecInput): string {
  const title = toTitle(input.featureSlug);
  const researchBlock = input.research ? buildResearchBlock(input.research, input.date) : "";

  return renderTemplate(source, {
    feature_slug: input.featureSlug,
    feature_title: title,
    archetype: input.archetype,
    date: input.date,
    plan_relative_path: input.planRelativePath,
    research_context_block: researchBlock
  });
}

function toTitle(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function buildResearchBlock(research: ImportedResearch, date: string): string {
  return `## 1. Research Context (imported)

> Imported from \`${research.filename}\` on ${date} by \`matilha plan --import-research\`.
> Content preserved verbatim including citations.

<!-- MATILHA_RESEARCH_START -->
${research.content}
<!-- MATILHA_RESEARCH_END -->
`;
}
