import { readFileSync } from "node:fs";
import { extractIssueKeys, resolveIssueKeyPattern } from "./issueKey";
import { execGit } from "../hunt/execGit";
import { makeGovernanceEvent, resolveActor, looksLikeIssueKey } from "./events";
import { appendEvent, readLedger } from "./ledger";
import { buildProjection, writeState } from "./projection";

export type CommitMsgResult = {
  keys: string[];
  warned: boolean;
};

export function runCommitMsg(
  messageFilePath: string,
  env: NodeJS.ProcessEnv = process.env
): CommitMsgResult {
  const message = readFileSync(messageFilePath, "utf-8");
  const keys = extractIssueKeys(message, resolveIssueKeyPattern(env));

  if (keys.length === 0) {
    console.error(
      "matilha: no issue key found in the commit message — no governance event will be recorded for this commit."
    );
    return { keys, warned: true };
  }
  return { keys, warned: false };
}

export type PostCommitResult = {
  sha: string;
  keys: string[];
  emitted: string[];
};

/**
 * Reads the HEAD commit and emits a task.progress governance event per issue
 * key found in its message — a commit is progress, not completion (completion
 * is the explicit `matilha task done`). Precondition: the repo has at least
 * one commit — always true when invoked from the installed post-commit hook.
 */
export async function runPostCommit(
  cwd: string,
  env: NodeJS.ProcessEnv = process.env
): Promise<PostCommitResult> {
  const sha = (await execGit(["log", "-1", "--format=%H"], { cwd })).stdout.trim();
  const message = (await execGit(["log", "-1", "--format=%B"], { cwd })).stdout;
  const keys = extractIssueKeys(message, resolveIssueKeyPattern(env));
  const actor = resolveActor(env);
  const summary = message.split("\n")[0]?.trim() || sha;
  const emitted: string[] = [];

  for (const key of keys) {
    const event = makeGovernanceEvent({
      type: "task.progress",
      external_id: key,
      issue_key: looksLikeIssueKey(key) ? key : null,
      actor,
      event_id: `post-commit:${sha}:${key}`,
      payload: { commits: [sha], summary_markdown: summary }
    });
    const result = appendEvent(cwd, event);
    if (result.status === "written") emitted.push(key);
  }

  if (keys.length > 0) {
    writeState(cwd, buildProjection(readLedger(cwd)));
  }
  return { sha, keys, emitted };
}
