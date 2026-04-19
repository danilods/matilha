// src/gather/gatherCommand.ts
import { MatilhaUserError } from "../ui/errorFormat";
import { printMiniBanner } from "../ui/banner";
import { createStream } from "../ui/stream";
import { hasUncommittedChanges } from "../hunt/worktreeCreator";
import { execGit } from "../hunt/execGit";
import { padWave } from "../hunt/naming";
import { readWaveStatus } from "./waveStatusReader";
import { readAndValidateSPDone } from "./spDoneReader";
import { mergeBranch, runTests, type RunTestsOptions } from "./mergeExecutor";
import { cleanupSP } from "./cleanupExecutor";
import {
  markWaveStarted,
  markSPMerged,
  markSPFailed,
  markWaveCompleted
} from "./waveStatusUpdater";

export type GatherOptions = {
  wave?: number;
  dryRun?: boolean;
  cleanup?: boolean;
  testCmd?: RunTestsOptions;
};

async function currentBranch(cwd: string): Promise<string> {
  const { stdout } = await execGit(["rev-parse", "--abbrev-ref", "HEAD"], { cwd });
  return stdout.trim();
}

export async function gatherCommand(
  cwd: string,
  featureSlug: string,
  opts: GatherOptions = {}
): Promise<void> {
  const s = createStream();
  const waveNum = opts.wave ?? 1;
  printMiniBanner(`matilha gather — ${featureSlug}`, `Phase 40 wave ${padWave(waveNum)} merge`);

  // === Pre-flight ===
  s.section("pre-flight");

  const { wave, absPath: waveStatusPath } = readWaveStatus(cwd, waveNum);
  s.step("wave-status").ok(waveStatusPath.replace(cwd + "/", ""));

  if (wave.status === "completed") {
    s.step("wave already completed").ok();
    s.footer(`wave ${padWave(waveNum)} already gathered. no-op. next: 'matilha attest' to advance phase.`);
    return;
  }

  if (wave.status === "failed") {
    s.step("wave marked failed").fail();
    throw new MatilhaUserError({
      summary: `wave ${padWave(waveNum)} halted on a prior run — manual recovery required before retry`,
      context: `matilha gather found wave-status.status=failed for wave ${waveNum}`,
      problem: `a previous /gather invocation halted (merge conflict or regression). State is preserved for inspection.`,
      nextActions: [
        `inspect: cat ${waveStatusPath.replace(cwd + "/", "")}`,
        `resolve the failed SP manually (fix code, rerun tests, or revert via 'git reset --hard <sha>')`,
        `then reset the failed SP entry in wave-status back to 'pending' and re-run 'matilha gather ${featureSlug} --wave ${waveNum}'`
      ]
    });
  }

  const branch = await currentBranch(cwd);
  if (branch.startsWith("wave-") && branch.includes("-sp-")) {
    s.step("on integration branch").fail(branch);
    throw new MatilhaUserError({
      summary: `matilha gather must run from the integration branch, not an SP branch`,
      context: `matilha gather was checking the current branch`,
      problem: `current branch '${branch}' looks like an SP branch; gather merges SPs INTO the integration branch.`,
      nextActions: [
        `git checkout main`,
        `or switch to your integration branch`,
        `then re-run 'matilha gather ${featureSlug} --wave ${waveNum}'`
      ]
    });
  }
  s.step("on integration branch").ok(branch);

  if (await hasUncommittedChanges(cwd)) {
    s.step("working tree clean").fail();
    throw new MatilhaUserError({
      summary: `uncommitted changes on current branch`,
      context: `matilha gather merges SP branches onto ${branch}`,
      problem: `uncommitted changes would mix with merge commits.`,
      nextActions: [
        `commit your changes: git add -A && git commit -m '<message>'`,
        `or stash: git stash`
      ]
    });
  }
  s.step("working tree clean").ok();

  s.section("validating SP-DONE gates");
  for (const spId of wave.merge_order) {
    const entry = wave.sps[spId];
    if (!entry) {
      throw new MatilhaUserError({
        summary: `merge_order references unknown SP ${spId}`,
        context: `matilha gather was walking wave.merge_order`,
        problem: `SP ${spId} listed in merge_order but missing from wave.sps.`,
        nextActions: ["fix wave-status frontmatter or re-run 'matilha hunt <slug> --force'"]
      });
    }
    if (entry.status === "completed") {
      s.step(spId).skip("already merged");
      continue;
    }
    if (entry.status === "failed") {
      throw new MatilhaUserError({
        summary: `${spId} has status=failed in wave-status — manual recovery required`,
        context: `matilha gather was pre-flighting SP readiness`,
        problem: `${spId} failed on a prior /gather run. /gather refuses to auto-retry.`,
        nextActions: [
          `inspect the failure state in ${waveStatusPath.replace(cwd + "/", "")}`,
          `once resolved, edit the SP entry's status back to 'pending' and re-run gather`
        ]
      });
    }
    readAndValidateSPDone(entry.worktree, { sp_id: spId, feature: featureSlug, wave: wave.wave });
    s.step(spId).ok("SP-DONE gates pass");
  }

  if (opts.dryRun) {
    s.section("dry-run preview");
    for (const spId of wave.merge_order) {
      const entry = wave.sps[spId]!;
      if (entry.status === "completed") {
        s.step(spId).dryRun("would skip — already merged");
      } else {
        s.step(spId).dryRun(`would merge ${entry.branch} (no-ff) + run tests`);
      }
    }
    s.step("cleanup").dryRun(opts.cleanup ? "would remove worktrees + delete branches" : "skipped (no --cleanup)");
    s.footer("dry-run complete. no mutations performed.");
    return;
  }

  s.section(`merging wave ${padWave(waveNum)}`);
  markWaveStarted(cwd, waveNum);

  for (const spId of wave.merge_order) {
    const entry = wave.sps[spId]!;
    if (entry.status === "completed") {
      s.step(spId).skip("already merged");
      continue;
    }

    const { stdout: beforeSha } = await execGit(["rev-parse", "HEAD"], { cwd });
    const mergeResult = await mergeBranch(cwd, entry.branch);
    if (!mergeResult.ok) {
      markSPFailed(cwd, waveNum, spId);
      if (mergeResult.reason === "conflict") {
        s.step(spId).fail(`conflict in ${mergeResult.files.length} file(s)`);
        throw new MatilhaUserError({
          summary: `${spId} merge conflict against ${branch}`,
          context: `matilha gather was merging ${entry.branch} into ${branch}`,
          problem: `git merge --no-ff produced conflicts in: ${mergeResult.files.join(", ")}. gather ran 'git merge --abort' to restore clean state.`,
          nextActions: [
            `resolve the conflict manually: git merge --no-ff ${entry.branch} (then fix files)`,
            `or move the overlap to a later wave by editing the plan and re-running 'matilha hunt ${featureSlug} --force --wave ${waveNum}'`
          ]
        });
      }
      s.step(spId).fail(`git error: ${mergeResult.error.slice(0, 120)}`);
      throw new MatilhaUserError({
        summary: `${spId} merge failed with an unexpected git error`,
        context: `matilha gather was merging ${entry.branch}`,
        problem: mergeResult.error,
        nextActions: [
          `inspect git state: git status`,
          `resolve manually then re-run 'matilha gather ${featureSlug} --wave ${waveNum}'`
        ]
      });
    }

    const testResult = await runTests(cwd, opts.testCmd);
    if (!testResult.ok) {
      markSPFailed(cwd, waveNum, spId);
      s.step(`${spId} regression`).fail();
      throw new MatilhaUserError({
        summary: `${spId} regression failed after merge`,
        context: `matilha gather ran the test suite after merging ${entry.branch}`,
        problem: `test command failed; output:\n${testResult.output.slice(0, 800)}`,
        nextActions: [
          `inspect the failure: re-run the test command manually in ${cwd}`,
          `revert this merge if needed: git reset --hard ${beforeSha.trim()}`,
          `then fix the regression and re-run 'matilha gather ${featureSlug} --wave ${waveNum}'`
        ]
      });
    }

    markSPMerged(cwd, waveNum, spId);
    s.step(spId).ok(`merged + tests passed`);
  }

  markWaveCompleted(cwd, waveNum);
  s.section("finalized");
  s.step("wave-status").ok("completed + regression passed");

  if (opts.cleanup) {
    s.section("cleanup");
    const { wave: finalWave } = readWaveStatus(cwd, waveNum);
    let removedCount = 0;
    let deletedCount = 0;
    for (const spId of finalWave.merge_order) {
      const entry = finalWave.sps[spId]!;
      if (entry.status !== "completed") continue;
      const result = await cleanupSP(cwd, entry.worktree, entry.branch);
      if (result.worktreeRemoved) removedCount++;
      if (result.branchDeleted) deletedCount++;
      s.step(spId).ok(`worktree=${result.worktreeRemoved ? "removed" : "kept"}, branch=${result.branchDeleted ? "deleted" : "kept"}`);
    }
    s.step("total").ok(`${removedCount} worktree(s) removed, ${deletedCount} branch(es) deleted`);
  }

  s.footer(
    `wave ${padWave(waveNum)} gathered. ${wave.merge_order.length} SP(s) merged. regression: passed.\n\n` +
    `next:\n` +
    `  run 'matilha howl' to see project state\n` +
    `  attest phase-40 when the wave is settled: 'matilha attest phase-40-gate'\n` +
    `  /review (Wave 3c) will consume wave-status once it ships`
  );
}
