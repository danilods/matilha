import { spawn } from "node:child_process";
import { confirm, isCancel, note } from "@clack/prompts";
import { detectCompanion } from "./detectCompanions";
import { TOOLS } from "../config";
import type { Companion } from "../domain/companionSchema";
import type { Tool } from "./detectTools";

export type InstallOutcome = "installed" | "already-installed" | "skipped" | "manual-tutorial";

/**
 * Run a shell command. Resolves on exit code 0, rejects otherwise.
 * Inherits stdio so the user sees live output.
 */
function runShell(command: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, { shell: true, stdio: "inherit" });
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Command failed with exit code ${code}: ${command}`));
    });
    child.on("error", reject);
  });
}

/**
 * Pick an install command for the companion.
 * Preference: universal > first matching detected tool.
 */
function pickInstallCommand(companion: Companion, detected: readonly Tool[]): string | undefined {
  const install = companion.install as Record<string, string | undefined>;
  if (install.universal) return install.universal;
  for (const tool of TOOLS) {
    if (detected.includes(tool) && install[tool]) {
      return install[tool];
    }
  }
  return undefined;
}

function printTutorial(companion: Companion): void {
  note(companion.tutorial.body, companion.tutorial.title);
}

export async function installCompanions(
  companions: Companion[],
  detected: readonly Tool[],
  interactive: boolean,
  dryRun: boolean
): Promise<Map<string, InstallOutcome>> {
  const outcomes = new Map<string, InstallOutcome>();

  for (const companion of companions) {
    const status = detectCompanion(companion, detected);
    if (status.installed) {
      outcomes.set(companion.slug, "already-installed");
      continue;
    }

    let userSaysYes = true;
    // Only prompt when interactive AND running in a real TTY (avoids hangs in CI/tests)
    if (interactive && process.stdout.isTTY) {
      const answer = await confirm({
        message: `Install ${companion.name}?`,
        initialValue: true
      });
      if (isCancel(answer) || !answer) {
        userSaysYes = false;
      }
    }

    if (!userSaysYes) {
      outcomes.set(companion.slug, "skipped");
      continue;
    }

    const command = pickInstallCommand(companion, detected);
    if (!command) {
      printTutorial(companion);
      outcomes.set(companion.slug, "manual-tutorial");
      continue;
    }

    if (dryRun) {
      outcomes.set(companion.slug, "skipped");
      continue;
    }

    try {
      await runShell(command);
      outcomes.set(companion.slug, "installed");
    } catch {
      printTutorial(companion);
      outcomes.set(companion.slug, "manual-tutorial");
    }
  }

  return outcomes;
}
