import pc from "picocolors";
import { readProjectStatus } from "../util/projectStatus";
import { PHASE_GATE_KEYS } from "../config";
import { renderGate, type GateValue } from "../ui/gateStatus";
import { printMiniBanner } from "../ui/banner";

export type StatusOptions = {
  feature?: string;
  json?: boolean;
  all?: boolean;
};

type GateMap = Record<string, GateValue>;

const TRUNCATE_AFTER = 4;

export async function statusCommand(cwd: string, opts: StatusOptions = {}): Promise<void> {
  const fm = await readProjectStatus(cwd);
  const s = fm.data;

  let artifacts = s.feature_artifacts;
  if (opts.feature) {
    artifacts = artifacts.filter((a) => a.name === opts.feature);
    if (artifacts.length === 0) {
      throw new Error(`feature '${opts.feature}' not found in project-status.md`);
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

  printMiniBanner(`matilha — ${s.name}`, `phase ${s.current_phase}, ${s.phase_status}`);

  if (artifacts.length === 0) {
    console.log(pc.dim("no feature artifacts yet."));
    console.log("");
    console.log(pc.bold("next:"));
    console.log(`  matilha plan <slug>   scaffold your first feature`);
    return;
  }

  let totalPending = 0;
  let currentPhasePending = 0;

  for (const a of artifacts) {
    console.log("");
    console.log(pc.bold(`• ${a.name}`) + pc.dim(`  [Phase ${a.phase}, wave ${a.wave}, owned_by ${a.owned_by}]`));
    console.log(`  spec  ${a.spec}`);
    console.log(`  plan  ${a.plan}`);
    console.log("");

    for (const phase of [10, 20, 30] as const) {
      const gatesKey = `phase_${phase.toString().padStart(2, "0")}_gates` as
        | "phase_10_gates" | "phase_20_gates" | "phase_30_gates";
      const gates = (s[gatesKey] as GateMap | undefined) ?? {};
      const required = PHASE_GATE_KEYS[phase];
      if (required.length === 0) continue;

      const done = required.filter((k) => gates[k] === "yes").length;
      const total = required.length;
      const startedLabel = done === 0 && s.current_phase < phase ? "not started" : "";
      const phaseLabel = `Phase ${phase} (${phaseTitle(phase)})`;
      const progressLabel = `${done} of ${total} done${startedLabel ? `, ${startedLabel}` : ""}`;
      console.log(pc.dim(`  ${phaseLabel} — ${progressLabel}`));

      const visible = opts.all ? required : (s.current_phase === phase ? required : required.slice(0, TRUNCATE_AFTER));

      for (const key of visible) {
        const value = (gates[key] as GateValue) ?? "pending";
        if (value === "pending") totalPending++;
        if (value === "pending" && s.current_phase === phase) currentPhasePending++;
        console.log(renderGate(key, value));
      }

      if (!opts.all && s.current_phase !== phase && required.length > TRUNCATE_AFTER) {
        const hidden = required.length - TRUNCATE_AFTER;
        console.log(pc.dim(`    ... (${hidden} more; use --all to see)`));
      }

      console.log("");
    }
  }

  console.log(pc.bold("next:"));
  if (currentPhasePending > 0) {
    console.log(`  ${currentPhasePending} gate(s) pending in Phase ${s.current_phase}`);
    console.log(`  matilha attest   pick a gate to flip (interactive)`);
  } else if (totalPending > 0) {
    console.log(`  current phase complete; advance by attesting remaining gates in later phases`);
    console.log(`  matilha attest`);
  } else {
    console.log(`  all gates complete — ready to progress!`);
  }
}

function phaseTitle(phase: 10 | 20 | 30): string {
  return phase === 10 ? "PRD" : phase === 20 ? "Stack" : "Skills";
}
