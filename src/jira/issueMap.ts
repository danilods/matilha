import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { z } from "zod";
import { MatilhaUserError } from "../ui/errorFormat";

const jiraIssueMapSchema = z.object({
  schema_version: z.literal(1),
  issues: z.record(z.string().min(1), z.object({
    jira_key: z.string().min(1),
    created_at: z.string().min(1),
    last_synced_at: z.string().min(1).optional()
  })).default({})
});

export type JiraIssueMap = z.infer<typeof jiraIssueMapSchema>;

export function jiraIssueMapPath(cwd: string): string {
  return join(cwd, "docs", "matilha", "jira", "issues.map.json");
}

export function readJiraIssueMap(cwd: string): JiraIssueMap {
  const path = jiraIssueMapPath(cwd);
  if (!existsSync(path)) {
    return { schema_version: 1, issues: {} };
  }

  const raw = readFileSync(path, "utf-8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new MatilhaUserError({
      summary: "invalid Jira issue map JSON",
      context: `matilha jira was reading ${path}`,
      problem: err instanceof Error ? err.message : String(err),
      nextActions: ["fix docs/matilha/jira/issues.map.json, then rerun the command"]
    });
  }

  const result = jiraIssueMapSchema.safeParse(parsed);
  if (!result.success) {
    throw new MatilhaUserError({
      summary: "invalid Jira issue map",
      context: `matilha jira was validating ${path}`,
      problem: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      nextActions: ["regenerate the map with 'matilha jira apply <file> --yes' or fix the JSON manually"]
    });
  }
  return result.data;
}

export function writeJiraIssueMap(cwd: string, map: JiraIssueMap): void {
  const path = jiraIssueMapPath(cwd);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(map, null, 2)}\n`, "utf-8");
}

export function recordCreatedJiraIssue(
  cwd: string,
  externalId: string,
  jiraKey: string,
  createdAt = new Date().toISOString()
): void {
  const map = readJiraIssueMap(cwd);
  map.issues[externalId] = {
    ...(map.issues[externalId] ?? {}),
    jira_key: jiraKey,
    created_at: map.issues[externalId]?.created_at ?? createdAt
  };
  writeJiraIssueMap(cwd, map);
}

export function markJiraIssueSynced(
  map: JiraIssueMap,
  externalId: string,
  syncedAt = new Date().toISOString()
): JiraIssueMap {
  const entry = map.issues[externalId];
  if (!entry) return map;
  return {
    ...map,
    issues: {
      ...map.issues,
      [externalId]: {
        ...entry,
        last_synced_at: syncedAt
      }
    }
  };
}
