import pc from "picocolors";
import { looksLikeIssueKey, makeGovernanceEvent, resolveActor } from "./events";
import { appendEvent, readLedger } from "./ledger";
import { buildProjection, writeState } from "./projection";
import { readJiraTaskContract } from "../jira/contract";

export type ContractSeedResult = {
  total: number;
  seeded: number;
  skipped: number;
};

export function seedTaskCreatedEvents(
  cwd: string,
  contractPath: string,
  env: NodeJS.ProcessEnv = process.env
): ContractSeedResult {
  const contract = readJiraTaskContract(contractPath);
  const actor = resolveActor(env);
  let seeded = 0;
  let skipped = 0;

  for (const task of contract.tasks) {
    const payload: Record<string, unknown> = {};
    if (task.summary) payload.summary = task.summary;
    if (task.story_points !== undefined) payload.story_points = task.story_points;
    if (task.category !== undefined) payload.category = task.category;
    if (task.issue_kind !== undefined) payload.issue_kind = task.issue_kind;

    const event = makeGovernanceEvent({
      type: "task.created",
      external_id: task.external_id,
      issue_key: looksLikeIssueKey(task.external_id) ? task.external_id : null,
      actor,
      event_id: `contract-seed:${task.external_id}`,
      payload
    });
    const result = appendEvent(cwd, event);
    if (result.status === "written") seeded++;
    else skipped++;
  }

  if (seeded > 0) {
    writeState(cwd, buildProjection(readLedger(cwd)));
  }
  return { total: contract.tasks.length, seeded, skipped };
}

export function importContractCommand(cwd: string, contractPath: string): void {
  const result = seedTaskCreatedEvents(cwd, contractPath);
  console.log(
    pc.green(
      `contract imported: ${result.seeded} task.created event(s) seeded, ${result.skipped} already present (${result.total} total)`
    )
  );
}
