import { MatilhaUserError } from "../ui/errorFormat";

export const DEFAULT_ISSUE_KEY_PATTERN = "[A-Z][A-Z0-9]+-\\d+";

export function resolveIssueKeyPattern(env: NodeJS.ProcessEnv = process.env): string {
  return env.MATILHA_ISSUE_KEY_PATTERN || DEFAULT_ISSUE_KEY_PATTERN;
}

export function extractIssueKeys(
  message: string,
  pattern: string = DEFAULT_ISSUE_KEY_PATTERN
): string[] {
  let regex: RegExp;
  try {
    regex = new RegExp(pattern, "g");
  } catch (err) {
    throw new MatilhaUserError({
      summary: "invalid issue-key pattern",
      context: "matilha was compiling the issue-key regex (MATILHA_ISSUE_KEY_PATTERN)",
      problem: err instanceof Error ? err.message : String(err),
      nextActions: ["set MATILHA_ISSUE_KEY_PATTERN to a valid JavaScript regular expression"]
    });
  }

  const found: string[] = [];
  for (const match of message.matchAll(regex)) {
    const key = match[0];
    if (!found.includes(key)) found.push(key);
  }
  return found;
}
