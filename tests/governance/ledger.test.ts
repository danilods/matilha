import { describe, it, expect } from "vitest";
import { mkdtempSync, rmSync, readFileSync, appendFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendEvent, readLedger, ledgerPath } from "../../src/governance/ledger";
import { makeGovernanceEvent } from "../../src/governance/events";
import { MatilhaUserError } from "../../src/ui/errorFormat";

const actor = { tool: "claude-code" };

function tmp(): string {
  return mkdtempSync(join(tmpdir(), "matilha-ledger-"));
}

describe("governance ledger", () => {
  it("appends events as NDJSON lines and reads them back", () => {
    const cwd = tmp();
    try {
      const e1 = makeGovernanceEvent({ type: "task.started", external_id: "BOIAA-1", actor });
      const e2 = makeGovernanceEvent({ type: "task.completed", external_id: "BOIAA-1", actor, payload: { commits: ["a1"] } });
      appendEvent(cwd, e1);
      appendEvent(cwd, e2);

      const raw = readFileSync(ledgerPath(cwd), "utf-8");
      expect(raw.trim().split("\n")).toHaveLength(2);

      const events = readLedger(cwd);
      expect(events.map((e) => e.event_id)).toEqual([e1.event_id, e2.event_id]);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("is idempotent — appending the same event_id twice writes one line", () => {
    const cwd = tmp();
    try {
      const e1 = makeGovernanceEvent({ type: "task.started", external_id: "BOIAA-2", actor });
      const first = appendEvent(cwd, e1);
      const second = appendEvent(cwd, e1);
      expect(first.status).toBe("written");
      expect(second.status).toBe("exists");
      expect(readLedger(cwd)).toHaveLength(1);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("returns an empty array when the ledger does not exist", () => {
    const cwd = tmp();
    try {
      expect(readLedger(cwd)).toEqual([]);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("throws a clear error on a malformed ledger line", () => {
    const cwd = tmp();
    try {
      const e1 = makeGovernanceEvent({ type: "task.started", external_id: "BOIAA-3", actor });
      appendEvent(cwd, e1);
      appendFileSync(ledgerPath(cwd), "{ not json\n", "utf-8");
      expect(() => readLedger(cwd)).toThrow(/governance ledger line/);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("throws a line-aware error when a ledger line is valid JSON but fails schema validation", () => {
    const cwd = tmp();
    try {
      const e1 = makeGovernanceEvent({ type: "task.started", external_id: "BOIAA-4", actor });
      appendEvent(cwd, e1);
      // Valid JSON but missing required fields (event_id, external_id, timestamp, actor)
      appendFileSync(ledgerPath(cwd), JSON.stringify({ schema_version: 1, type: "task.started" }) + "\n", "utf-8");
      let thrown: unknown;
      try {
        readLedger(cwd);
      } catch (err) {
        thrown = err;
      }
      expect(thrown).toBeInstanceOf(MatilhaUserError);
      const userErr = thrown as MatilhaUserError;
      expect(userErr.matilhaError.summary).toMatch(/governance ledger line/);
      expect(userErr.matilhaError.context).toMatch(/events\.ndjson:2/);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });
});
