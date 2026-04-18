import { existsSync } from "node:fs";
import { join } from "node:path";
import { RegistryClient } from "../registry/registryClient";
import { detectTools } from "./detectTools";
import { askInputs } from "./askInputs";
import { fetchAllTemplates } from "./fetchTemplates";
import { renderTemplate } from "./renderTemplate";
import { buildClaudeIndex, buildAgentsIndex, buildDesignSpecBody, hasFrontend } from "./archetypeContent";
import { writeProject } from "./writeProject";
import { installCompanions } from "./installCompanions";
import { writeSkills } from "./writeSkills";
import { createStream } from "../ui/stream";
import { printMiniBanner } from "../ui/banner";
import type { TemplateName } from "./fetchTemplates";
import type { WriteResult } from "./writeProject";
import type { InstallOutcome } from "./installCompanions";
import type { WrittenSkill } from "./writeSkills";
import type { Tool } from "./detectTools";
import type { InitInputs } from "./askInputs";

export type InitResult = {
  tools: Tool[];
  inputs: InitInputs;
  writtenFiles: WriteResult[];
  companionOutcomes: Map<string, InstallOutcome>;
  writtenSkills: WrittenSkill[];
  durationMs: number;
};

export type InitOptions = {
  dryRun?: boolean;
  registryClient?: RegistryClient;
};

function buildToolsDetectedYaml(detected: readonly Tool[]): string {
  if (detected.length === 0) return "[]";
  return detected.map((t) => `  - ${t}`).join("\n");
}

function buildAestheticDirectionYaml(aesthetic: string | undefined): string {
  return aesthetic ?? "null";
}

export async function initProject(cwd: string, opts: InitOptions = {}): Promise<InitResult> {
  const dryRun = opts.dryRun ?? false;
  const client = opts.registryClient ?? new RegistryClient();
  const startedAt = Date.now();
  const s = createStream();

  printMiniBanner("matilha init", "bootstrap a Matilha project");

  // Phase 1: discovery
  s.section("phase 1 / 4 — discovery");
  const tools = detectTools(cwd);
  s.step("detecting tools").ok();
  const existing = existsSync(join(cwd, "project-status.md"));
  s.step("checking existing init")[existing ? "warn" : "ok"](existing ? "project-status.md exists" : "no project-status.md found");
  const inputs = await askInputs(tools, existing);

  // Phase 2: generation
  s.section("phase 2 / 4 — generating files");
  const templates = await fetchAllTemplates(hasFrontend(inputs.archetype), client);
  s.step("fetching templates").ok(`${templates.size} templates`);

  const now = new Date();
  const today = now.toISOString().slice(0, 10);       // YYYY-MM-DD
  const createdIso = now.toISOString().replace(/\.\d+Z$/, "Z"); // YYYY-MM-DDTHH:MM:SSZ

  const archetypeIndex = buildClaudeIndex(inputs.archetype);
  const agentsIndex = buildAgentsIndex(inputs.archetype);
  const designSpecBody = inputs.aestheticDirection
    ? buildDesignSpecBody(inputs.archetype, inputs.aestheticDirection)
    : "";

  const vars: Record<string, string> = {
    project_name: inputs.projectName,
    archetype: inputs.archetype,
    aesthetic_direction: inputs.aestheticDirection ?? "",
    date: today,
    created_iso: createdIso,
    tools_detected_yaml: buildToolsDetectedYaml(tools),
    aesthetic_direction_yaml: buildAestheticDirectionYaml(inputs.aestheticDirection),
    archetype_index: archetypeIndex,
    agents_index: agentsIndex,
    design_spec_body: designSpecBody
  };

  const rendered = new Map<TemplateName, string>();
  for (const [name, source] of templates) {
    rendered.set(name, renderTemplate(source, vars));
    s.step(`rendering ${name}`).ok();
  }

  const writtenFiles = await writeProject(inputs, rendered, cwd, dryRun);
  if (dryRun) {
    s.step("writing files").dryRun(`${writtenFiles.length} files would be written`);
  } else {
    s.step("writing files").ok(`${writtenFiles.length} files written`);
  }

  // Phase 3: companions
  s.section("phase 3 / 4 — companions");
  const companionsMap = await client.pullCompanions();
  s.step("fetching registry").ok(`${Object.keys(companionsMap).length} companions available`);
  const companions = Object.values(companionsMap);
  const companionOutcomes = await installCompanions(companions, tools, /*interactive*/ true, dryRun);

  // Phase 4: skills
  s.section("phase 4 / 4 — skills");
  const writtenSkills = await writeSkills(tools, cwd, dryRun, client);
  s.step(`writing to ${tools.join(", ")}`).ok(`${writtenSkills.length} skills written`);

  const durationMs = Date.now() - startedAt;

  // Bookend
  s.footer(
    `matilha is ready. ${(durationMs / 1000).toFixed(1)}s\n\n` +
    `  project      ${inputs.projectName} (${inputs.archetype})\n` +
    `  companions   ${companions.length} detected\n` +
    `  skills       ${writtenSkills.length} written\n\n` +
    `next:\n` +
    `  run 'matilha scout' to begin Phase 00 discovery\n` +
    `  or run 'matilha howl' anytime to see state`
  );

  return {
    tools,
    inputs,
    writtenFiles,
    companionOutcomes,
    writtenSkills,
    durationMs
  };
}
