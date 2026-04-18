import { readFileSync } from "node:fs";
import { join } from "node:path";
import pc from "picocolors";
import { readProjectStatus, writeProjectStatus } from "../util/projectStatus";
import { validatePhase10Gate } from "./sectionValidator";
import { PHASE_GATE_KEYS } from "../config";
import { pickPendingGate } from "./attestInteractive";
import { MatilhaUserError } from "../ui/errorFormat";
import { createStream } from "../ui/stream";
import { printMiniBanner } from "../ui/banner";
import type { ProjectStatus } from "../domain/projectStatusSchema";

export type AttestOptions = {
  feature?: string;
  force?: boolean;
  gateKey?: string; // optional; if missing, TUI is used
};

type Phase = 10 | 20 | 30;

const PHASE_40_NEXT_ACTION = "run 'matilha hunt <plan-slug>' to decompose into waves (Phase 40)";

function resolvePhase(gateKey: string): Phase | null {
  for (const phase of [10, 20, 30] as const) {
    if ((PHASE_GATE_KEYS[phase] as readonly string[]).includes(gateKey)) {
      return phase;
    }
  }
  return null;
}

function gatesKeyForPhase(phase: Phase) {
  return `phase_${phase.toString().padStart(2, "0")}_gates` as
    | "phase_10_gates" | "phase_20_gates" | "phase_30_gates";
}

function countRemaining(fm: { data: ProjectStatus }, phase: Phase): { done: number; total: number } {
  const gates = (fm.data[gatesKeyForPhase(phase)] as Record<string, string> | undefined) ?? {};
  const required = PHASE_GATE_KEYS[phase];
  const done = required.filter((k) => gates[k] === "yes").length;
  return { done, total: required.length };
}

function allGatesYes(fm: { data: ProjectStatus }, phase: Phase): boolean {
  const { done, total } = countRemaining(fm, phase);
  return done === total;
}

function nextPhase(phase: Phase): Phase | null {
  if (phase === 10) return 20;
  if (phase === 20) return 30;
  return null;
}

function nextActionFor(phase: Phase): string {
  if (phase === 20) return "fill sections on stack decisions; then run 'matilha attest' for Phase 20 gates";
  if (phase === 30) return "fill sections on skills/agents; then run 'matilha attest' for Phase 30 gates";
  return PHASE_40_NEXT_ACTION;
}

function resolveFeature(
  fm: { data: ProjectStatus },
  featureArg?: string
): ProjectStatus["feature_artifacts"][number] {
  const artifacts = fm.data.feature_artifacts;
  if (artifacts.length === 0) {
    throw new MatilhaUserError({
      summary: "no feature artifacts in project-status.md",
      context: "matilha attest needs a feature to attest gates against",
      problem: "your project-status.md shows zero features.",
      nextActions: ["run 'matilha plan <slug>' to scaffold your first feature"]
    });
  }
  if (featureArg) {
    const found = artifacts.find((a) => a.name === featureArg);
    if (!found) {
      throw new MatilhaUserError({
        summary: `feature '${featureArg}' not found`,
        context: "matilha attest was looking up a feature by slug",
        problem: `project-status.md has features: ${artifacts.map((a) => a.name).join(", ")}`,
        nextActions: ["check the spelling", "run 'matilha plan-status' to see all features"]
      });
    }
    return found;
  }
  if (artifacts.length > 1) {
    const names = artifacts.map((a) => a.name).join(", ");
    const firstName = artifacts[0]?.name ?? "first-feature";
    throw new MatilhaUserError({
      summary: "multiple features found; specify which",
      context: "matilha attest needs to know which feature to attest against",
      problem: `project-status.md has: ${names}`,
      nextActions: ["retry with --feature <slug>"],
      example: `matilha attest --feature ${firstName}`
    });
  }
  // artifacts.length === 1 at this point (length === 0 already throws above)
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return artifacts[0]!;
}

