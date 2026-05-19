import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseFrontmatter } from "../util/frontmatter";
import { projectStatusSchema, type ProjectStatus } from "../domain/projectStatusSchema";

export type NextActionRisk = "read" | "local_mutation" | "remote_mutation" | "destructive";

export type NextAction = {
  id: string;
  label: string;
  command: string;
  reason: string;
  risk: NextActionRisk;
  default: boolean;
  requiresPreview?: boolean;
  alternatives?: string[];
};

export function resolveNextAction(cwd: string): NextAction | null {
  const pendingEvents = countPendingEvents(cwd);
  if (pendingEvents > 0) {
    return {
      id: "jira.sync.preview",
      label: "Sync pending Jira updates",
      command: "matilha jira sync --preview",
      reason: `${pendingEvents} pending task.completed event(s) are waiting in the outbox.`,
      risk: "remote_mutation",
      default: false,
      requiresPreview: true,
      alternatives: ["matilha status", "matilha jira sync --yes"]
    };
  }

  const status = tryReadProjectStatus(cwd);
  if (!status) {
    return {
      id: "project.start",
      label: "Start Matilha in this project",
      command: "matilha start",
      reason: "project-status.md was not found.",
      risk: "local_mutation",
      default: true
    };
  }

  const activeWave = status.active_waves[0];
  const activeFeature = activeWave
    ? status.feature_artifacts.find((feature) => feature.wave === activeWave)
    : undefined;
  if (activeWave && activeFeature) {
    return {
      id: "wave.merge",
      label: `Merge completed worktree tasks for ${activeFeature.name}`,
      command: `matilha merge ${activeFeature.name} --wave ${waveNumber(activeWave)}`,
      reason: `${activeWave} is active for ${activeFeature.name}.`,
      risk: "local_mutation",
      default: true,
      alternatives: ["matilha progress", "matilha status"]
    };
  }

  if (status.current_phase === 0) {
    return {
      id: "phase.discover",
      label: "Discover the problem space",
      command: "matilha discover",
      reason: "the project is still in Phase 00.",
      risk: "local_mutation",
      default: true,
      alternatives: ["matilha status"]
    };
  }

  if (status.current_phase === 40 && status.completed_waves.length > 0) {
    return {
      id: "gate.approve.phase40",
      label: "Approve the Phase 40 gate",
      command: "matilha approve phase-40-gate",
      reason: "at least one wave is completed and no pending completion events were found.",
      risk: "local_mutation",
      default: true,
      alternatives: ["matilha progress", "matilha status"]
    };
  }

  const latestFeature = status.feature_artifacts.at(-1);
  if (status.current_phase >= 30 && latestFeature) {
    return {
      id: "wave.split",
      label: `Split ${latestFeature.name} into parallel worktree tasks`,
      command: `matilha split ${latestFeature.name}`,
      reason: "the project is ready for Phase 40 execution planning.",
      risk: "local_mutation",
      default: true,
      alternatives: ["matilha progress", "matilha status"]
    };
  }

  if (status.current_phase >= 10) {
    return {
      id: "feature.spec",
      label: "Create or continue a feature spec",
      command: "matilha spec <slug>",
      reason: "the project has completed discovery and needs a feature artifact.",
      risk: "local_mutation",
      default: false,
      alternatives: ["matilha progress", "matilha status"]
    };
  }

  return null;
}

function tryReadProjectStatus(cwd: string): ProjectStatus | null {
  const path = join(cwd, "project-status.md");
  if (!existsSync(path)) return null;
  const raw = readFileSync(path, "utf-8");
  const fm = parseFrontmatter<unknown>(raw);
  const result = projectStatusSchema.safeParse(fm.data);
  if (!result.success) return null;
  return result.data;
}

function countPendingEvents(cwd: string): number {
  const outbox = join(cwd, "docs", "matilha", "events", "outbox");
  if (!existsSync(outbox)) return 0;
  return readdirSync(outbox).filter((file) => file.endsWith(".json")).length;
}

function waveNumber(wave: string): number {
  return Number(wave.replace(/^w/, ""));
}
