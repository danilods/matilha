import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { intro, outro, text, isCancel, cancel, note } from "@clack/prompts";
import pc from "picocolors";
import { readProjectStatus, writeProjectStatus } from "../util/projectStatus";

async function ask(message: string, placeholder?: string): Promise<string> {
  const answer = await text({ message, placeholder });
  if (isCancel(answer)) {
    cancel("Scout cancelled. Run again when ready.");
    process.exitCode = 0;
    throw new Error("cancelled");
  }
  return (answer as string).trim();
}

export async function scoutCommand(cwd: string): Promise<void> {
  const fm = await readProjectStatus(cwd);

  if (fm.data.current_phase !== 0) {
    throw new Error(`Phase 00 already complete (current_phase=${fm.data.current_phase}). Use /plan next.`);
  }

  intro(pc.cyan("matilha /scout — Phase 00 Discovery"));

  const targetUser = await ask("Who is the target user? (one line)", "solo engineers, SaaS founders");
  const primaryPain = await ask("What is their top pain point? (most acute first)");
  const secondaryPain = await ask("What's a secondary pain point? (optional — blank OK)");
  const existingSolutions = await ask("What existing solutions/workarounds do they use today?");
  const successMetric = await ask("How would you measure success? (concrete metric)");
  const outOfScope = await ask("What's explicitly OUT of scope?");

  const notesDir = join(cwd, "docs", "matilha");
  const notesPath = join(notesDir, "discovery-notes.md");
  const notesContent = `# Phase 00 Discovery — ${fm.data.name}

Captured by \`matilha scout\` on ${new Date().toISOString()}.

## Target user

${targetUser}

## Pain points

### Primary
${primaryPain}

### Secondary
${secondaryPain || "_(none specified)_"}

## Existing solutions / workarounds

${existingSolutions}

## Success metric

${successMetric}

## Out of scope

${outOfScope}

---

## Next

Phase 00 gates passed. Run \`matilha plan\` (or \`/plan\` in your IDE) to begin Phases 10-30.
`;

  mkdirSync(dirname(notesPath), { recursive: true });
  writeFileSync(notesPath, notesContent, "utf-8");

  fm.data.phase_00_gates = {
    problem_defined: "yes",
    target_user_clear: "yes",
    success_metrics_defined: "yes",
    scope_boundaries_locked: "yes"
  };
  fm.data.current_phase = 10;
  fm.data.phase_status = "not_started";
  fm.data.next_action = "Run /plan to begin Phases 10-30 (PRD + Stack + Skills)";
  fm.data.last_update = new Date().toISOString().replace(/\.\d+Z$/, "Z");

  await writeProjectStatus(cwd, fm);

  note(
    `Discovery notes: docs/matilha/discovery-notes.md\nProject status advanced: phase 00 → 10`,
    "Scout complete"
  );
  outro(pc.green("Next: /plan to begin Phase 10"));
}
