import pc from "picocolors";
import { readProjectStatus } from "../util/projectStatus";
import { PHASE_GATE_KEYS } from "../config";
import type { ProjectStatus } from "../domain/projectStatusSchema";

export type StatusOptions = {
  feature?: string;
  json?: boolean;
};

type GateMap = Record<string, "yes" | "no" | "pending">;

export async function statusCommand(cwd: string, opts: StatusOptions = {}): Promise<void> {
  const fm = await readProjectStatus(cwd);
  const s = fm.data;

  let artifacts = s.feature_artifacts;
  if (opts.feature) {
    artifacts = artifacts.filter((a) => a.name === opts.feature);
    if (artifacts.length === 0) {
      throw new Error(`Feature "${opts.feature}" not found in project-status.md.`);
    }
  }

  if (opts.json) {
    const output = {
      current_phase: s.current_phase,
      phase_status: s.phase_status,
      features: artifacts.map((a) => ({
        name: a.name,
        spec: a.spec,
        plan: a.plan,
        phase: a.phase,
        wave: a.wave,
        owned_by: a.owned_by,
        phase_10_gates: s.phase_10_gates ?? {},
        phase_20_gates: s.phase_20_gates ?? {},
        phase_30_gates: s.phase_30_gates ?? {}
      }))
    };
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  if (artifacts.length === 0) {
    console.log(pc.dim("No feature artifacts yet. Run `matilha plan <slug>` to create one."));
    return;
  }

  console.log(pc.bold(pc.cyan(`Matilha — ${s.name}`)) + pc.dim(` (phase ${s.current_phase}, ${s.phase_status})`));

  for (const a of artifacts) {
    console.log("");
    console.log(pc.bold(`• ${a.name}`) + pc.dim(`  [${a.phase}, wave ${a.wave}, owned_by ${a.owned_by}]`));
    console.log(`  Spec: ${a.spec}`);
    console.log(`  Plan: ${a.plan}`);

    printGatesTable(s, 10, "Phase 10 (PRD)");
    printGatesTable(s, 20, "Phase 20 (Stack)");
    printGatesTable(s, 30, "Phase 30 (Skills)");
  }
}

function printGatesTable(s: ProjectStatus, phase: 10 | 20 | 30, label: string): void {
  const gatesKey = `phase_${phase.toString().padStart(2, "0")}_gates` as
    | "phase_10_gates" | "phase_20_gates" | "phase_30_gates";
  const gates = (s[gatesKey] as GateMap | undefined) ?? {};
  const required = PHASE_GATE_KEYS[phase];
  if (required.length === 0) return;

  console.log(pc.dim(`  ${label}:`));
  for (const key of required) {
    const value = gates[key] ?? "pending";
    const icon =
      value === "yes" ? pc.green("✓") :
      value === "no" ? pc.red("✗") :
      pc.yellow("○");
    console.log(`    ${icon} ${key}`);
  }
}
