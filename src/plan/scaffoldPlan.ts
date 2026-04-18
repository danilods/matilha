import { renderTemplate } from "../init/renderTemplate";

export type ScaffoldPlanInput = {
  featureSlug: string;
  date: string;
  specRelativePath: string;
};

export function scaffoldPlan(source: string, input: ScaffoldPlanInput): string {
  const title = input.featureSlug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return renderTemplate(source, {
    feature_slug: input.featureSlug,
    feature_title: title,
    date: input.date,
    spec_relative_path: input.specRelativePath
  });
}
