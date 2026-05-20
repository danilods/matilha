import pc from "picocolors";
import { readLedger } from "./ledger";
import { buildProjection, writeState } from "./projection";

export function governanceRebuildCommand(cwd: string): void {
  const events = readLedger(cwd);
  const state = buildProjection(events);
  writeState(cwd, state);
  const issueCount = Object.keys(state.issues).length;
  console.log(
    pc.green(`governance projection rebuilt: ${events.length} event(s) -> ${issueCount} issue(s)`)
  );
}
