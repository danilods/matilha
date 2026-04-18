import { readFileSync } from "node:fs";
import { join } from "node:path";
import pc from "picocolors";
import { readProjectStatus, writeProjectStatus } from "../util/projectStatus";
import { validatePhase10Gate } from "./sectionValidator";
import { PHASE_GATE_KEYS } from "../config";
import type { ProjectStatus } from "../domain/projectStatusSchema";

export type AttestOptions = {
  feature?: string;
  force?: boolean;
};

type Phase = 10 | 20 | 30;

function resolvePhase(gateKey: string): Phase | null {
  for (const phase of [10, 20, 30] as const) {
    if ((PHASE_GATE_KEYS[phase] as readonly string[]).includes(gateKey)) {
      return phase;
    }
  }
  return null;
}

function resolveFeature(
  fm: { data: ProjectStatus },
  featureArg?: string
): ProjectStatus["feature_artifacts"][number] {
  const artifacts = fm.data.feature_artifacts;
  if (artifacts.length === 0) {
    throw new Error("No feature_artifacts in project-status.md. Run `matilha plan <slug>` first.");
  }
  if (featureArg) {
    const found = artifacts.find((a) => a.name === featureArg);
    if (!found) {
      throw new Error(`Feature "${featureArg}" not found in project-status.md.`);
    }
    return found;
  }
  if (artifacts.length > 1) {
    const names = artifacts.map((a) => a.name).join(", ");
    throw new Error(`Multiple feature_artifacts found (${names}). Pass --feature <slug>.`);
  }
  return artifacts[0];
}

function gatesKeyForPhase(phase: Phase): "phase_10_gates" | "phase_20_gates" | "phase_30_gates" {
  return `phase_${phase.toString().padStart(2, "0")}_gates` as "phase_10_gates" | "phase_20_gates" | "phase_30_gates";
}

function allGatesYes(fm: { data: ProjectStatus }, phase: Phase): boolean {
  const gates = fm.data[gatesKeyForPhase(phase)] as Record<string, string> | undefined;
  if (!gates) return false;
  const required = PHASE_GATE_KEYS[phase] as readonly string[];
  return required.every((k) => gates[k] === "yes");
}

function nextPhase(phase: Phase): Phase | null {
  if (phase === 10) return 20;
  if (phase === 20) return 30;
  return null; // phase 30 complete means phase 40 which isn't in this wave's scope
}

function nextActionFor(phase: Phase): string {
  if (phase === 20) return "Run /plan attestation for Phase 20 gates (stack decisions).";
  if (phase === 30) return "Run /plan attestation for Phase 30 gates (skills/agents).";
  return "Run /hunt to decompose plan into waves (Phase 40).";
}

export async function attestCommand(
  cwd: string,
  gateKey: string,
  opts: AttestOptions = {}
): Promise<void> {
  const phase = resolvePhase(gateKey);
  if (phase === null) {
    throw new Error(`Unknown gate "${gateKey}". Known keys: ${Object.values(PHASE_GATE_KEYS).flat().join(", ")}`);
  }

  const fm = await readProjectStatus(cwd);
  const feature = resolveFeature(fm, opts.feature);
  const specPath = join(cwd, feature.spec);

  let validationPassed = true;
  let validationReason = "";

  if (phase === 10) {
    const specContent = readFileSync(specPath, "utf-8");
    const result = validatePhase10Gate(gateKey, specContent);
    if (!result.ok) {
      validationPassed = false;
      validationReason = result.reason;
    }
  } else {
    // Phase 20/30 minimal validator: accept; will be tightened in later waves
    console.log(pc.dim(`Note: Phase ${phase} validation is minimal in Wave 2d. Gate "${gateKey}" will be accepted as filled.`));
  }

  if (!validationPassed && !opts.force) {
    throw new Error(`Validation failed for gate "${gateKey}": ${validationReason}\nFix the issue, or use --force to override.`);
  }

  // Flip the gate to yes
  const gatesKey = gatesKeyForPhase(phase);
  const currentGates = (fm.data[gatesKey] as Record<string, "yes" | "no" | "pending"> | undefined) ?? {};
  const nextGates = { ...currentGates, [gateKey]: "yes" as const };
  (fm.data as Record<string, unknown>)[gatesKey] = nextGates;

  // Force override: record in pending_decisions
  if (!validationPassed && opts.force) {
    const decision = `${new Date().toISOString().slice(0, 10)}: --force override on gate "${gateKey}" for feature "${feature.name}". Reason: ${validationReason}`;
    fm.data.pending_decisions = [...fm.data.pending_decisions, decision];
    console.log(pc.yellow(`Force override logged to pending_decisions: ${decision}`));
  }

  // Check if all gates for this phase are now yes → auto-advance
  if (allGatesYes(fm, phase)) {
    const next = nextPhase(phase);
    if (next !== null) {
      fm.data.current_phase = next as 10 | 20 | 30;
      fm.data.phase_status = "not_started";
      fm.data.next_action = nextActionFor(next);
      console.log(pc.bold(pc.green(`All Phase ${phase} gates complete — advancing current_phase to ${next}.`)));
    } else {
      // phase 30 complete → point at phase 40 (out of Wave 2d scope)
      fm.data.next_action = "Run /hunt to decompose plan into waves (Phase 40).";
      console.log(pc.bold(pc.green(`All Phase ${phase} gates complete — ready for Phase 40 (/hunt).`)));
    }
  }

  fm.data.last_update = new Date().toISOString().replace(/\.\d+Z$/, "Z");
  await writeProjectStatus(cwd, fm);

  console.log(pc.green(`✓ Gate "${gateKey}" attested (yes) for feature "${feature.name}" in Phase ${phase}.`));
}
