// tests/gather/waveStatusUpdater.test.ts
import { describe, it, expect } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { writeWaveStatus } from "../../src/hunt/waveStatusWriter";
import { readWaveStatus } from "../../src/gather/waveStatusReader";
import {
  markSPMerged,
  markSPFailed,
  markWaveStarted,
  markWaveCompleted,
  markWaveFailed
} from "../../src/gather/waveStatusUpdater";
import type { Wave } from "../../src/domain/waveSchema";

function seedWave(): { repo: string; wave: Wave } {
  const repo = mkdtempSync(join(tmpdir(), "matilha-gather-wsu-"));
  const wave: Wave = {
    wave: "w1",
    created: "2026-04-19T00:00:00Z",
    started: null,
    ended: null,
    status: "pending",
    plan: "docs/matilha/plans/feat-auth-plan.md",
    sps: {
      SP1: { branch: "wave-01-sp-a", worktree: "/tmp/a", status: "pending", started: null, session_id: null },
      SP2: { branch: "wave-01-sp-b", worktree: "/tmp/b", status: "pending", started: null, session_id: null }
    },
    merge_order: ["SP1", "SP2"],
    regression_status: "pending",
    review_report: null
  };
  writeWaveStatus(repo, wave, "feat-auth");
  return { repo, wave };
}

describe("markSPMerged", () => {
  it("sets sps.SP_i.status to completed and persists to disk", () => {
    const { repo } = seedWave();
    try {
      markSPMerged(repo, 1, "SP1");
      const { wave } = readWaveStatus(repo, 1);
      expect(wave.sps.SP1!.status).toBe("completed");
    } finally { rmSync(repo, { recursive: true, force: true }); }
  });
});

describe("markSPFailed", () => {
  it("sets sps.SP_i.status=failed, regression_status=failed, wave.status=failed", () => {
    const { repo } = seedWave();
    try {
      markSPFailed(repo, 1, "SP2");
      const { wave } = readWaveStatus(repo, 1);
      expect(wave.sps.SP2!.status).toBe("failed");
      expect(wave.regression_status).toBe("failed");
      expect(wave.status).toBe("failed");
    } finally { rmSync(repo, { recursive: true, force: true }); }
  });
});

describe("markWaveStarted", () => {
  it("sets status=in_progress and started=<iso> when wave was pending", () => {
    const { repo } = seedWave();
    try {
      markWaveStarted(repo, 1);
      const { wave } = readWaveStatus(repo, 1);
      expect(wave.status).toBe("in_progress");
      expect(wave.started).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    } finally { rmSync(repo, { recursive: true, force: true }); }
  });

  it("is a no-op when wave was already in_progress (does not overwrite started)", () => {
    const { repo } = seedWave();
    try {
      markWaveStarted(repo, 1);
      const first = readWaveStatus(repo, 1).wave.started;
      markWaveStarted(repo, 1);
      const second = readWaveStatus(repo, 1).wave.started;
      expect(second).toBe(first);
    } finally { rmSync(repo, { recursive: true, force: true }); }
  });
});

describe("markWaveCompleted", () => {
  it("sets status=completed, regression_status=passed, ended=<iso>", () => {
    const { repo } = seedWave();
    try {
      markWaveStarted(repo, 1);
      markSPMerged(repo, 1, "SP1");
      markSPMerged(repo, 1, "SP2");
      markWaveCompleted(repo, 1);
      const { wave } = readWaveStatus(repo, 1);
      expect(wave.status).toBe("completed");
      expect(wave.regression_status).toBe("passed");
      expect(wave.ended).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    } finally { rmSync(repo, { recursive: true, force: true }); }
  });
});

describe("markWaveFailed", () => {
  it("sets status=failed and regression_status=failed (ended stays null)", () => {
    const { repo } = seedWave();
    try {
      markWaveFailed(repo, 1);
      const { wave } = readWaveStatus(repo, 1);
      expect(wave.status).toBe("failed");
      expect(wave.regression_status).toBe("failed");
      expect(wave.ended).toBeNull();
    } finally { rmSync(repo, { recursive: true, force: true }); }
  });
});
