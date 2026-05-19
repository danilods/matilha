import { describe, it, expect } from "vitest";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { emitTaskCompletedEvent } from "../../src/events/outbox";

describe("Matilha event outbox", () => {
  it("writes a durable task.completed event and keeps emission idempotent", () => {
    const tmp = mkdtempSync(join(tmpdir(), "matilha-events-"));
    try {
      const input = {
        featureSlug: "feat-auth",
        wave: "w1",
        spId: "SP1",
        plan: "docs/matilha/plans/feat-auth-plan.md",
        branch: "wave-01-sp-a",
        spDone: {
          type: "sp-done" as const,
          sp_id: "SP1",
          feature: "feat-auth",
          wave: "w1",
          status: "completed" as const,
          completed_at: "2026-05-19T03:00:00Z",
          commits: ["abc123"],
          tests: { passed: true as const, count: 3 },
          tracking: {
            story_points: 0.25,
            worklog: "15m",
            comment_markdown: "Merged, tested, and reviewed."
          }
        }
      };

      const first = emitTaskCompletedEvent(tmp, input);
      const second = emitTaskCompletedEvent(tmp, input);

      expect(first.status).toBe("written");
      expect(second.status).toBe("exists");
      const files = readdirSync(join(tmp, "docs", "matilha", "events", "outbox"));
      expect(files).toHaveLength(1);
      const event = JSON.parse(readFileSync(first.path, "utf-8"));
      expect(event.event).toBe("task.completed");
      expect(event.external_id).toBe("feat-auth-SP1");
      expect(event.result.story_points).toBe(0.25);
      expect(event.result.worklog).toBe("15m");
      expect(event.source.plan).toBe("docs/matilha/plans/feat-auth-plan.md");
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
