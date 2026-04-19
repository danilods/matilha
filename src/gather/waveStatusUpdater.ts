// src/gather/waveStatusUpdater.ts
import { readWaveStatus } from "./waveStatusReader";
import { writeWaveStatus } from "../hunt/waveStatusWriter";
import type { Wave } from "../domain/waveSchema";

function isoNow(): string {
  return new Date().toISOString().replace(/\.\d+Z$/, "Z");
}

function deriveSlugFromPlanPath(planPath: string): string {
  // "docs/matilha/plans/feat-auth-plan.md" → "feat-auth"
  const base = planPath.split("/").pop() ?? "";
  return base.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/-plan\.md$/, "");
}

function loadAndMutate(cwd: string, waveNum: number, mutate: (w: Wave) => Wave): void {
  const { wave } = readWaveStatus(cwd, waveNum);
  const next = mutate(wave);
  const slug = deriveSlugFromPlanPath(next.plan);
  writeWaveStatus(cwd, next, slug);
}

export function markWaveStarted(cwd: string, waveNum: number): void {
  loadAndMutate(cwd, waveNum, (w) => {
    if (w.status === "in_progress") return w; // idempotent
    return { ...w, status: "in_progress", started: w.started ?? isoNow() };
  });
}

export function markSPMerged(cwd: string, waveNum: number, spId: string): void {
  loadAndMutate(cwd, waveNum, (w) => {
    const entry = w.sps[spId];
    if (!entry) throw new Error(`SP ${spId} not in wave-status`);
    return { ...w, sps: { ...w.sps, [spId]: { ...entry, status: "completed" } } };
  });
}

export function markSPFailed(cwd: string, waveNum: number, spId: string): void {
  loadAndMutate(cwd, waveNum, (w) => {
    const entry = w.sps[spId];
    if (!entry) throw new Error(`SP ${spId} not in wave-status`);
    return {
      ...w,
      status: "failed",
      regression_status: "failed",
      sps: { ...w.sps, [spId]: { ...entry, status: "failed" } }
    };
  });
}

export function markWaveCompleted(cwd: string, waveNum: number): void {
  loadAndMutate(cwd, waveNum, (w) => ({
    ...w,
    status: "completed",
    regression_status: "passed",
    ended: isoNow()
  }));
}

export function markWaveFailed(cwd: string, waveNum: number): void {
  loadAndMutate(cwd, waveNum, (w) => ({
    ...w,
    status: "failed",
    regression_status: "failed"
  }));
}
