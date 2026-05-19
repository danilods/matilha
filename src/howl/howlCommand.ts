import { colors } from "../ui/colors";
import { readProjectStatus } from "../util/projectStatus";
import { PHASE_GATE_KEYS } from "../config";
import type { ProjectStatus } from "../domain/projectStatusSchema";

const LABEL_WIDTH = 22;
const PHASE_FLOW = [
  { phase: 0, label: "discover" },
  { phase: 10, label: "spec" },
  { phase: 20, label: "stack" },
  { phase: 30, label: "skills" },
  { phase: 40, label: "split/merge" },
  { phase: 50, label: "review" },
  { phase: 60, label: "capture" },
  { phase: 70, label: "pack" }
] as const;

export type HowlOptions = { json?: boolean };

function countPendingGates(s: ProjectStatus, phase: 10 | 20 | 30): { done: number; total: number } {
  const gatesKey = `phase_${phase.toString().padStart(2, "0")}_gates` as
    | "phase_10_gates" | "phase_20_gates" | "phase_30_gates";
  const gates = (s[gatesKey] as Record<string, string> | undefined) ?? {};
  const required = PHASE_GATE_KEYS[phase];
  const done = required.filter((k) => gates[k] === "yes").length;
  return { done, total: required.length };
}

function row(label: string, value: string): string {
  return `  ${label.padEnd(LABEL_WIDTH)} | ${value}`;
}

function tableHeader(): string[] {
  return [
    row("field", "value"),
    `  ${"-".repeat(LABEL_WIDTH)} | ${"-".repeat(34)}`
  ];
}

function workflow(currentPhase: number): string {
  const c = colors();
  const ascii = Boolean(process.env.MATILHA_ASCII || process.env.NO_COLOR);
  return PHASE_FLOW.map(({ phase, label }) => {
    const token = `${String(phase).padStart(2, "0")} ${label}`;
    if (phase === currentPhase) return c.cyan(`${ascii ? ">" : "●"} ${token}`);
    if (phase < currentPhase) return c.green(`${ascii ? "x" : "✓"} ${token}`);
    return c.dim(`${ascii ? "o" : "○"} ${token}`);
  }).join(c.dim(" -> "));
}

export async function howlCommand(cwd: string, opts: HowlOptions): Promise<void> {
  const fm = await readProjectStatus(cwd);
  const s = fm.data;

  if (opts.json) {
    console.log(JSON.stringify(s, null, 2));
    return;
  }

  const c = colors();
  const lines: string[] = [];
  lines.push("");
  lines.push(c.bold(c.cyan(`matilha — ${s.name}`)) + c.dim(` (${s.archetype})`));
  lines.push("");

  // Workflow section
  lines.push(c.bold("Workflow"));
  lines.push(`  ${workflow(s.current_phase)}`);
  lines.push("");

  // Phase section
  lines.push(c.bold("Phase"));
  lines.push(...tableHeader());
  lines.push(row("current", `phase ${s.current_phase} ${c.dim(`(${s.phase_status})`)}`));

  if (s.current_phase >= 10 && s.current_phase <= 30) {
    const phase = s.current_phase as 10 | 20 | 30;
    const { done, total } = countPendingGates(s, phase);
    lines.push(row("gates remaining", `${total - done} of ${total}`));
  }

  lines.push(row("next action", s.next_action));
  lines.push("");

  // Activity section
  lines.push(c.bold("Activity"));
  lines.push(...tableHeader());
  lines.push(row("tools", s.tools_detected.join(", ") || c.dim("(none)")));
  lines.push(row("active waves", s.active_waves.length > 0 ? s.active_waves.join(", ") : c.dim("(none)")));

  if (s.pending_decisions.length > 0) {
    lines.push(row("pending decisions", c.yellow(String(s.pending_decisions.length))));
    for (const d of s.pending_decisions) lines.push(c.yellow(`    • ${d}`));
  } else {
    lines.push(row("pending decisions", c.dim("(none)")));
  }

  if (s.blockers.length > 0) {
    lines.push(row("blockers", c.red(String(s.blockers.length))));
    for (const b of s.blockers) lines.push(c.red(`    • ${b}`));
  } else {
    lines.push(row("blockers", c.dim("(none)")));
  }

  // Bookend
  lines.push("");
  lines.push(c.bold("next:"));
  lines.push(`  matilha progress        spec/gate detail`);
  if (s.current_phase === 0) {
    lines.push(`  matilha discover        start Phase 00 discovery`);
  }

  console.log(lines.join("\n"));
}