export async function attestCommand(
  cwd: string,
  opts: AttestOptions = {}
): Promise<void> {
  const fm = await readProjectStatus(cwd);

  printMiniBanner("matilha attest", fm.data.name);

  // Resolve gate: CLI arg wins, else TUI
  let gateKey = opts.gateKey;
  if (!gateKey) {
    try {
      gateKey = await pickPendingGate(fm.data);
    } catch (err) {
      if (err instanceof Error && /all gates complete/i.test(err.message)) {
        console.log(pc.green("all gates complete — nothing to attest. advance via 'matilha plan-status' or 'matilha hunt'."));
        return;
      }
      throw err;
    }
  }

  const phase = resolvePhase(gateKey);
  if (phase === null) {
    throw new MatilhaUserError({
      summary: `unknown gate key '${gateKey}'`,
      context: "matilha attest was resolving the gate to its phase",
      problem: "this key isn't in any of Phase 10/20/30 gate lists.",
      nextActions: [
        "run 'matilha attest' (no args) for an interactive picker of pending gates",
        "or check 'matilha plan-status' for valid gate names"
      ]
    });
  }

  const feature = resolveFeature(fm, opts.feature);
  const specPath = join(cwd, feature.spec);
  const s = createStream();
  s.section("validating");

  let validationPassed = true;
  let validationReason = "";

  if (phase === 10) {
    const specContent = readFileSync(specPath, "utf-8");
    s.step("reading spec").ok();
    const result = validatePhase10Gate(gateKey, specContent);
    s.step(`checking section for '${gateKey}'`).ok();
    if (!result.ok) {
      validationPassed = false;
      validationReason = result.reason;
    }
  } else {
    s.step(`phase ${phase} validation (minimal)`).warn("will be tightened in a later wave");
  }

  if (!validationPassed && !opts.force) {
    s.step("validation").fail();
    throw new MatilhaUserError({
      summary: "spec section is incomplete",
      context: `matilha attest was validating gate '${gateKey}' against ${feature.spec}`,
      problem: validationReason.toLowerCase(),
      nextActions: [
        "open the spec and fill the section (remove [placeholder] / TODO)",
        `then retry 'matilha attest ${gateKey}'`,
        "or pass --force to override validation (rarely correct)"
      ],
      example: "matilha attest " + gateKey
    });
  }

  s.step("validation").ok();

  // Flip the gate
  const gatesKey = gatesKeyForPhase(phase);
  const currentGates = (fm.data[gatesKey] as Record<string, "yes" | "no" | "pending"> | undefined) ?? {};
  const nextGates = { ...currentGates, [gateKey]: "yes" as const };
  (fm.data as Record<string, unknown>)[gatesKey] = nextGates;

  if (!validationPassed && opts.force) {
    const decision = `${new Date().toISOString().slice(0, 10)}: --force override on gate '${gateKey}' for feature '${feature.name}'. Reason: ${validationReason}`;
    fm.data.pending_decisions = [...fm.data.pending_decisions, decision];
  }

  // Check advance
  let advanced: Phase | null = null;
  if (allGatesYes(fm, phase)) {
    const next = nextPhase(phase);
    if (next !== null) {
      fm.data.current_phase = next;
      fm.data.phase_status = "not_started";
      fm.data.next_action = nextActionFor(next);
      advanced = next;
    } else {
      fm.data.next_action = PHASE_40_NEXT_ACTION;
    }
  }

  fm.data.last_update = new Date().toISOString().replace(/\.\d+Z$/, "Z");
  await writeProjectStatus(cwd, fm);

  // Output with peak-end
  const { done, total } = countRemaining(fm, phase);
  const remaining = total - done;

  console.log("");
  console.log(pc.green(`gate attested: ${gateKey} → yes`));
  console.log("");

  if (advanced !== null) {
    console.log(pc.bold(pc.green(`Phase ${phase} complete. all ${total} gates green.`)));
    console.log("");
    console.log(pc.bold(`advancing current_phase: ${phase} → ${advanced}`));
    console.log("");
    console.log(pc.bold("next:"));
    console.log(`  ${nextActionFor(advanced)}`);
  } else if (remaining === 0 && phase === 30) {
    console.log(pc.bold(pc.green(`Phase 30 complete. ready for Phase 40 (wave dispatch).`)));
    console.log("");
    console.log(pc.bold("next:"));
    console.log(`  ${PHASE_40_NEXT_ACTION}`);
  } else {
    console.log(pc.dim(`${remaining} gate${remaining === 1 ? "" : "s"} remaining in Phase ${phase}.`));
    console.log("");
    console.log(pc.bold("next:"));
    console.log(`  matilha attest   pick the next gate`);
  }
}
