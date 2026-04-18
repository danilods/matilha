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

  // Phase 1: discovery
  const tools = detectTools(cwd);
  const existing = existsSync(join(cwd, "project-status.md"));
  const inputs = await askInputs(tools, existing);

  // Phase 2: generation
  const templates = await fetchAllTemplates(hasFrontend(inputs.archetype), client);

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
  }

  const writtenFiles = await writeProject(inputs, rendered, cwd, dryRun);

  // Phase 3: companions
  const companionsMap = await client.pullCompanions();
  const companions = Object.values(companionsMap);
  const companionOutcomes = await installCompanions(companions, tools, /*interactive*/ true, dryRun);

  // Phase 4: skills
  const writtenSkills = await writeSkills(tools, cwd, dryRun, client);

  return {
    tools,
    inputs,
    writtenFiles,
    companionOutcomes,
    writtenSkills,
    durationMs: Date.now() - startedAt
  };
}

export function printInitReport(result: InitResult): void {
  console.log(`\nMatilha initialized in ${result.durationMs}ms.`);
  console.log(`Tools: ${result.tools.length > 0 ? result.tools.join(", ") : "none"}`);
  console.log(`Archetype: ${result.inputs.archetype}${result.inputs.aestheticDirection ? " (" + result.inputs.aestheticDirection + ")" : ""}`);
  console.log(`Files written: ${result.writtenFiles.length}`);
  console.log(`Skills written: ${result.writtenSkills.length}`);
  console.log(`Companions:`);
  for (const [slug, outcome] of result.companionOutcomes) {
    console.log(`  ${slug}: ${outcome}`);
  }
  console.log(`\nNext: /scout to begin Phase 00 (or /howl to view state)`);
}
