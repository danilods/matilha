// src/hunt/huntCommand.ts
import { existsSync, writeFileSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { parse as parseYaml } from "yaml";
import { readFileSync } from "node:fs";
import { MatilhaUserError } from "../ui/errorFormat";
import { printMiniBanner } from "../ui/banner";
import { createStream } from "../ui/stream";
import { RegistryClient } from "../registry/registryClient";
import { resolvePlanPath } from "./planPathResolver";
import { parsePlan, type ParsedWave } from "./planParser";
import { validateDisjunction } from "./disjunctionValidator";
import {
  branchExists,
  createBranch,
  createWorktree,
  hasUncommittedChanges,
  removeWorktreeIfExists,
  deleteBranch,
  getCurrentCommit
} from "./worktreeCreator";
import { ensureGitignoreEntry } from "./gitignoreUtil";
import { renderKickoff, renderSPDone } from "./kickoffRenderer";
import { writeWaveStatus } from "./waveStatusWriter";
import { PrintDispatcher, type DispatchReport } from "./dispatcher";
import type { Wave } from "../domain/waveSchema";

export type HuntOptions = {
  wave?: number;
  dryRun?: boolean;
  force?: boolean;
  allowOverlap?: boolean;
  registry?: { pullRaw: (slug: string) => Promise<string> };
};

type ProjectStatusLite = {
  name: string;
  current_phase: number;
  companion_skills: { superpowers: string };
};

function slugifySP(title: string): string {
  return title.toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

function padWave(n: number): string {
  return n.toString().padStart(2, "0");
}

function pickWave(waves: ParsedWave[], explicit?: number): ParsedWave {
  if (explicit !== undefined) {
    const id = `w${explicit}`;
    const w = waves.find((x) => x.id === id);
    if (!w) {
      throw new MatilhaUserError({
        summary: `wave ${id} not found in plan`,
        context: "matilha hunt was picking which wave to dispatch",
        problem: `plan frontmatter declares waves: ${waves.map((w) => w.id).join(", ")}`,
        nextActions: ["pass a valid --wave value", "or omit --wave to dispatch the first pending wave"]
      });
    }
    return w;
  }
  // parsePlan guarantees >=1 wave (frontmatter.waves keys produce entries); assert under strict flag.
  return waves[0]!;
}

export async function huntCommand(
  cwd: string,
  featureSlug: string,
  opts: HuntOptions = {}
): Promise<void> {
  const s = createStream();
  printMiniBanner(`matilha hunt — ${featureSlug}`, "Phase 40 wave dispatch");

  // === Pre-flight (Swiss Cheese) ===
  s.section("pre-flight");

  const planPath = resolvePlanPath(cwd, featureSlug);
  s.step("plan file").ok(planPath.replace(cwd + "/", ""));

  const statusPath = join(cwd, "project-status.md");
  if (!existsSync(statusPath)) {
    s.step("project-status.md").fail();
    throw new MatilhaUserError({
      summary: "project-status.md missing",
      context: "matilha hunt was checking project phase",
      problem: "no project-status.md at the repo root.",
      nextActions: ["run 'matilha init' to scaffold the project"]
    });
  }
  const statusRaw = readFileSync(statusPath, "utf-8");
  const fmMatch = statusRaw.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) {
    throw new MatilhaUserError({
      summary: "project-status.md has no frontmatter",
      context: "matilha hunt was reading project phase",
      problem: "the file lacks a YAML frontmatter block.",
      nextActions: ["restore project-status.md — re-run 'matilha init --force' if needed"]
    });
  }
  // fmMatch narrowed non-null above; capture group 1 exists by regex shape — assert under strict flag.
  const status = parseYaml(fmMatch[1]!) as ProjectStatusLite;

  if (status.current_phase < 30) {
    s.step("current_phase >= 30").fail(String(status.current_phase));
    throw new MatilhaUserError({
      summary: "project is not ready for /hunt (needs phase 30 done)",
      context: "matilha hunt enforces phase gating per methodology/40-execucao",
      problem: `project-status.md shows current_phase: ${status.current_phase}; /hunt needs ≥ 30.`,
      nextActions: [
        "run 'matilha howl' to see your phase and next action",
        "finish Phases 10/20/30 via 'matilha plan' + 'matilha attest' first"
      ]
    });
  }
  s.step("current_phase >= 30").ok(String(status.current_phase));

  if (await hasUncommittedChanges(cwd)) {
    s.step("working tree clean").fail();
    throw new MatilhaUserError({
      summary: "uncommitted changes on current branch",
      context: "matilha hunt creates worktrees from HEAD",
      problem: "uncommitted changes wouldn't propagate to the new worktrees.",
      nextActions: [
        "commit your changes: git add -A && git commit -m '<message>'",
        "or stash: git stash",
        "or discard: git checkout -- . (destructive — careful)"
      ]
    });
  }
  s.step("working tree clean").ok();

  // === Parse plan ===
  s.section("parsing plan");
  const planMarkdown = readFileSync(planPath, "utf-8");
  const parsed = parsePlan(planMarkdown);
  s.step("frontmatter + body").ok(`${parsed.waves.length} wave(s), ${parsed.waves.reduce((acc, w) => acc + w.sps.length, 0)} SP(s)`);
  for (const w of parsed.warnings) {
    s.step(`soft-strict warning`).warn(w);
  }

  const wave = pickWave(parsed.waves, opts.wave);

  // === Disjunction ===
  s.section("validating disjunction");
  const disjunction = validateDisjunction(wave.sps);
  if (disjunction.violations.length > 0) {
    if (!opts.allowOverlap) {
      s.step("disjunction").fail(`${disjunction.violations.length} overlap(s)`);
      throw new MatilhaUserError(disjunction.toError(wave.id)!);
    }
    s.step("disjunction").warn(`${disjunction.violations.length} overlap(s) — bypassed by --allow-overlap`);
  } else {
    s.step("disjunction").ok("no overlap");
  }

  // === Companions ===
  const superpowersDetected = status.companion_skills?.superpowers === "installed";
  s.step("detecting companions").ok(superpowersDetected ? "superpowers present" : "superpowers absent");

  // === Idempotency guard ===
  const waveNum = parseInt(wave.id.slice(1), 10);
  const waveStatusPath = join(cwd, `docs/matilha/waves/wave-${padWave(waveNum)}-status.md`);
  if (existsSync(waveStatusPath) && !opts.force) {
    throw new MatilhaUserError({
      summary: `wave ${padWave(waveNum)} already dispatched`,
      context: `matilha hunt found ${waveStatusPath.replace(cwd + "/", "")}`,
      problem: "re-running would stomp an active wave.",
      nextActions: [
        `inspect: cat ${waveStatusPath.replace(cwd + "/", "")}`,
        `start another wave: matilha hunt ${featureSlug} --wave ${waveNum + 1}`,
        `re-dispatch (destructive, only if no SP-DONE.md exists): matilha hunt ${featureSlug} --force`
      ]
    });
  }

  // === Dry-run exit ===
  if (opts.dryRun) {
    s.section("dry-run preview");
    for (const sp of wave.sps) {
      const branch = `wave-${padWave(waveNum)}-sp-${slugifySP(sp.title)}`;
      const wtPath = join(dirname(cwd), `${status.name}-sp-${slugifySP(sp.title)}`);
      s.step(sp.id).dryRun(`branch=${branch}, worktree=${wtPath}`);
    }
    s.step(`wave-${padWave(waveNum)}-status.md`).dryRun(waveStatusPath.replace(cwd + "/", ""));
    s.footer("dry-run complete. no mutations performed.");
    return;
  }

  // === --force destructive recovery log ===
  if (opts.force && existsSync(waveStatusPath)) {
    s.section("recovery info (save this before --force destroys state)");
    for (const sp of wave.sps) {
      const branch = `wave-${padWave(waveNum)}-sp-${slugifySP(sp.title)}`;
      if (await branchExists(cwd, branch)) {
        const commit = await getCurrentCommit(cwd, branch);
        s.step(`${sp.id} branch`).ok(`${branch} at ${commit}`);
      }
    }
  }

  // === Create branches + worktrees + kickoffs ===
  const registry = opts.registry ?? new RegistryClient();
  const kickoffTmpl = await registry.pullRaw("templates/kickoff.md.tmpl");
  const spDoneTmpl = await registry.pullRaw("templates/sp-done.md.tmpl");
  s.step("fetched templates").ok("kickoff + sp-done");

  s.section(`creating branches + worktrees (wave ${padWave(waveNum)})`);

  const waveEntries: Wave["sps"] = {};
  for (const sp of wave.sps) {
    const branch = `wave-${padWave(waveNum)}-sp-${slugifySP(sp.title)}`;
    const wtPath = join(dirname(cwd), `${status.name}-sp-${slugifySP(sp.title)}`);

    if (opts.force) {
      await removeWorktreeIfExists(cwd, wtPath);
      if (await branchExists(cwd, branch)) {
        await deleteBranch(cwd, branch);
      }
    }

    await createBranch(cwd, branch);
    await createWorktree(cwd, wtPath, branch);

    const kickoffRendered = renderKickoff(kickoffTmpl, {
      feature_slug: featureSlug,
      wave_num: waveNum,
      wave_id: wave.id,
      sp,
      worktree_path: wtPath,
      branch_name: branch,
      main_repo_path: cwd,
      superpowers_detected: superpowersDetected
    });
    writeFileSync(join(wtPath, "kickoff.md"), kickoffRendered, "utf-8");

    const spDoneRendered = renderSPDone(spDoneTmpl, {
      feature_slug: featureSlug,
      wave_id: wave.id,
      sp_id: sp.id
    });
    writeFileSync(join(wtPath, "SP-DONE.md"), spDoneRendered, "utf-8");

    waveEntries[sp.id] = {
      branch,
      worktree: wtPath,
      status: "pending",
      started: null,
      session_id: null
    };
    s.step(`${sp.id} ${basename(wtPath)}`).ok();
  }

  // === gitignore ===
  s.section("updating .gitignore");
  const giResult = ensureGitignoreEntry(cwd, "kickoff.md");
  s.step(".gitignore").ok(giResult.action);

  // === wave-status.md ===
  s.section("writing wave status");
  const waveObj: Wave = {
    wave: wave.id,
    created: new Date().toISOString().replace(/\.\d+Z$/, "Z"),
    started: null,
    ended: null,
    status: "pending",
    plan: planPath.replace(cwd + "/", ""),
    sps: waveEntries,
    merge_order: wave.sps.map((sp) => sp.id),
    regression_status: "pending",
    review_report: null
  };
  const waveOutPath = writeWaveStatus(cwd, waveObj, featureSlug);
  s.step(waveOutPath.replace(cwd + "/", "")).ok();

  // === Dispatch (PrintDispatcher only in Wave 3a) ===
  s.section("dispatch commands");
  const dispatcher = new PrintDispatcher();
  const reports: DispatchReport[] = [];
  for (const sp of wave.sps) {
    // waveEntries[sp.id] was assigned in the loop above — safe under strict flag.
    const entry = waveEntries[sp.id]!;
    const r = await dispatcher.dispatch({
      sp,
      worktreePath: entry.worktree,
      branchName: entry.branch,
      kickoffPath: join(entry.worktree, "kickoff.md"),
      companions: { superpowers: superpowersDetected }
    });
    reports.push(r);
    s.step(`${sp.id}`).ok(r.command);
  }

  // === Bookend ===
  s.footer(
    `wave ${padWave(waveNum)} dispatched. ${wave.sps.length} worktree(s) ready.\n\n` +
    `next:\n  paste each dispatch command in a new terminal\n  when every SP has SP-DONE.md, run /gather (Wave 3b, not yet shipped)`
  );
}
