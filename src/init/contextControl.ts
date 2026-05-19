import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { InitInputs } from "./askInputs";
import type { TemplateName } from "./fetchTemplates";
import type { Tool } from "./detectTools";
import type { WriteResult } from "./writeProject";

const CONTEXT_INDEX_PATH = "docs/matilha/context.md";
const CONTROL_MARKER_START = "<!-- matilha-control v1 -->";
const CONTROL_MARKER_END = "<!-- matilha-control-end v1 -->";

type Provider = "claude" | "agents";

export function compactProviderTemplates(
  rendered: Map<TemplateName, string>,
  inputs: InitInputs,
  tools: readonly Tool[]
): Map<TemplateName, string> {
  const compacted = new Map(rendered);

  if (compacted.has("claude")) {
    compacted.set("claude", renderProviderControlFile("claude", inputs, tools));
  }
  if (compacted.has("agents")) {
    compacted.set("agents", renderProviderControlFile("agents", inputs, tools));
  }

  return compacted;
}

export function renderProviderControlFile(
  provider: Provider,
  inputs: InitInputs,
  tools: readonly Tool[]
): string {
  const providerLabel = provider === "claude" ? "Claude Code" : "Agent CLI";
  const toolsLabel = tools.length > 0 ? tools.join(", ") : "not detected";

  return `${CONTROL_MARKER_START}
# Matilha Control

Project: ${inputs.projectName}
Archetype: ${inputs.archetype}
Provider: ${providerLabel}
Detected tools: ${toolsLabel}

This file is intentionally small. Do not expand it with full methodology, specs, plans, or long summaries.

Session restore protocol:
1. Read \`project-status.md\` first for phase, next_action, blockers, and feature_artifacts.
2. Read \`${CONTEXT_INDEX_PATH}\` for the source-of-record map.
3. Open only the referenced spec, plan, wave, or skill files needed for the current task.
4. Keep this root control file as references only; put durable context under \`docs/matilha/\`.

Primary commands: \`matilha status\`, \`matilha discover\`, \`matilha spec\`, \`matilha approve\`, \`matilha split\`, \`matilha merge\`.

Key references:
- State: \`project-status.md\`
- Context map: \`${CONTEXT_INDEX_PATH}\`
- Discovery: \`docs/matilha/discovery-notes.md\`
- Specs: \`docs/matilha/specs/\`
- Plans: \`docs/matilha/plans/\`
- Waves: \`docs/matilha/waves/\`
- Skills: \`.agents/skills/matilha-*/SKILL.md\`, \`.claude/skills/matilha-*/SKILL.md\`, \`.cursor/skills/matilha-*/SKILL.md\`
${CONTROL_MARKER_END}
`;
}

export function renderContextIndex(inputs: InitInputs, tools: readonly Tool[]): string {
  const toolsList = tools.length > 0
    ? tools.map((tool) => `- ${tool}`).join("\n")
    : "- none detected";
  const aesthetic = inputs.aestheticDirection?.trim() || "not set";

  return `# Matilha Context Map

Project: ${inputs.projectName}
Archetype: ${inputs.archetype}
Aesthetic direction: ${aesthetic}

This is the stable entry point for clean-session recovery. Root provider files should stay compact and point here.

## Restore Order

1. Read \`project-status.md\`.
2. Follow \`next_action\`, \`current_phase\`, blockers, and active feature_artifacts.
3. Read only the relevant files from the sources below.
4. Update durable decisions in Matilha artifacts instead of expanding provider control files.

## Sources Of Record

- Project state: \`project-status.md\`
- Discovery notes: \`docs/matilha/discovery-notes.md\`
- Feature specs: \`docs/matilha/specs/\`
- Implementation plans: \`docs/matilha/plans/\`
- Parallel wave status: \`docs/matilha/waves/\`
- Design direction: \`design-spec.md\`
- Local skills: \`.agents/skills/\`, \`.claude/skills/\`, \`.cursor/skills/\`

## Detected Tools

${toolsList}

## Command Map

- Start/bootstrap: \`matilha start\`
- Current state: \`matilha status\`
- Discovery: \`matilha discover\`
- Spec and plan scaffold: \`matilha spec <slug>\`
- Gate approval: \`matilha approve\`
- Worktree split: \`matilha split <slug>\`
- Wave merge: \`matilha merge <slug>\`

## Context Hygiene

- Keep \`CLAUDE.md\`, \`AGENTS.md\`, \`.cursor/rules/matilha.mdc\`, and similar provider files as small pointers.
- Do not paste whole specs, plans, methodology pages, or skill packs into provider control files.
- When context changes, update the smallest durable artifact that owns the fact.
`;
}

export async function writeContextIndex(
  inputs: InitInputs,
  tools: readonly Tool[],
  cwd: string,
  dryRun: boolean,
  overwriteExisting = false
): Promise<WriteResult> {
  const path = join(cwd, CONTEXT_INDEX_PATH);
  const content = renderContextIndex(inputs, tools);
  const existed = existsSync(path);
  const shouldWrite = !dryRun && (!existed || overwriteExisting);

  if (shouldWrite) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content, "utf-8");
  }

  return {
    path,
    bytes: Buffer.byteLength(content, "utf-8"),
    overwritten: existed && shouldWrite
  };
}
