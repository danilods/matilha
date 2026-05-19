export const JIRA_SKILL_MD = `---
name: matilha-jira
description: Use when turning Matilha specs, plans, waves, or completed SPs into Jira tasks, comments, story points, or worklogs through a controlled JSON contract and explicit user approval.
---

# Matilha Jira

Use this skill when the user wants Jira sprint/task automation.

The goal is not "write a Jira ticket". The goal is to turn accepted Matilha
specs, plans, waves, and completed SPs into a controlled list of generic work
items that can be validated, previewed, approved, and then sent to Jira.

## Rules

- Never call Jira directly from the agent.
- Produce or update a JSON contract first.
- Validate with \`matilha jira validate <file>\`.
- Preview with \`matilha jira preview <file>\`.
- Only apply after user approval with \`matilha jira apply <file> --yes\`.
- Sync completion events only after previewing with \`matilha jira sync --preview\`.
- Keep Jira optional; do not block Matilha workflows when Jira is not configured.
- If a spec/plan implies 100 tasks, create all 100 tasks in \`tasks[]\`.
- Do not use ellipsis, prose-only summaries, or "and so on" in the real JSON.
- Keep each task independently executable, reviewable, and traceable to its source.

## Contract

Create \`docs/matilha/jira/tasks.json\` using schema_version 1.

Required per task:
- \`external_id\`: stable id, usually \`<feature-slug>-SP<N>\`
- \`summary\`
- \`description_markdown\`

Optional:
- \`issue_type\`
- \`story_points\`
- \`labels\`
- \`comments[].body_markdown\`
- \`worklogs[].time_spent\`
- \`source.spec\`, \`source.plan\`, \`source.sp\`, \`source.phase\`

## Generate tasks from specs and plans

1. Read \`project-status.md\` and the relevant spec/plan/wave.
2. Extract work items from SPs, acceptance criteria, implementation steps, risk notes, test obligations, and rollout/cleanup items.
3. Create one task for each independently trackable unit of work.
4. Use stable \`external_id\` values, usually \`<feature-slug>-SP<N>\` or \`<feature-slug>-T<N>\`.
5. Write concise summaries and descriptions that are useful outside Jira too.
6. Include \`source.spec\`, \`source.plan\`, \`source.sp\`, and \`source.phase\` whenever known.

## Workflow

1. Draft \`docs/matilha/jira/tasks.json\`.
2. Run \`matilha jira validate docs/matilha/jira/tasks.json\`.
3. Run \`matilha jira preview docs/matilha/jira/tasks.json\`.
4. Ask the user to approve the preview.
5. Apply only when explicitly approved:
   \`matilha jira apply docs/matilha/jira/tasks.json --yes\`.
6. After \`matilha merge\` emits completion events, review and sync:
   \`matilha jira sync --preview\`
   \`matilha jira sync --yes\`.

See \`docs/matilha/jira/tutorial.md\` for examples, including 100 tasks from a large spec/plan.
`;

export const JIRA_TASKS_EXAMPLE_JSON = `{
  "schema_version": 1,
  "project_key": "MAT",
  "defaults": {
    "issue_type": "Task",
    "labels": ["matilha", "ai-assisted"],
    "story_points_field": "customfield_10016"
  },
  "tasks": [
    {
      "external_id": "feat-auth-SP1",
      "summary": "Implement login flow",
      "description_markdown": "Build login, logout, and session validation.",
      "story_points": 0.5,
      "source": {
        "spec": "docs/matilha/specs/feat-auth-spec.md",
        "plan": "docs/matilha/plans/feat-auth-plan.md",
        "sp": "SP1",
        "phase": 40
      },
      "comments": [
        {
          "body_markdown": "Created from a Matilha controlled task contract."
        }
      ],
      "worklogs": [
        {
          "time_spent": "30m",
          "comment_markdown": "AI-assisted implementation time."
        }
      ]
    }
  ]
}
`;

