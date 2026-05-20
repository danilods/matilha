import { MatilhaUserError } from "../ui/errorFormat";

export type JiraConfig = {
  baseUrl: string;
  email: string;
  apiToken: string;
  projectKey: string;
  storyPointsField: string;
  transitions: { inProgress: string; done: string };
};

export type JiraConfigOverrides = {
  projectKey?: string;
};

export function resolveJiraConfig(
  env: NodeJS.ProcessEnv = process.env,
  overrides: JiraConfigOverrides = {}
): JiraConfig {
  const config = {
    baseUrl: (env.JIRA_BASE_URL ?? "").replace(/\/+$/, ""),
    email: env.JIRA_EMAIL ?? "",
    apiToken: env.JIRA_API_TOKEN ?? "",
    projectKey: overrides.projectKey ?? env.JIRA_PROJECT_KEY ?? "",
    storyPointsField: env.JIRA_STORY_POINTS_FIELD ?? env.JIRA_STORY_POINTS_CUSTOM_FIELD ?? "customfield_10016",
    transitions: {
      inProgress: env.JIRA_TRANSITION_IN_PROGRESS ?? "In Progress",
      done: env.JIRA_TRANSITION_DONE ?? "Done"
    }
  };

  const missing = [
    ["JIRA_BASE_URL", config.baseUrl],
    ["JIRA_EMAIL", config.email],
    ["JIRA_API_TOKEN", config.apiToken],
    ["JIRA_PROJECT_KEY", config.projectKey]
  ].filter(([, value]) => !value).map(([name]) => name);

  if (missing.length > 0) {
    throw new MatilhaUserError({
      summary: "Jira configuration is missing",
      context: "matilha jira needs Jira credentials before calling the Jira Cloud API",
      problem: `missing env var(s): ${missing.join(", ")}`,
      nextActions: [
        "set JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN, and JIRA_PROJECT_KEY",
        "optionally set JIRA_STORY_POINTS_FIELD if your Jira uses a custom story point field",
        "use --dry-run to inspect the payload without credentials"
      ]
    });
  }

  return config;
}
