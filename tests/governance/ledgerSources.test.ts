import { describe, it, expect } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  resolveLedgerRoots,
  readMergedLedger,
  sourcesPath
} from "../../src/governance/ledgerSources";
import { appendEvent } from "../../src/governance/ledger";
import { makeGovernanceEvent } from "../../src/governance/events";

const actor = { tool: "claude-code" };

function repoWithEvent(externalId: string, timestamp: string): string {
  const dir = mkdtempSync(join(tmpdir(), "matilha-src-"));
  appendEvent(dir, makeGovernanceEvent({ type: "task.started", external_id: externalId, issue_key: externalId, actor, timestamp }));
  return dir;
}

describe("ledger sources", () => {
  it("defaults to the single local repo root when no sources.json and no --ledger", () => {
    const dir = mkdtempSync(join(tmpdir(), "matilha-src-"));
    try {
      expect(resolveLedgerRoots(dir, {})).toEqual([dir]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("uses explicit --ledger roots resolved against cwd", () => {
    const dir = mkdtempSync(join(tmpdir(), "matilha-src-"));
    try {
      const roots = resolveLedgerRoots(dir, { ledger: ["/abs/repo-a", "rel/repo-b"] });
      expect(roots[0]).toBe("/abs/repo-a");
      expect(roots[1]).toBe(join(dir, "rel/repo-b"));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("reads ledger roots from sources.json, resolved against the sources file location", () => {
    const dir = mkdtempSync(join(tmpdir(), "matilha-src-"));
    try {
      mkdirSync(join(dir, "docs", "matilha", "governance"), { recursive: true });
      writeFileSync(
        sourcesPath(dir),
        JSON.stringify({ schema_version: 1, ledgers: ["../repo-x", "/abs/repo-y"] }),
        "utf-8"
      );
      const roots = resolveLedgerRoots(dir, {});
      expect(roots[0]).toBe(join(dir, "docs", "matilha", "repo-x"));
      expect(roots[1]).toBe("/abs/repo-y");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("merges events across roots, deduping by event_id and sorting by timestamp", () => {
    const repoA = repoWithEvent("BOIAA-1", "2026-05-19T12:00:00Z");
    const repoB = repoWithEvent("BOIAA-2", "2026-05-19T09:00:00Z");
    try {
      const merged = readMergedLedger([repoA, repoB, repoA]); // repoA twice → dedup
      expect(merged).toHaveLength(2);
      expect(merged.map((e) => e.external_id)).toEqual(["BOIAA-2", "BOIAA-1"]); // sorted by timestamp
    } finally {
      rmSync(repoA, { recursive: true, force: true });
      rmSync(repoB, { recursive: true, force: true });
    }
  });

  it("throws a clear error on an invalid sources.json", () => {
    const dir = mkdtempSync(join(tmpdir(), "matilha-src-"));
    try {
      mkdirSync(join(dir, "docs", "matilha", "governance"), { recursive: true });
      writeFileSync(sourcesPath(dir), JSON.stringify({ schema_version: 99 }), "utf-8");
      expect(() => resolveLedgerRoots(dir, {})).toThrow(/governance sources/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
