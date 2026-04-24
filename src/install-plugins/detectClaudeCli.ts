import { existsSync, statSync } from "node:fs";
import { join, delimiter } from "node:path";
import { platform } from "node:os";

export type ClaudeCliDetection = {
  available: boolean;
  path: string | null;
};

/**
 * Detects whether the `claude` CLI (Claude Code) is available on PATH.
 *
 * Implementation: scans every directory in process.env.PATH for a `claude`
 * executable. No shell invocation — avoids injection surface and doesn't
 * depend on POSIX-specific shell builtins like `command -v`.
 *
 * Used by --deep install mode to decide between shelling out to
 * `claude plugin install` vs. falling back to paste-block emission.
 */
export function detectClaudeCli(): ClaudeCliDetection {
  const isWindows = platform() === "win32";
  const binaryCandidates = isWindows
    ? ["claude.exe", "claude.cmd", "claude.bat"]
    : ["claude"];

  const pathDirs = (process.env.PATH ?? "").split(delimiter).filter(Boolean);

  for (const dir of pathDirs) {
    for (const candidate of binaryCandidates) {
      const full = join(dir, candidate);
      try {
        if (existsSync(full) && statSync(full).isFile()) {
          return { available: true, path: full };
        }
      } catch {
        // Permission denied or transient filesystem error; skip this entry.
        continue;
      }
    }
  }

  return { available: false, path: null };
}
