import pc from "picocolors";
import { MatilhaUserError } from "../ui/errorFormat";
import {
  looksLikeIssueKey,
  makeGovernanceEvent,
  resolveActor,
  type GovernanceEventType
} from "./events";
import { appendEvent, readLedger } from "./ledger";
import { buildProjection, writeState } from "./projection";

const ACTION_TO_TYPE: Record<string, GovernanceEventType> = {
  start: "task.started",
  pause: "task.paused",
  resume: "task.resumed",
  done: "task.completed"
};

export type TaskCommandOptions = {
  reason?: string;
  commit?: string[];
};

export function taskCommand(
  cwd: string,
  action: string,
  id: string,
  opts: TaskCommandOptions = {}
): void {
  const type = ACTION_TO_TYPE[action];
  if (!type) {
    throw new MatilhaUserError({
      summary: `unknown task action: ${action}`,
      context: "matilha task accepts start, pause, resume, or done",
      problem: `received action '${action}'`,
      nextActions: ["run 'matilha task start|pause|resume|done <id>'"]
    });
  }

  const payload: Record<string, unknown> = {};
  if (type === "task.paused" && opts.reason) payload.reason = opts.reason;
  if (type === "task.completed") payload.commits = opts.commit ?? [];

  const event = makeGovernanceEvent({
    type,
    external_id: id,
    issue_key: looksLikeIssueKey(id) ? id : null,
    actor: resolveActor(),
    payload
  });

  const appended = appendEvent(cwd, event);
  const state = buildProjection(readLedger(cwd));
  writeState(cwd, state);

  const issue = state.issues[id]!;
  console.log(pc.green(`${type} recorded for ${id} (${appended.status})`));
  console.log(
    pc.dim(`  status: ${issue.status} | active worklog: ${issue.worklog_active_minutes}m`)
  );
}
