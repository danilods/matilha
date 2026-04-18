import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { intro, outro, text, isCancel, cancel } from "@clack/prompts";
import pc from "picocolors";
import { readProjectStatus, writeProjectStatus } from "../util/projectStatus";
import { MatilhaUserError } from "../ui/errorFormat";
import { printMiniBanner } from "../ui/banner";
import { createStream } from "../ui/stream";

async function ask(index: number, total: number, message: string, placeholder?: string): Promise<string> {
  const answer = await text({
    message: `[question ${index}/${total}] ${message}`,
    placeholder
  });
  if (isCancel(answer)) {
    cancel("Scout cancelled. Run again when ready.");
    process.exitCode = 0;
    throw new Error("cancelled");
  }
  return (answer as string).trim();
}

export async function scoutCommand(cwd: string): Promise<void> {
  const statusPath = join(cwd, "project-status.md");
  if (!existsSync(statusPath)) {
    throw new MatilhaUserError({
      summary: "not a Matilha project",
      context: "matilha scout expected to find project-status.md at the project root",
      problem: "no project-status.md found in the current directory.",
      nextActions: [
        "run 'matilha init' to bootstrap this directory as a Matilha project",
        "or 'cd' to the project root first if you're in a subdirectory"
      ]
    });
  }

  const fm = await readProjectStatus(cwd);

  if (fm.data.current_phase !== 0) {
    throw new MatilhaUserError({
      summary: "your project is past Phase 00",
      context: "matilha scout only runs once, at the start of a project",
      problem: `project-status.md shows current_phase: ${fm.data.current_phase}.`,
      nextActions: [
        `run 'matilha howl' to see your current phase and next action`,
        `if you truly want to redo discovery, manually reset current_phase to 0 in project-status.md`
      ]
    });
  }

  printMiniBanner("matilha scout", "Phase 00 Discovery");

  const s = createStream();
  s.section("pre-flight");
  s.step("project-status.md").ok(`current_phase: 0`);
  s.step(`docs/matilha/ writable`).ok();

  console.log("");
  intro(pc.cyan("This is the discovery phase. 6 questions map your problem."));

  const TOTAL = 6;
  const targetUser = await ask(1, TOTAL, "Who is the target user? (one line)", "solo engineers, SaaS founders");
  const primaryPain = await ask(2, TOTAL, "What is their top pain point? (most acute first)");
  const secondaryPain = await ask(3, TOTAL, "What's a secondary pain point? (optional — blank OK)");
  const existingSolutions = await ask(4, TOTAL, "What existing solutions/workarounds do they use today?");
  const successMetric = await ask(5, TOTAL, "How would you measure success? (concrete metric)");
  const outOfScope = await ask(6, TOTAL, "What's explicitly OUT of scope?");

  s.section("writing discovery notes");
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
`;
  mkdirSync(dirname(notesPath), { recursive: true });
  writeFileSync(notesPath, notesContent, "utf-8");
  s.step("docs/matilha/discovery-notes.md").ok();

  s.section("advancing project status");
  fm.data.phase_00_gates = {
    problem_defined: "yes",
    target_user_clear: "yes",
    success_metrics_defined: "yes",
    scope_boundaries_locked: "yes"
  };
  fm.data.current_phase = 10;
  fm.data.phase_status = "not_started";
  fm.data.next_action = "Run /plan <slug> to begin Phases 10-30 (PRD + Stack + Skills)";
  fm.data.last_update = new Date().toISOString().replace(/\.\d+Z$/, "Z");
  await writeProjectStatus(cwd, fm);
  s.step("phase 00 → 10").ok();
  s.step("gates flipped").ok("4 phase_00 gates");

  outro(pc.green("scout complete. you now know the user, their pain, and what success looks like."));
  console.log("");
  console.log(pc.bold("next:"));
  console.log(`  matilha plan <feature-slug>   begin Phase 10 PRD scaffold`);
}
