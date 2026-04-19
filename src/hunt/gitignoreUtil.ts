import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export type GitignoreAction = "created" | "appended" | "noop";

export type GitignoreResult = {
  action: GitignoreAction;
  path: string;
};

export function ensureGitignoreEntry(repoCwd: string, entry: string): GitignoreResult {
  const path = join(repoCwd, ".gitignore");
  if (!existsSync(path)) {
    writeFileSync(path, `${entry}\n`, "utf-8");
    return { action: "created", path };
  }
  const content = readFileSync(path, "utf-8");
  const lines = content.split("\n");
  if (lines.some((l) => l.trim() === entry)) {
    return { action: "noop", path };
  }
  const newContent = content.endsWith("\n") ? `${content}${entry}\n` : `${content}\n${entry}\n`;
  writeFileSync(path, newContent, "utf-8");
  return { action: "appended", path };
}
