# Global Next Action Engine Design

## Intent

Matilha should feel like a guided harness, not a bag of commands. The user
should not need to remember which command comes next after every phase. The CLI
should read project state, classify risk, recommend the next best action, and
ask only when asking preserves control.

This applies to the entire workflow, not only Jira.

## Product Principle

Minimum CLI commands, maximum guided workflow.

Matilha exposes commands for scriptability and CI, but the interactive
experience should be state-led:

```text
current state -> recommended next action -> low-friction confirmation -> event log
```

## UX Principles

- Recognition over recall: show the next action instead of requiring command
  memory.
- Progressive disclosure: show one recommendation first, alternatives only when
  useful.
- Default effect: Enter should accept safe, likely, local actions.
- Human authority: remote, destructive, or irreversible operations never happen
  silently.
- Context as scarce resource: recommendations use durable state files, not a
  long prompt pasted into every control file.
- Error recovery: every mutating or remote path has a preview or confirmation.

## Architecture

Add a shared Workflow Intelligence Layer:

```text
command result
  -> state reader
  -> next action resolver
  -> risk classifier
  -> renderer
  -> optional executor
  -> event log
```

Initial implementation should focus on recommendation + rendering. Automatic
execution can be added later with stricter policy.

## Action Model

Each action has:

```ts
type NextAction = {
  id: string;
  label: string;
  command: string;
  reason: string;
  risk: "read" | "local_mutation" | "remote_mutation" | "destructive";
  default: boolean;
  requiresPreview?: boolean;
};
```

Risk policy:

- `read`: can be default.
- `local_mutation`: can be offered as default in interactive mode.
- `remote_mutation`: must use preview or explicit `--yes`.
- `destructive`: never default.

## Resolver Inputs

The resolver should read:

- `project-status.md`
- `docs/matilha/context.md`
- `docs/matilha/waves/wave-*-status.md`
- `docs/matilha/events/outbox/*.json`
- `docs/matilha/jira/issues.map.json`

It should not need model inference.

## Initial Recommendations

| State | Recommended action |
|---|---|
| no `project-status.md` | `matilha start` |
| current phase 0 | `matilha discover` |
| current phase >= 10 with no active feature | `matilha spec <slug>` |
| feature spec exists but gates pending | `matilha approve <gate>` |
| phase >= 30 and plan exists | `matilha split <slug>` |
| wave status pending/in_progress | `matilha merge <slug>` |
| pending events in outbox | `matilha jira sync --preview` |
| sync preview just ran | `matilha jira sync --yes` |
| wave merged and no pending events | `matilha approve phase-40-gate` |

## CLI Surface

Global flags:

```bash
--no-guide
--guide
--auto-next
```

Initial behavior:

- Interactive terminal: guide enabled by default.
- CI/non-TTY: guide disabled by default.
- `--no-guide`: suppress recommendation output.
- `--auto-next`: reserved for later local-safe automation.

## Renderer

Use a compact block:

```text
Next recommended step
  Sync pending Jira updates
  matilha jira sync --preview

Why: 2 pending task.completed events are waiting in the outbox.
Risk: remote preview only
```

If alternatives exist:

```text
Other useful steps: matilha status, matilha approve phase-40-gate
```

No long explanations by default. Use `--explain` later if needed.

## Event Log

Future command results should emit generic events:

- `project.started`
- `discovery.completed`
- `spec.created`
- `gate.approved`
- `wave.split`
- `task.completed`
- `wave.merged`
- `jira.synced`
- `context.refreshed`

The first implementation can rely on existing state and outbox events.

## Test Strategy

Cover:

- no project recommends `matilha start`.
- phase 0 recommends `matilha discover`.
- pending outbox events recommend `matilha jira sync --preview`.
- completed wave with no pending events recommends phase-40 approval.
- remote/destructive actions are not marked as safe defaults.
- `--no-guide` suppresses recommendation rendering.

## Out Of Scope

- Full automatic execution.
- LLM-generated recommendations.
- Prompt-driven state detection.
- GUI/TUI wizard.
