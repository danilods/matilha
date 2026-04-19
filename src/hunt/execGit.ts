import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type ExecGitOptions = {
  cwd: string;
  timeoutMs?: number;
};

export type ExecGitResult = {
  stdout: string;
  stderr: string;
};

export async function execGit(args: string[], opts: ExecGitOptions): Promise<ExecGitResult> {
  try {
    const { stdout, stderr } = await execFileAsync("git", args, {
      cwd: opts.cwd,
      timeout: opts.timeoutMs ?? 30_000,
      maxBuffer: 10 * 1024 * 1024
    });
    return { stdout: String(stdout), stderr: String(stderr) };
  } catch (err) {
    const e = err as NodeJS.ErrnoException & { stdout?: string; stderr?: string };
    const msg = [e.stderr, e.stdout, e.message].filter(Boolean).join("\n").trim();
    throw new Error(`git ${args.join(" ")} failed: ${msg}`);
  }
}
