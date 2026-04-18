import pc from "picocolors";
import { readProjectStatus } from "../util/projectStatus";
import { PHASE_GATE_KEYS } from "../config";
import type { ProjectStatus } from "../domain/projectStatusSchema";

export type HowlOptions = { json?: boolean };

function countPendingGates(s: ProjectStatus, phase: 10 | 20 | 30): { done: number; total: number } {
  const gatesKey = `phase_${phase.toString().padStart(2, "0")}_gates` as
    | "phase_10_gates" | "phase_20_gates" | "phase_30_gates";
  const gates = (s[gatesKey] as Record<string, string> | undefined) ?? {};
  const required = PHASE_GATE_KEYS[phase];
  const done = required.filter((k) => gates[k] === "yes").length;
  return { done, total: required.length };
}

export async function howlCommand(cwd: string, opts: HowlOptions): Promise<void> {
  const fm = await readProjectStatus(cwd);
  const s = fm.data;

  if (opts.json) {
    console.log(JSON.stringify(s, null, 2));
    return;
  }

  const lines: string[] = [];
  lines.push("");
  lines.push(pc.bold(pc.cyan(`matilha — ${s.name}`)) + pc.dim(` (${s.archetype})`));
  lines.push("");

  // Phase section
  lines.push(pc.bold("Phase"));
  lines.push(`  ${"current".padEnd(24)}phase ${s.current_phase} ${pc.dim(`(${s.phase_status})`)}`);

  if (s.current_phase >= 10 && s.current_phase <= 30) {
    const phase = s.current_phase as 10 | 20 | 30;
    const { done, total } = countPendingGates(s, phase);
    lines.push(`  ${"gates remaining".padEnd(24)}${total - done} of ${total}`);
  }

  lines.push(`  ${"next action".padEnd(24)}${s.next_action}`);
  lines.push("");

  // Activity section
  lines.push(pc.bold("Activity"));
  lines.push(`  ${"tools".padEnd(24)}${s.tools_detected.join(", ") || pc.dim("(none)")}`);
  lines.push(`  ${"active waves".padEnd(24)}${s.active_waves.length > 0 ? s.active_waves.join(", ") : pc.dim("(none)")}`);

  if (s.pending_decisions.length > 0) {
    lines.push(`  ${"pending decisions".padEnd(24)}${pc.yellow(String(s.pending_decisions.length))}`);
    for (const d of s.pending_decisions) lines.push(pc.yellow(`    • ${d}`));
  } else {
    lines.push(`  ${"pending decisions".padEnd(24)}${pc.dim("(none)")}`);
  }

  if (s.blockers.length > 0) {
    lines.push(`  ${"blockers".padEnd(24)}${pc.red(String(s.blockers.length))}`);
    for (const b of s.blockers) lines.push(pc.red(`    • ${b}`));
  } else {
    lines.push(`  ${"blockers".padEnd(24)}${pc.dim("(none)")}`);
  }

  // Bookend
  lines.push("");
  lines.push(pc.bold("next:"));
  lines.push(`  matilha plan-status     spec/gate detail`);
  if (s.current_phase === 0) {
    lines.push(`  matilha scout           start Phase 00 discovery`);
  }

  console.log(lines.join("\n"));
}
