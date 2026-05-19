<p align="center">
  <img src="https://raw.githubusercontent.com/danilods/matilha-skills/main/assets/matilha-banner.png" alt="matilha — You Lead. Agents Hunt." width="100%" />
</p>

# matilha — CLI

> **You lead. Agents hunt.**
> Methodology harness CLI for AI-assisted software development.

> 🏠 **This is the CLI twin.** The official matilha entry point is [**danilods/matilha-skills**](https://github.com/danilods/matilha-skills) — the Claude Code plugin ecosystem with 146 skills across 7 companion packs. This CLI is the low-friction installer and deterministic engine for power-user workflows, CI, and automation.

[![npm version](https://img.shields.io/npm/v/matilha?label=npm&color=e34c26)](https://www.npmjs.com/package/matilha)
[![tests](https://img.shields.io/badge/tests-1602%20passing-brightgreen)](#commands)
[![license](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)

---

## Fastest Start

For Claude Code users, this is the shortest path:

```bash
npm install -g matilha
matilha install --full --deep --with-claudemd
```

Then in Claude Code:

```text
/reload-plugins
```

Open a new Claude Code prompt and start working normally. For software work, `matilha-compose` should route first, then hand off to the right Matilha phase or companion skill.

That installs:

- `matilha` core methodology plugin
- all 7 companion packs
- the `CLAUDE.md` activation-priority snippet for reliable routing

If the `claude` CLI is not available on your `PATH`, Matilha automatically falls back to a paste block you can copy into Claude Code.

---

## Codex And Cursor

Matilha can also install the same core skills and packs without Claude Code.

### Codex

Install globally for Codex:

```bash
npm install -g matilha@latest
matilha install --target codex --full --scope user
```

This writes skills to:

```text
~/.agents/skills/
```

Restart Codex or open a new session so the skill list refreshes.

For a single project instead of global/user install:

```bash
matilha install --target codex --full --scope project
```

That writes to:

```text
.agents/skills/
```

### Cursor

Run from the project root:

```bash
npm install -g matilha@latest
matilha install --target cursor --full
```

This writes:

```text
.cursor/skills/
.cursor/rules/matilha.mdc
```

Open a new Cursor Agent chat so the rule and skills refresh.

### Pick Packs For Codex Or Cursor

Use the same picker, just change the target:

```bash
matilha install --target codex
matilha install --target cursor
```

For Codex/Cursor, no `--deep` flag is needed: Matilha installs local skill files directly. `--deep` is only for Claude Code because it shells out to `claude plugin install`.

---

## What Gets Installed

Matilha has two layers:

| Layer | Installed by | What it does |
|---|---|---|
| **npm CLI** | `npm install -g matilha` | Gives you the `matilha` command: start, status, discover, spec, approve, split, merge, install/update packs |
| **Claude Code plugins** | `matilha install --deep` | Installs `matilha-skills` and companion packs inside Claude Code |
| **Codex local skills** | `matilha install --target codex` | Installs skills into `~/.agents/skills` or `.agents/skills` |
| **Cursor project skills** | `matilha install --target cursor` | Installs skills into `.cursor/skills` and writes `.cursor/rules/matilha.mdc` |

Important: updating the npm CLI does **not** automatically update Claude Code plugins. To update both, run:

```bash
npm install -g matilha@latest
matilha install --full --deep --with-claudemd
```

Then reload Claude Code plugins:

```text
/reload-plugins
```

---

## Choose Packs

### Interactive — pick your packs

```bash
matilha install --deep
```

Launches a guided picker:

1. Choose a preset or **Custom** to select packs individually.
2. Confirm whether to write the `CLAUDE.md` activation snippet.
3. Installs directly through `claude plugin install`.

Presets available: `backend` · `ux` · `fullstack` · `security` · `core-only` · `custom`

If you prefer not to run the Claude CLI, omit `--deep`:

```bash
matilha install
```

Matilha prints and copies a `/plugin marketplace add` + `/plugin install` block for you to paste into Claude Code.

### Non-interactive — install everything in one shot

```bash
matilha install --full --deep --with-claudemd
```

What `--full --deep --with-claudemd` does:
1. Adds `danilods/matilha-skills` to the Claude Code marketplace
2. Runs `claude plugin install` for each of the 8 plugins (core + 7 packs)
3. Writes the activation-priority snippet to `./CLAUDE.md`

Then in Claude Code: `/reload-plugins` → done.

### Preset examples

```bash
matilha install --core-only --deep
matilha install --preset backend --deep --with-claudemd
matilha install --preset ux --deep --with-claudemd
matilha install --preset fullstack --deep --with-claudemd
matilha install --preset security --deep --with-claudemd
```

### All flags

| Flag | Effect |
|---|---|
| _(no flags)_ | Interactive picker — preset or custom multiselect |
| `--full` | Non-interactive: core + all 7 companion packs |
| `--core-only` | Non-interactive: core plugin only |
| `--preset <name>` | Non-interactive: `backend` · `ux` · `fullstack` · `security` |
| `--deep` | Run `claude plugin install` directly instead of emitting a paste block (requires `claude` CLI on PATH) |
| `--target <name>` | `claude` (default) · `codex` · `cursor` |
| `--scope <name>` | For Codex/Cursor local installs: `user` or `project` |
| `--with-claudemd` | Also write/merge the CLAUDE.md activation-priority snippet |
| `--no-clipboard` | Print paste block to stdout instead of copying to clipboard |

---

## Commands

```
matilha --help
```

Matilha is state-guided. Commands remain scriptable, but interactive runs show a
compact next-step recommendation so you do not have to remember the whole
workflow.

```bash
matilha status
matilha status --no-guide
matilha --guide status
```

| Command | Phase | Description |
|---|---|---|
| `install` | — | Install Matilha skills and optional companion packs |
| `start` | — | Start or refresh Matilha control files |
| `status` | 0 | Show current project phase + next action |
| `discover` | 00→10 | Map the problem space before planning or coding |
| `spec <slug>` | 10→30 | Create or continue a feature spec + implementation plan |
| `approve [gate]` | any | Validate and approve a phase gate |
| `progress` | any | Show feature artifacts + gate state |
| `split <slug>` | 40 | Split a plan into parallel worktree tasks |
| `merge <slug>` | 40 | Merge completed worktree tasks, run regression, and clean worktrees by default |
| `jira init` | optional | Install the local Jira skill + example JSON contract |
| `jira validate/preview/apply` | optional | Validate, review, then apply Jira task contracts |
| `jira sync` | optional | Sync Matilha completion events to Jira after preview + approval |
| `list` | — | List skills in the matilha registry |
| `pull <slug>` | — | Pull a skill or resource from the registry |

Legacy aliases still work: `install-plugins`, `init`, `howl`, `scout`, `plan`, `attest`, `plan-status`, `hunt`, and `gather`.

---

## Context Control

`matilha start` keeps provider control files intentionally small.

Instead of growing `CLAUDE.md`, `AGENTS.md`, or `.cursor/rules/matilha.mdc` with full methodology text, Matilha writes compact pointers and creates:

```text
docs/matilha/context.md
```

Clean-session restore order:

1. Read `project-status.md`
2. Read `docs/matilha/context.md`
3. Open only the relevant spec, plan, wave, or skill files for the current task

This keeps Claude Code, Codex, Cursor, and other agent CLIs under their control-file limits while preserving durable context across fresh sessions.

---

## Worktree Hygiene

`matilha split <slug>` creates one worktree per parallel SP. After a successful wave, `matilha merge <slug>` now removes completed SP worktrees and deletes merged SP branches by default.

Use this only when you want to inspect the worktrees after merge:

```bash
matilha merge <slug> --keep-worktrees
```

---

## Optional Jira Flow

Jira automation is optional and contract-first. The agent turns Matilha specs,
plans, waves, and SPs into a generic work item JSON contract; the CLI validates,
previews, and only mutates Jira after explicit approval.

Bootstrap the local skill and example contract:

```bash
matilha jira init
```

This writes:

```text
.agents/skills/matilha-jira/SKILL.md
docs/matilha/jira/tasks.example.json
docs/matilha/jira/tutorial.md
```

Read the tutorial first when wiring this into a real sprint:

```bash
cat docs/matilha/jira/tutorial.md
```

Recommended flow:

```bash
matilha jira validate docs/matilha/jira/tasks.json
matilha jira preview docs/matilha/jira/tasks.json
matilha jira apply docs/matilha/jira/tasks.json --yes
```

From spec/plan to tasks:

```text
Read project-status.md plus the accepted spec and plan for <feature>.
Create docs/matilha/jira/tasks.json using schema_version 1.
Generate one generic work item per independently executable task.
If the plan contains 100 tasks, include all 100 tasks in tasks[].
Run matilha jira validate and matilha jira preview.
Do not apply until I approve the preview.
```

Contract shape:

```json
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
      "story_points": 0.5
    }
  ]
}
```

For large batches, there is no special mode: every item in `tasks[]` is
validated, previewed, and applied. If preview shows `100 task(s) ready`,
`matilha jira apply docs/matilha/jira/tasks.json --yes` attempts to create all
100 issues, preserving each `external_id` as Matilha traceability metadata.
For readability, large previews show the full task table and omit the converted
Jira payload dump; the JSON contract remains the source of truth.

For real Jira calls, set:

```bash
export JIRA_BASE_URL="https://your-domain.atlassian.net"
export JIRA_EMAIL="you@example.com"
export JIRA_API_TOKEN="..."
export JIRA_PROJECT_KEY="MAT"
export JIRA_STORY_POINTS_FIELD="customfield_10016"
```

Matilha converts descriptions/comments to Jira ADF, stores `external_id` as an
issue property, keeps `source.spec/source.plan/source.sp` as traceability
metadata, and refuses `apply` unless `--yes` is present.

### Completion Hook

After `matilha merge <slug>` successfully merges an SP, passes regression tests,
and marks it as completed, Matilha writes a local completion event:

```text
docs/matilha/events/outbox/*.json
```

That hook is local and durable. It does not call Jira by itself. To update Jira
comments, worklogs, story points, and Matilha issue properties, run:

```bash
matilha jira sync --preview
matilha jira sync --yes
```

Synced events move to:

```text
docs/matilha/events/processed/
```

To enrich a completion update, the SP can add optional tracking metadata to
`SP-DONE.md`:

```yaml
tracking:
  story_points: 0.25
  worklog: "15m"
  comment_markdown: "Implemented, tested, and merged by Matilha."
  observations:
    - "No migration rollback needed."
```

Use `matilha merge <slug> --no-events` only when you intentionally want to skip
local completion-event emission.

---

## Plugin ecosystem

The CLI is one of two install surfaces. The other is the Claude Code plugin:

| Surface | Install | Best for |
|---|---|---|
| **npm CLI** (`matilha`) | `npm install -g matilha` | CI, scripts, headless automation, power users |
| **Plugin** (`matilha-skills`) | `matilha install --deep` or `/matilha-install` wizard | Interactive development inside Claude Code |

Both share the same methodology content from [danilods/matilha-skills](https://github.com/danilods/matilha-skills).

---

## Contributing

Contributions are welcome, especially around CLI compatibility, skill quality, methodology docs, and real-world agent workflows.

Good first areas:

- Improve installers for Codex, Cursor, Claude Code, Gemini CLI, and other AI coding CLIs.
- Add or refine high-quality skills in the companion pack ecosystem.
- Improve Matilha phase docs, gates, templates, and examples.
- Report rough edges from real Claude Code, Codex, Cursor Agent, or multi-agent development sessions.
- Propose methodology improvements inspired by practical AI software development patterns, including Karpathy-style workflows.

Before opening a PR:

```bash
npm install
npm run typecheck
npm test
npm run build
```

For skill and pack contributions, start in [danilods/matilha-skills](https://github.com/danilods/matilha-skills). For CLI installers, commands, packaging, and automation, use this repository.

Search terms: AI agents, agent skills, Claude Code, Claude skills, Codex skills, OpenAI Codex, Cursor Agent, Gemini CLI, Karpathy, prompt engineering, vibe coding, AI-assisted software development.

---

## Update

```bash
npm install -g matilha@latest
matilha --version
```

To also update Claude Code plugins and packs:

```bash
matilha install --full --deep --with-claudemd
```

Then in Claude Code:

```text
/reload-plugins
```

Use the interactive updater when you only want selected packs:

```bash
matilha install --deep
```

---

## Uninstall

```bash
# Remove the CLI
npm uninstall -g matilha

# Remove the Claude Code plugins
claude plugin uninstall matilha --scope user
claude plugin uninstall matilha-ux-pack --scope user
claude plugin uninstall matilha-growth-pack --scope user
claude plugin uninstall matilha-harness-pack --scope user
claude plugin uninstall matilha-sysdesign-pack --scope user
claude plugin uninstall matilha-software-eng-pack --scope user
claude plugin uninstall matilha-software-arch-pack --scope user
claude plugin uninstall matilha-security-pack --scope user
```

**Optional:** remove the CLAUDE.md activation snippet — it sits between `<!-- matilha-start v1 -->` and `<!-- matilha-end v1 -->` markers.

---

## Try locally

```bash
git clone https://github.com/danilods/matilha.git
cd matilha
npm install
npm run build
node dist/cli.js --help
```

---

## License

MIT © Danilo de Sousa
