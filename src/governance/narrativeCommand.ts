import { writeFileSync } from "node:fs";
import pc from "picocolors";
import { buildProjection } from "./projection";
import { computeMetrics, resolveTraditionalHoursPerPoint } from "./metrics";
import { renderNarrative } from "./narrative";
import { readMergedLedger, resolveLedgerRoots } from "./ledgerSources";

export type NarrativeCommandOptions = {
  output?: string;
  ledger?: string[];
};

export function narrativeCommand(cwd: string, opts: NarrativeCommandOptions = {}): void {
  const state = buildProjection(readMergedLedger(resolveLedgerRoots(cwd, { ledger: opts.ledger })));
  const metrics = computeMetrics(state, {
    baselineHoursPerPoint: resolveTraditionalHoursPerPoint()
  });
  const markdown = renderNarrative(state, metrics);

  if (opts.output) {
    writeFileSync(opts.output, `${markdown}\n`, "utf-8");
    console.log(pc.green(`narrative written to ${opts.output}`));
    return;
  }
  console.log(markdown);
}
