// src/gather/mergeExecutor.ts
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { execGit } from "../hunt/execGit";

const execFileAsync = promisify(execFile);

export type MergeSuccess = { ok: true; mergeSha: string };
export type MergeFailure =
  | { ok: false; reason: "conflict"; files: string[] }
  | { ok: false; reason: "unknown"; error: string };
export type MergeResult = MergeSuccess | MergeFailure;

export async function mergeBranch(cwd: string, branch: string): Promise<MergeResult> {
  try {
    await execGit(["merge", "--no-ff", "--no-edit", branch], { cwd });
  } catch (err) {
    // Check if we're in a conflicted state
    try {
      const { stdout } = await execGit(["status", "--porcelain"], { cwd });
      const conflicted = stdout
        .split("\n")
        .filter((l) => l.startsWith("UU") || l.startsWith("AA") || l.startsWith("DD") || l.startsWith("AU") || l.startsWith("UA"))
        .map((l) => l.slice(3).trim());

      if (conflicted.length > 0) {
        try { await execGit(["merge", "--abort"], { cwd }); } catch { /* best-effort */ }
        return { ok: false, reason: "conflict", files: conflicted };
      }
    } catch { /* ignore nested error; fall through to unknown */ }

    return { ok: false, reason: "unknown", error: String(err) };
  }

  const { stdout: sha } = await execGit(["rev-parse", "HEAD"], { cwd });
  return { ok: true, mergeSha: sha.trim() };
}

export type RunTestsOptions = {
  cmd?: string;
  args?: string[];
};

export type RunTestsSuccess = { ok: true };
export type RunTestsFailure = { ok: false; output: string };
export type RunTestsResult = RunTestsSuccess | RunTestsFailure;

export async function runTests(cwd: string, opts: RunTestsOptions = {}): Promise<RunTestsResult> {
  const cmd = opts.cmd ?? "npm";
  const args = opts.args ?? ["test"];
  try {
    await execFileAsync(cmd, args, { cwd, timeout: 600_000, maxBuffer: 20 * 1024 * 1024 });
    return { ok: true };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; message?: string };
    const output = [e.stderr, e.stdout, e.message].filter(Boolean).join("\n").trim();
    return { ok: false, output };
  }
}
