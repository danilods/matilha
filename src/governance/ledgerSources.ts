import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { z } from "zod";
import { MatilhaUserError } from "../ui/errorFormat";
import { readLedger } from "./ledger";
import type { GovernanceEvent } from "./events";

export const GOVERNANCE_SOURCES_VERSION = 1;

export const governanceSourcesSchema = z.object({
  schema_version: z.literal(GOVERNANCE_SOURCES_VERSION),
  ledgers: z.array(z.string().min(1))
});

export type GovernanceSources = z.infer<typeof governanceSourcesSchema>;

export function sourcesPath(cwd: string): string {
  return resolve(cwd, "docs", "matilha", "governance", "sources.json");
}

export function resolveLedgerRoots(cwd: string, opts: { ledger?: string[] } = {}): string[] {
  if (opts.ledger && opts.ledger.length > 0) {
    return opts.ledger.map((p) => resolve(cwd, p));
  }

  const path = sourcesPath(cwd);
  if (!existsSync(path)) {
    return [cwd];
  }

  const raw = readFileSync(path, "utf-8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new MatilhaUserError({
      summary: "invalid governance sources.json",
      context: `matilha was reading ${path}`,
      problem: err instanceof Error ? err.message : String(err),
      nextActions: ["fix the JSON syntax in docs/matilha/governance/sources.json"]
    });
  }

  const result = governanceSourcesSchema.safeParse(parsed);
  if (!result.success) {
    throw new MatilhaUserError({
      summary: "governance sources.json fails schema validation",
      context: `matilha was validating ${path}`,
      problem: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      nextActions: ['use the shape {"schema_version": 1, "ledgers": ["<repo-root>", ...]}']
    });
  }

  const base = dirname(path);
  return result.data.ledgers.map((p) => resolve(base, p));
}

export function readMergedLedger(roots: string[]): GovernanceEvent[] {
  const byId = new Map<string, GovernanceEvent>();
  for (const root of roots) {
    for (const event of readLedger(root)) {
      if (!byId.has(event.event_id)) byId.set(event.event_id, event);
    }
  }
  return [...byId.values()].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}
