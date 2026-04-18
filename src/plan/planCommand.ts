import { mkdirSync, existsSync, writeFileSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { RegistryClient } from "../registry/registryClient";
import { readProjectStatus, writeProjectStatus } from "../util/projectStatus";
import { importResearch } from "./importResearch";
import { scaffoldSpec } from "./scaffoldSpec";
import { scaffoldPlan } from "./scaffoldPlan";
import { appendFeatureArtifact } from "./featureArtifact";
import { PHASE_GATE_KEYS } from "../config";
import { createStream } from "../ui/stream";
import { printMiniBanner } from "../ui/banner";
import { MatilhaUserError } from "../ui/errorFormat";
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
  const s = createStream();
  printMiniBanner(`matilha plan — ${featureSlug}`, "Phases 10-30 scaffold");

  s.section("pre-flight");

  if (!SLUG_RE.test(featureSlug)) {
    s.step("slug format").fail();
    throw new MatilhaUserError({
      summary: `the feature slug "${featureSlug}" uses characters matilha can't embed in file paths`,
      context: "matilha plan turns the slug into a file name like docs/matilha/specs/<slug>-spec.md",
      problem: "underscores work for some tools but break others; only lowercase letters, numbers, and hyphens are safe.",
      nextActions: [`retry with a slug like 'my-feat' or 'user-auth'`],
      example: "matilha plan user-auth"
    });
  }
  s.step("slug format").ok();

  const fm = await readProjectStatus(cwd);
  if (fm.data.current_phase < 10) {
    s.step("current_phase >= 10").fail(`phase is ${fm.data.current_phase}`);
    throw new MatilhaUserError({
      summary: "your project hasn't finished Phase 00 scout yet — run 'matilha scout' before PRD",
      context: "matilha plan scaffolds the PRD for Phase 10, which requires Phase 00 discovery complete",
      problem: `project-status.md shows current_phase: ${fm.data.current_phase}.`,
      nextActions: [
        "run 'matilha scout' to complete Phase 00 discovery first",
        "then retry 'matilha plan <slug>'"
      ]
    });
  }
  s.step("current_phase >= 10").ok(String(fm.data.current_phase));

  const date = new Date().toISOString().slice(0, 10);
  const specRelPath = `docs/matilha/specs/${date}-${featureSlug}-spec.md`;
  const planRelPath = `docs/matilha/plans/${date}-${featureSlug}-plan.md`;
  const specAbsPath = join(cwd, specRelPath);
  const planAbsPath = join(cwd, planRelPath);

  if (existsSync(specAbsPath) && !opts.force) {
    s.step("no existing spec").fail();
    throw new MatilhaUserError({
      summary: "a spec already exists for this feature",
      context: `matilha plan found ${specRelPath} already present`,
      problem: "overwriting it could lose your work.",
      nextActions: [
        "rename the existing spec if you want to keep it",
        "or re-run with --force to overwrite (destructive)"
      ]
    });
  }
  s.step("no existing spec").ok();

  let research: ImportedResearch | undefined;
  if (opts.importResearchPath) {
    s.section("import research");
    research = importResearch(opts.importResearchPath);
    const sizeKb = (research.content.length / 1024).toFixed(1);
    s.step(`reading ${opts.importResearchPath}`).ok(`${sizeKb}KB`);
  }

  s.section("fetching templates");
  const client = opts.registryClient ?? new RegistryClient();
  const [specTemplate, planTemplate] = await Promise.all([
    client.pullTemplate("spec"),
    client.pullTemplate("plan")
  ]);
  s.step("spec template").ok();
  s.step("plan template").ok();

  const archetype = opts.archetype ?? fm.data.archetype;
  const specRelFromPlan = relative(dirname(planAbsPath), specAbsPath);
  const planRelFromSpec = relative(dirname(specAbsPath), planAbsPath);

  s.section("scaffolding");
  const specContent = scaffoldSpec(specTemplate, {
    featureSlug,
    archetype,
    date,
    planRelativePath: planRelFromSpec,
    research
  });
  s.step("rendering spec").ok();
  const planContent = scaffoldPlan(planTemplate, {
    featureSlug,
    date,
    specRelativePath: specRelFromPlan
  });
  s.step("rendering plan").ok();

  if (opts.dryRun) {
    s.step("writing spec").dryRun(specRelPath);
    s.step("writing plan").dryRun(planRelPath);
    s.footer("dry-run complete. no files written.");
    return;
  }

  mkdirSync(dirname(specAbsPath), { recursive: true });
  writeFileSync(specAbsPath, specContent, "utf-8");
  s.step("writing spec").ok(specRelPath);
  mkdirSync(dirname(planAbsPath), { recursive: true });
  writeFileSync(planAbsPath, planContent, "utf-8");
  s.step("writing plan").ok(planRelPath);

  s.section("updating project-status");
  const ownedBy = fm.data.companion_skills.superpowers === "installed" ? "superpowers" : "matilha";
  appendFeatureArtifact(fm, {
    name: featureSlug,
    specPath: specRelPath,
    planPath: planRelPath,
    wave: "w1",
    ownedBy
  });
  s.step("feature_artifacts").ok(`added ${featureSlug}`);

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
  s.step("seeding gates").ok("phases 10, 20, 30");

  fm.data.last_update = new Date().toISOString().replace(/\.\d+Z$/, "Z");
  await writeProjectStatus(cwd, fm);

  const nextGuidance = ownedBy === "superpowers"
    ? `open the spec in your IDE. use 'Skill superpowers:brainstorming' or\n  'Skill superpowers:writing-plans' to fill sections 2-12,\n  then 'matilha attest' as each section is done.`
    : `open the spec in your IDE + AI agent to fill sections 2-12\n  using methodology/10-prd.md as SoR. When each section is done,\n  run 'matilha attest' (interactive picker) to flip the gate.`;

  s.footer(
    `plan scaffolded. ready for section-by-section fill.\n\n` +
    `  spec         ${specRelPath}\n` +
    `  plan         ${planRelPath}\n` +
    `  companions   ${ownedBy}\n\n` +
    `next:\n  ${nextGuidance}`
  );
}
