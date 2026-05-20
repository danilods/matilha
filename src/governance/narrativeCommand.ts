import { writeFileSync } from "node:fs";
import pc from "picocolors";
import { readLedger } from "./ledger";
import { buildProjection } from "./projection";
import { computeMetrics, resolveTraditionalHoursPerPoint } from "./metrics";
import { renderNarrative } from "./narrative";

export type NarrativeCommandOptions = {
  output?: string;
};

export function narrativeCommand(cwd: string, opts: NarrativeCommandOptions = {}): void {
  const state = buildProjection(readLedger(cwd));
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
