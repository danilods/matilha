import { pick, type PickGroup } from "../ui/pick";
import type { ProjectStatus } from "../domain/projectStatusSchema";

export async function pickPendingGate(status: ProjectStatus): Promise<string> {
  const groups: PickGroup<string>[] = [];

  for (const phase of [10, 20, 30] as const) {
    const gatesKey = `phase_${phase.toString().padStart(2, "0")}_gates` as keyof ProjectStatus;
    const gates = (status[gatesKey] as Record<string, string> | undefined) ?? {};
    const declared = Object.keys(gates);
    if (declared.length === 0) continue;
    const pending = declared.filter((k) => gates[k] !== "yes");
    if (pending.length === 0) continue;
    const title = `Phase ${phase} (${phaseTitle(phase)}) — ${pending.length} of ${declared.length} pending`;
    groups.push({
      title,
      options: pending.map((k) => ({ value: k, label: k }))
    });
  }

  if (groups.length === 0) {
    throw new Error("all gates complete — nothing to attest");
  }

  return pick({
    message: "choose a gate to attest",
    groups,
    hint: "arrows + enter to select"
  });
}

function phaseTitle(phase: 10 | 20 | 30): string {
  return phase === 10 ? "PRD" : phase === 20 ? "Stack" : "Skills";
}
