import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { parseGovernanceEvent, type GovernanceEvent } from "./events";
import { MatilhaUserError } from "../ui/errorFormat";

export function ledgerPath(cwd: string): string {
  return join(cwd, "docs", "matilha", "governance", "events.ndjson");
}

export function readLedger(cwd: string): GovernanceEvent[] {
  const path = ledgerPath(cwd);
  if (!existsSync(path)) return [];

  const raw = readFileSync(path, "utf-8");
  const events: GovernanceEvent[] = [];
  const lines = raw.split("\n");
  for (let index = 0; index < lines.length; index++) {
    const trimmed = lines[index]!.trim();
    if (trimmed.length === 0) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch (err) {
      throw new MatilhaUserError({
        summary: "invalid governance ledger line",
        context: `matilha was reading ${path}:${index + 1}`,
        problem: err instanceof Error ? err.message : String(err),
        nextActions: ["fix or remove the malformed line, then rerun 'matilha governance rebuild'"]
      });
    }
    events.push(parseGovernanceEvent(parsed));
  }
  return events;
}

export function appendEvent(
  cwd: string,
  event: GovernanceEvent
): { status: "written" | "exists"; path: string } {
  const path = ledgerPath(cwd);
  const existing = readLedger(cwd);
  if (existing.some((e) => e.event_id === event.event_id)) {
    return { status: "exists", path };
  }
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, `${JSON.stringify(event)}\n`, "utf-8");
  return { status: "written", path };
}
