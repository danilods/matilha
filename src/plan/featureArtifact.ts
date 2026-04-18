import type { Frontmatter } from "../util/frontmatter";
import type { ProjectStatus } from "../domain/projectStatusSchema";

export type FeatureArtifactInput = {
  name: string;
  specPath: string;  // relative to project root
  planPath: string;
  wave: string;      // "w1" format
  ownedBy: "matilha" | "superpowers";
};

/**
 * Append a FeatureArtifact entry to project-status.md data.
 * Returns the modified Frontmatter (caller calls writeProjectStatus).
 */
export function appendFeatureArtifact(
  fm: Frontmatter<ProjectStatus>,
  input: FeatureArtifactInput
): Frontmatter<ProjectStatus> {
  const entry = {
    name: input.name,
    spec: input.specPath,
    plan: input.planPath,
    phase: "planning" as const,
    wave: input.wave,
    owned_by: input.ownedBy
  };
  fm.data.feature_artifacts = [...fm.data.feature_artifacts, entry];
  return fm;
}
