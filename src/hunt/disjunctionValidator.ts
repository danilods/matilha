import type { MatilhaError } from "../ui/errorFormat";
import type { ParsedSP } from "./planParser";

export type Violation = {
  file: string;
  sps: string[];
};

export type DisjunctionResult = {
  violations: Violation[];
  toError(waveId: string): MatilhaError | null;
};

export function validateDisjunction(sps: ParsedSP[]): DisjunctionResult {
  const fileToSPs = new Map<string, Set<string>>();
  for (const sp of sps) {
    for (const file of sp.touches) {
      if (!fileToSPs.has(file)) fileToSPs.set(file, new Set());
      fileToSPs.get(file)!.add(sp.id);
    }
  }

  const violations: Violation[] = [];
  for (const [file, spSet] of fileToSPs) {
    if (spSet.size > 1) {
      violations.push({ file, sps: Array.from(spSet).sort() });
    }
  }

  return {
    violations,
    toError(waveId: string): MatilhaError | null {
      if (violations.length === 0) return null;
      const lines = violations.map((v) => `  ${v.sps.join(" and ")} both touch: ${v.file}`);
      return {
        summary: `disjunction violated in wave ${waveId}`,
        context: "matilha hunt was validating that intra-wave SPs touch disjoint file sets",
        problem: `${violations.length} overlap${violations.length === 1 ? "" : "s"} found:\n${lines.join("\n")}`,
        nextActions: [
          "edit the plan and move one SP to a later wave",
          "or pass --allow-overlap to bypass (merge conflict risk in /gather)"
        ]
      };
    }
  };
}
