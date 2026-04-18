import { mkdirSync, existsSync, writeFileSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import pc from "picocolors";
import { RegistryClient } from "../registry/registryClient";
import { readProjectStatus, writeProjectStatus } from "../util/projectStatus";
import { importResearch } from "./importResearch";
import { scaffoldSpec } from "./scaffoldSpec";
import { scaffoldPlan } from "./scaffoldPlan";
import { appendFeatureArtifact } from "./featureArtifact";
import { PHASE_GATE_KEYS } from "../config";
import type { ImportedResearch } from "./importResearch";

export type PlanCommandOptions = {
  importResearchPath?: string;
  archetype?: string;
  dryRun?: boolean;
  force?: boolean;
  registryClient?: RegistryClient;
};

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

export async function planCommand(
  cwd: string,
  featureSlug: string,
  opts: PlanCommandOptions = {}
): Promise<void> {
  if (!SLUG_RE.test(featureSlug)) {
    throw new Error(`Invalid feature slug "${featureSlug}". Must be lowercase kebab-case.`);
  }

  // Phase 1: preconditions
  const fm = await readProjectStatus(cwd);
  if (fm.data.current_phase < 10) {
    throw new Error(
      `Phase ${fm.data.current_phase} is before PRD phase. Run \`matilha scout\` to complete Phase 00 first.`
    );
  }

  const date = new Date().toISOString().slice(0, 10);
  const specRelPath = `docs/matilha/specs/${date}-${featureSlug}-spec.md`;
  const planRelPath = `docs/matilha/plans/${date}-${featureSlug}-plan.md`;
  const specAbsPath = join(cwd, specRelPath);
  const planAbsPath = join(cwd, planRelPath);

  if (existsSync(specAbsPath) && !opts.force) {
    throw new Error(`Spec already exists at ${specRelPath}. Use --force to overwrite.`);
  }

  // Phase 2: research import (optional)
  let research: ImportedResearch | undefined;
  if (opts.importResearchPath) {
    research = importResearch(opts.importResearchPath);
    console.log(pc.dim(`Imported research: ${research.filename} (${research.content.length} bytes, sha256=${research.sha256.slice(0, 12)}...)`));
  } else {
    console.log(pc.yellow(`No research imported. Consider running Gemini/Claude Deep Research first and re-running with --import-research <file.md>. Skipping Research Context section.`));
  }

  // Phase 3: fetch templates + render
  const client = opts.registryClient ?? new RegistryClient();
  const [specTemplate, planTemplate] = await Promise.all([
    client.pullTemplate("spec"),
    client.pullTemplate("plan")
  ]);

  const archetype = opts.archetype ?? fm.data.archetype;
  const specRelFromPlan = relative(dirname(planAbsPath), specAbsPath);
  const planRelFromSpec = relative(dirname(specAbsPath), planAbsPath);

  const specContent = scaffoldSpec(specTemplate, {
    featureSlug,
    archetype,
    date,
    planRelativePath: planRelFromSpec,
    research
  });
  const planContent = scaffoldPlan(planTemplate, {
    featureSlug,
    date,
    specRelativePath: specRelFromPlan
  });

  // Phase 4: write (unless dry-run)
  if (opts.dryRun) {
    console.log(pc.cyan("\n[dry-run] Would write:"));
    console.log(`  ${specRelPath} (${specContent.length} bytes)`);
    console.log(`  ${planRelPath} (${planContent.length} bytes)`);
    console.log(pc.dim("\n[dry-run] Would update project-status.md feature_artifacts + phase_{10,20,30}_gates seed"));
    return;
  }

  mkdirSync(dirname(specAbsPath), { recursive: true });
  writeFileSync(specAbsPath, specContent, "utf-8");
  mkdirSync(dirname(planAbsPath), { recursive: true });
  writeFileSync(planAbsPath, planContent, "utf-8");

  // Phase 5: update project-status.md
  const ownedBy = fm.data.companion_skills.superpowers === "installed" ? "superpowers" : "matilha";
  appendFeatureArtifact(fm, {
    name: featureSlug,
    specPath: specRelPath,
    planPath: planRelPath,
    wave: "w1",
    ownedBy
  });

  // Seed gates for phases 10, 20, 30 to "pending" if not present
  for (const phase of [10, 20, 30] as const) {
    const gatesKey = `phase_${phase.toString().padStart(2, "0")}_gates` as
      | "phase_10_gates" | "phase_20_gates" | "phase_30_gates";
    const existing = (fm.data as Record<string, unknown>)[gatesKey] as Record<string, string> | undefined;
    const seed: Record<string, "pending"> = {};
    for (const gateKey of PHASE_GATE_KEYS[phase]) {
      seed[gateKey] = "pending";
    }
    (fm.data as Record<string, unknown>)[gatesKey] = { ...seed, ...existing };
  }

  fm.data.last_update = new Date().toISOString().replace(/\.\d+Z$/, "Z");
  await writeProjectStatus(cwd, fm);

  // Phase 6: summary
  console.log("");
  console.log(pc.bold(pc.cyan(`Matilha plan scaffolded: ${featureSlug}`)));
  console.log(`  Spec: ${specRelPath}`);
  console.log(`  Plan: ${planRelPath}`);
  console.log(`  Owned by: ${ownedBy}`);
  console.log("");
  if (ownedBy === "superpowers") {
    console.log(pc.dim("Superpowers detected. Next: open the spec and run `superpowers:brainstorming` in your IDE to fill sections section-by-section. When done, `matilha plan attest <gate>`."));
  } else {
    console.log(pc.dim("Next: open the spec in your IDE + AI agent to fill sections 2-12 using methodology/10-prd.md as SoR. When each section is done, run `matilha plan attest <gate>`."));
  }
}
