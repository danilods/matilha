import pc from "picocolors";
import { installGovernanceHooks } from "./hookInstaller";
import { runCommitMsg, runPostCommit } from "./hookRunner";

export async function hooksInstallCommand(cwd: string): Promise<void> {
  const results = await installGovernanceHooks(cwd);
  console.log(pc.green("matilha governance git hooks installed"));
  for (const result of results) {
    console.log(pc.dim(`  ${result.hook}: ${result.action} (${result.path})`));
  }
}

/** Invoked by the installed git hook. Never throws — errors are logged to stderr. */
export function hooksRunCommitMsgCommand(messageFile: string): void {
  try {
    runCommitMsg(messageFile);
  } catch (err) {
    console.error(`matilha commit-msg hook: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/** Invoked by the installed git hook. Never throws — errors are logged to stderr. */
export async function hooksRunPostCommitCommand(cwd: string): Promise<void> {
  try {
    const result = await runPostCommit(cwd);
    if (result.emitted.length > 0) {
      console.log(pc.dim(`matilha: recorded task.completed for ${result.emitted.join(", ")}`));
    }
  } catch (err) {
    console.error(`matilha post-commit hook: ${err instanceof Error ? err.message : String(err)}`);
  }
}
