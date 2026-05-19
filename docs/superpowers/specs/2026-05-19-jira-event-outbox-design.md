# Jira Event Outbox Design

## Intent

Matilha needs a completion hook that can update Jira after each finished task
without coupling the core merge workflow to a remote SaaS API. The hook must be
durable, auditable, optional, retryable, and safe for batches where a spec/plan
generates tens or hundreds of tasks.

## Recommended Architecture

Use a local Event Outbox plus an optional Jira adapter.

Matilha core emits generic events when it has strong local evidence that a task
is complete. Jira consumes those events later through an explicit sync command.
The merge path stays deterministic even when Jira credentials are missing,
Atlassian rate limits a request, or the user does not want Jira for a project.

## Completion Source

The first completion source is `matilha merge`.

An SP is eligible for a `task.completed` event only after:

1. `SP-DONE.md` exists.
2. The SP-DONE frontmatter passes strict validation.
3. The SP branch merges into the integration branch.
4. Regression tests pass.
5. `wave-status.md` marks that SP as completed.

Failed merges, failed tests, dry runs, and already-completed no-op merges must
not create new completion events.

## Event Contract

Events are generic Matilha events, not Jira payloads.

```json
{
  "schema_version": 1,
  "event": "task.completed",
  "id": "task.completed:feat-auth:SP1:2026-05-19T03-00-00-000Z",
  "created_at": "2026-05-19T03:00:00.000Z",
  "external_id": "feat-auth-SP1",
  "source": {
    "feature": "feat-auth",
    "wave": "w1",
    "sp": "SP1",
    "spec": "docs/matilha/specs/feat-auth-spec.md",
    "plan": "docs/matilha/plans/feat-auth-plan.md"
  },
  "result": {
    "status": "completed",
    "story_points": 0.25,
    "worklog": "15m",
    "comment_markdown": "Merged, tested, and cleaned by Matilha.",
    "evidence": ["SP-DONE.md", "regression passed"]
  }
}
```

`external_id` is the bridge to Jira, Linear, GitHub Issues, or another work
tracker. For Matilha-generated tasks, use the same stable id created in
`docs/matilha/jira/tasks.json`.

## Storage

Pending events are written to:

```text
docs/matilha/events/outbox/*.json
```

Successfully synced events are moved to:

```text
docs/matilha/events/processed/*.json
```

Failed events remain in the outbox and can be retried. Sync commands should
report the failure and leave the original event intact.

## Jira Issue Map

Jira sync resolves Matilha `external_id` to Jira issue keys using:

```text
docs/matilha/jira/issues.map.json
```

Shape:

```json
{
  "schema_version": 1,
  "issues": {
    "feat-auth-SP1": {
      "jira_key": "MAT-123",
      "created_at": "2026-05-19T03:00:00.000Z",
      "last_synced_at": "2026-05-19T03:15:00.000Z"
    }
  }
}
```

`matilha jira apply` should write/update this map when it creates issues.
`matilha jira sync` should refuse events whose `external_id` is missing from the
map, unless a future resolver is added.

## Jira Sync

Add:

```bash
matilha jira sync --preview
matilha jira sync --yes
```

`--preview` prints the event count, event ids, external ids, Jira keys, and
planned mutations. It never calls Jira.

`--yes` calls Jira and may:

- Add a completion comment.
- Add a worklog.
- Update story points if present.
- Update Matilha issue properties with last synced event metadata.

The command must keep the explicit approval contract already used by
`matilha jira apply`. No hidden remote mutation should happen by default.

## Merge Integration

Emit local completion events by default. The hook is local and durable, so it
does not violate the "Jira is optional" rule. Remote Jira mutation remains
explicit through `matilha jira sync`.

```bash
matilha merge <featureSlug>
```

When the merge succeeds, Matilha emits one `task.completed` event per newly
merged SP.

Use this only when a project intentionally wants to skip local completion
records:

```bash
matilha merge <featureSlug> --no-events
```

## Failure Rules

- If event emission fails, `matilha merge` should fail because local audit data
  is part of the harness contract.
- If Jira sync fails, leave the event in the outbox.
- If an event is already processed, do not process it again.
- If `external_id` has no Jira issue mapping, report it as pending/unmapped.
- If `--preview` is used, do not mutate local files or Jira.

## Test Strategy

Cover:

- `matilha merge --emit-events` writes one event per newly completed SP.
- `matilha merge --dry-run --emit-events` writes no event.
- rerunning merge after a completed wave does not duplicate events.
- `jira apply` writes `issues.map.json`.
- `jira sync --preview` shows planned updates without calling Jira.
- `jira sync --yes` adds comments/worklogs, updates fields/properties, and moves
  synced events to `processed`.
- missing issue mappings leave events pending.

## Out Of Scope

- Full Jira status transitions.
- Auto-discovery of Jira keys by JQL/property search.
- Non-Jira adapters.
- Background daemon mode.
