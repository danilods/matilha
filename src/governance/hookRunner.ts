import { readFileSync } from "node:fs";
import { extractIssueKeys, resolveIssueKeyPattern } from "./issueKey";

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
