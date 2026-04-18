import pc from "picocolors";
import { readProjectStatus } from "../util/projectStatus";

export type HowlOptions = { json?: boolean };

export async function howlCommand(cwd: string, opts: HowlOptions): Promise<void> {
  const fm = await readProjectStatus(cwd);
  const s = fm.data;

  if (opts.json) {
    console.log(JSON.stringify(s, null, 2));
    return;
  }

  const lines: string[] = [];
  lines.push(pc.bold(pc.cyan(`Matilha — ${s.name}`)) + pc.dim(` (${s.archetype})`));
  lines.push("");
  lines.push(`  ${pc.bold("Phase:")} ${s.current_phase} ${pc.dim(`(${s.phase_status})`)}`);
  lines.push(`  ${pc.bold("Next:")} ${s.next_action}`);
  lines.push(`  ${pc.bold("Tools:")} ${s.tools_detected.join(", ") || pc.dim("none")}`);

  if (s.active_waves.length > 0) {
    lines.push(`  ${pc.bold("Active waves:")} ${s.active_waves.join(", ")}`);
  }
  if (s.blockers.length > 0) {
    lines.push(pc.red(`  ${pc.bold("Blockers:")} ${s.blockers.length}`));
    for (const b of s.blockers) lines.push(pc.red(`    • ${b}`));
  }
  if (s.pending_decisions.length > 0) {
    lines.push(pc.yellow(`  ${pc.bold("Pending decisions:")} ${s.pending_decisions.length}`));
    for (const d of s.pending_decisions) lines.push(pc.yellow(`    • ${d}`));
  }

  console.log(lines.join("\n"));
}
