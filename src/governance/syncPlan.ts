import type { GovernanceState, IssueState } from "./projection";
import type { SyncState } from "./syncState";

export type TransitionConfig = {
  storyPointsField: string;
  transitions: { inProgress: string; paused: string; done: string };
};

/**
 * Resolve a config relevante ao plano de sync a partir do ambiente.
 * NÃO checa credenciais (preview funciona offline) — `resolveJiraConfig`
 * é quem exige BASE_URL/EMAIL/TOKEN, e só o caminho `--yes` precisa delas.
 */
export function resolveTransitionConfig(env: NodeJS.ProcessEnv = process.env): TransitionConfig {
  return {
    storyPointsField: env.JIRA_STORY_POINTS_FIELD ?? env.JIRA_STORY_POINTS_CUSTOM_FIELD ?? "customfield_10016",
    transitions: {
      inProgress: env.JIRA_TRANSITION_IN_PROGRESS ?? "In Progress",
      paused: env.JIRA_TRANSITION_PAUSED ?? "Paused",
      done: env.JIRA_TRANSITION_DONE ?? "Done"
    }
  };
}

export type SyncAction = {
  external_id: string;
  jira_key: string;
  transition: { name: string; comment: string | null } | null;
  set_story_points: number | null;
  log_worklog_minutes: number;
  new_commits: string[];
  all_commits: string[];
  comment: boolean;
  last_event_id: string;
  status: IssueState["status"];
  worklog_total_minutes: number;
};

export type SyncPlan = {
  actions: SyncAction[];
  unmapped: string[];
  skipped: number;
};

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Diff puro entre a projeção e o rastro de sincronização. Sem Jira, sem I/O.
 * Projeta: transição de status do workflow real; SP na conclusão; worklog
 * incremental (delta); commits novos para o comentário de progresso.
 */
export function computeSyncPlan(
  state: GovernanceState,
  syncState: SyncState,
  config: TransitionConfig
): SyncPlan {
  const actions: SyncAction[] = [];
  const unmapped: string[] = [];
  let skipped = 0;

  for (const [externalId, issue] of Object.entries(state.issues)) {
    if (issue.jira_key === null) {
      unmapped.push(externalId);
      continue;
    }

    const synced = syncState.issues[externalId];
    if (synced && synced.synced_event_id === issue.last_event_id) {
      skipped++;
      continue;
    }

    const syncedStatus = synced?.synced_status ?? "created";

    // A governança dirige in_progress/paused/completed (não o status inicial
    // "created"/"Tarefas pendentes", nem os de processo humano).
    let transition: { name: string; comment: string | null } | null = null;
    if (issue.status !== syncedStatus && issue.status !== "created") {
      if (issue.status === "in_progress") {
        transition = { name: config.transitions.inProgress, comment: null };
      } else if (issue.status === "paused") {
        transition = {
          name: config.transitions.paused,
          comment: issue.pause_reason ?? "Pausada via governança matilha."
        };
      } else if (issue.status === "completed") {
        transition = { name: config.transitions.done, comment: null };
      }
    }

    const completingNow = issue.status === "completed" && syncedStatus !== "completed";
    const setStoryPoints = completingNow ? issue.story_points : null;

    const syncedWorklog = synced?.synced_worklog_minutes ?? 0;
    const worklogDelta = round1(Math.max(0, issue.worklog_active_minutes - syncedWorklog));

    const syncedCommits = synced?.synced_commits ?? [];
    const newCommits = issue.commits.filter((c) => !syncedCommits.includes(c));

    const comment = completingNow || newCommits.length > 0;

    if (!transition && setStoryPoints === null && worklogDelta === 0 && !comment) {
      skipped++;
      continue;
    }

    actions.push({
      external_id: externalId,
      jira_key: issue.jira_key,
      transition,
      set_story_points: setStoryPoints,
      log_worklog_minutes: worklogDelta,
      new_commits: newCommits,
      all_commits: issue.commits,
      comment,
      last_event_id: issue.last_event_id,
      status: issue.status,
      worklog_total_minutes: issue.worklog_active_minutes
    });
  }

  return { actions, unmapped, skipped };
}
