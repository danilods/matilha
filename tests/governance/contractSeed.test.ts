import { describe, it, expect } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { seedTaskCreatedEvents } from "../../src/governance/contractSeed";
import { readLedger } from "../../src/governance/ledger";

function writeContract(dir: string): string {
  const path = join(dir, "tasks.json");
  writeFileSync(
    path,
    JSON.stringify({
      schema_version: 1,
      project_key: "BOIAA",
      // story_points fica no contrato de propósito: o seeder deve IGNORÁ-lo
      // (story points são medidos no fechamento da task, não vêm da criação).
      tasks: [
        {
          external_id: "BOIAA-1042",
          summary: "AdminLayout",
          description_markdown: "shell de navegacao",
          story_points: 3,
          category: "frontend",
          issue_kind: "foundation"
        },
        {
          external_id: "BOIAA-1043",
          summary: "Lista de alvos",
          description_markdown: "tabela paginada",
          story_points: 5
        }
      ]
    }),
    "utf-8"
  );
  return path;
}

describe("seedTaskCreatedEvents", () => {
  it("emits one task.created event per contract task, without story points", () => {
    const dir = mkdtempSync(join(tmpdir(), "matilha-seed-"));
    try {
      const result = seedTaskCreatedEvents(dir, writeContract(dir));
      expect(result).toEqual({ total: 2, seeded: 2, skipped: 0 });

      const events = readLedger(dir);
      expect(events).toHaveLength(2);
      const first = events.find((e) => e.external_id === "BOIAA-1042")!;
      expect(first.type).toBe("task.created");
      expect(first.issue_key).toBe("BOIAA-1042");
      if (first.type === "task.created") {
        expect(first.payload).not.toHaveProperty("story_points");
        expect(first.payload.category).toBe("frontend");
        expect(first.payload.issue_kind).toBe("foundation");
      }

      const second = events.find((e) => e.external_id === "BOIAA-1043")!;
      expect(second.type).toBe("task.created");
      if (second.type === "task.created") {
        expect(second.payload).not.toHaveProperty("story_points");
        expect(second.payload).not.toHaveProperty("category");
        expect(second.payload).not.toHaveProperty("issue_kind");
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("is idempotent — re-seeding the same contract writes nothing new", () => {
    const dir = mkdtempSync(join(tmpdir(), "matilha-seed-"));
    try {
      const path = writeContract(dir);
      seedTaskCreatedEvents(dir, path);
      const second = seedTaskCreatedEvents(dir, path);
      expect(second).toEqual({ total: 2, seeded: 0, skipped: 2 });
      expect(readLedger(dir)).toHaveLength(2);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
