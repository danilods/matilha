import pc from "picocolors";
import type { NextAction } from "./nextAction";

export function renderNextAction(action: NextAction | null): void {
  if (!action) return;

  console.log("");
  console.log(pc.bold("Next recommended step"));
  console.log(`  ${action.label}`);
  console.log(pc.cyan(`  ${action.command}`));
  console.log("");
  console.log(pc.dim(`Why: ${action.reason}`));
  console.log(pc.dim(`Risk: ${riskLabel(action)}`));
  if (action.alternatives && action.alternatives.length > 0) {
    console.log(pc.dim(`Other useful steps: ${action.alternatives.join(", ")}`));
  }
}

function riskLabel(action: NextAction): string {
  if (action.risk === "remote_mutation" && action.requiresPreview) return "remote preview";
  switch (action.risk) {
    case "read":
      return "read only";
    case "local_mutation":
      return "local change";
    case "remote_mutation":
      return "remote change";
    case "destructive":
      return "destructive";
  }
}
