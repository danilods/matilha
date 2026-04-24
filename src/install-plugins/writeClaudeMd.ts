import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CLAUDE_MD_SNIPPET } from "./claudeMdSnippet";

/**
 * Regex matching any version of the matilha-managed block in CLAUDE.md.
 * Non-greedy middle so multiple blocks never collapse into one.
 * Spans newlines via [\s\S] since JS has no `s` flag in legacy targets.
 */
const MATILHA_BLOCK_REGEX = /<!-- matilha-start v\d+ -->[\s\S]*?<!-- matilha-end v\d+ -->/;

export type ClaudeMdAction = "created" | "appended" | "replaced";

export type WriteClaudeMdResult = {
  action: ClaudeMdAction;
  path: string;
};

export type WriteClaudeMdOptions = {
  /** Directory in which to apply the merge-or-create contract. */
  cwd: string;
  /** Snippet content to use. Defaults to the canonical CLAUDE_MD_SNIPPET. */
  snippet?: string;
};

/**
 * Applies the Wave 5g SP-B merge-or-create contract to a project's CLAUDE.md.
 *
 * Three cases:
 *  1. File absent          → create with snippet as full content.
 *  2. File present, no marker → append snippet at end, preserving all existing content.
 *  3. File present, marker exists → replace everything between markers (idempotent).
 *
 * Trailing newline normalization: output files always end with a single "\n".
 * Existing content outside markers is preserved exactly in case 3.
 */
export function writeClaudeMd(opts: WriteClaudeMdOptions): WriteClaudeMdResult {
  const path = join(opts.cwd, "CLAUDE.md");
  const snippet = (opts.snippet ?? CLAUDE_MD_SNIPPET).trimEnd();

  if (!existsSync(path)) {
    writeFileSync(path, `${snippet}\n`, "utf8");
    return { action: "created", path };
  }

  const existing = readFileSync(path, "utf8");

  if (MATILHA_BLOCK_REGEX.test(existing)) {
    const updated = existing.replace(MATILHA_BLOCK_REGEX, snippet);
    writeFileSync(path, ensureTrailingNewline(updated), "utf8");
    return { action: "replaced", path };
  }

  const base = existing.endsWith("\n") ? existing : `${existing}\n`;
  const separator = base.endsWith("\n\n") ? "" : "\n";
  writeFileSync(path, `${base}${separator}${snippet}\n`, "utf8");
  return { action: "appended", path };
}

function ensureTrailingNewline(s: string): string {
  return s.endsWith("\n") ? s : `${s}\n`;
}