export const JIRA_TUTORIAL_MD = `# Matilha Jira Pack Tutorial

This pack turns Matilha specs and plans into controlled task contracts. Jira is
only the first executor. The JSON contract is a generic work item format that
can later be mapped to Jira, Linear, GitHub Issues, Azure Boards, or another
tracking tool.

## Mental Model

Matilha does the thinking before the API call:

1. Read the current context: \`project-status.md\`.
2. Read the accepted spec, plan, waves, SPs, and review notes.
3. Derive every trackable unit of work.
4. Write \`docs/matilha/jira/tasks.json\`.
5. Validate and preview the contract.
6. Ask for approval.
7. Apply the full batch.
8. Let \`matilha merge\` emit \`task.completed\` events as SPs finish.
9. Preview and sync those events back to Jira.

The agent should never call Jira directly. The contract is the control point.
For completion updates, the Event Outbox is the control point.

## First Setup

Run this once in the project:

~~~bash
matilha jira init
~~~

This creates:

~~~text
.agents/skills/matilha-jira/SKILL.md
docs/matilha/jira/tasks.example.json
docs/matilha/jira/tutorial.md
~~~

For real Jira calls, set:

~~~bash
export JIRA_BASE_URL="https://your-domain.atlassian.net"
export JIRA_EMAIL="you@example.com"
export JIRA_API_TOKEN="..."
export JIRA_PROJECT_KEY="MAT"
export JIRA_STORY_POINTS_FIELD="customfield_10016"
~~~

## One Task Example

Create \`docs/matilha/jira/tasks.json\`:

~~~json
{
  "schema_version": 1,
  "project_key": "MAT",
  "defaults": {
    "issue_type": "Task",
    "labels": ["matilha", "ai-assisted"],
    "story_points_field": "customfield_10016"
  },
  "tasks": [
    {
      "external_id": "feat-auth-SP1",
      "summary": "Implement login flow",
      "description_markdown": "Build login, logout, and session validation.",
      "story_points": 0.5,
      "source": {
        "spec": "docs/matilha/specs/feat-auth-spec.md",
        "plan": "docs/matilha/plans/feat-auth-plan.md",
        "sp": "SP1",
        "phase": 40
      }
    }
  ]
}
~~~

Then run:

~~~bash
matilha jira validate docs/matilha/jira/tasks.json
matilha jira preview docs/matilha/jira/tasks.json
matilha jira apply docs/matilha/jira/tasks.json --yes
~~~

\`apply\` is refused unless \`--yes\` is present.

## Completion Hook

When \`matilha merge <feature>\` successfully merges an SP, passes regression,
and marks the SP as completed, Matilha writes a local event:

~~~text
docs/matilha/events/outbox/*.json
~~~

This event is not a Jira API call. It is a durable local audit record. Jira sync
is optional and explicit:

~~~bash
matilha jira sync --preview
matilha jira sync --yes
~~~

\`sync --preview\` shows pending events, external ids, and mapped Jira keys.
\`sync --yes\` updates Jira comments, worklogs, story points, and Matilha issue
properties, then moves synced events to:

~~~text
docs/matilha/events/processed/
~~~

To enrich the completion event, the SP can add optional tracking metadata to
\`SP-DONE.md\` frontmatter:

~~~yaml
tracking:
  story_points: 0.25
  worklog: "15m"
  comment_markdown: "Implemented, tested, and merged by Matilha."
  observations:
    - "No migration rollback needed."
~~~

## From Spec/Plan To 100 Tasks

When a Matilha spec or plan expands into 100 tasks, the agent should write all
100 objects inside \`tasks[]\`. Do not create a summarized placeholder. Do not
write \`...\`. The real JSON must contain every item because \`matilha jira apply\`
iterates through the full array and creates each issue.

Use this prompt inside your agent session:

~~~text
Read project-status.md plus the accepted spec and plan for <feature>.
Create docs/matilha/jira/tasks.json using schema_version 1.
Generate one generic work item per independently executable task.
If the plan contains 100 tasks, include all 100 tasks in tasks[].
Use stable external_id values, concise summaries, rich description_markdown,
story_points, labels, and source.spec/source.plan/source.sp/source.phase.
Then run matilha jira validate and matilha jira preview.
Do not apply until I approve the preview.
~~~

For a large contract, use a stable id sequence:

~~~json
{
  "schema_version": 1,
  "project_key": "MAT",
  "defaults": {
    "issue_type": "Task",
    "labels": ["matilha", "sprint-import"],
    "story_points_field": "customfield_10016"
  },
  "tasks": [
    {
      "external_id": "checkout-rebuild-SP1",
      "summary": "Model checkout session states",
      "description_markdown": "Define the state model and transition rules from the approved checkout spec.",
      "story_points": 0.5,
      "source": {
        "spec": "docs/matilha/specs/checkout-rebuild-spec.md",
        "plan": "docs/matilha/plans/checkout-rebuild-plan.md",
        "sp": "SP1",
        "phase": 40
      }
    },
    {
      "external_id": "checkout-rebuild-SP2",
      "summary": "Implement checkout session persistence",
      "description_markdown": "Persist checkout sessions with idempotent writes and recovery-safe reads.",
      "story_points": 0.5,
      "source": {
        "spec": "docs/matilha/specs/checkout-rebuild-spec.md",
        "plan": "docs/matilha/plans/checkout-rebuild-plan.md",
        "sp": "SP2",
        "phase": 40
      }
    }
  ]
}
~~~

The snippet above is shortened for documentation. The actual
\`docs/matilha/jira/tasks.json\` must include every task object from SP1 through
SP100 when the plan has 100 tasks.

## What Makes A Good Task

Each task should have:

- A stable \`external_id\` that will not change between previews.
- A summary that names the outcome, not just the activity.
- A description with enough implementation context for a human or agent.
- A small \`story_points\` value that reflects AI-assisted execution effort.
- Source references back to the Matilha spec/plan/SP.
- Optional comments or worklogs only when they add audit value.

## Generic Portability

The contract intentionally avoids Jira-only concepts as much as possible:

- \`external_id\` maps to issue properties, labels, or custom fields.
- \`summary\` maps to title.
- \`description_markdown\` maps to description/body.
- \`story_points\` maps to estimation.
- \`labels\` maps to tags.
- \`source\` maps to traceability metadata.

Jira-specific details stay in the executor: ADF conversion, custom story point
field, comments, worklogs, and issue properties.

## Approval Gate

Use this sequence for every batch, small or large:

~~~bash
matilha jira validate docs/matilha/jira/tasks.json
matilha jira preview docs/matilha/jira/tasks.json
~~~

Review the count, external ids, summaries, story points, and source references.
For large batches, preview keeps the terminal readable: it shows the full task
table and omits the converted Jira payload dump. The contract file remains the
source of truth.
Only then run:

~~~bash
matilha jira apply docs/matilha/jira/tasks.json --yes
~~~

If preview says \`100 task(s) ready\`, apply will attempt to create all 100.

After completion events are emitted, sync them with:

~~~bash
matilha jira sync --preview
matilha jira sync --yes
~~~
`;
