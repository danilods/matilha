<p align="center">
  <img src="https://raw.githubusercontent.com/danilods/matilha-skills/main/assets/matilha-banner.png" alt="matilha — You Lead. Agents Hunt." width="100%" />
</p>

# matilha — CLI

> **You lead. Agents hunt.**
> Methodology harness CLI for AI-assisted software development.

> 🏠 **This is the CLI twin.** The official matilha entry point is [**danilods/matilha-skills**](https://github.com/danilods/matilha-skills) — the Claude Code plugin ecosystem with 146 skills across 7 companion packs. This CLI is the low-friction installer and deterministic engine for power-user workflows, CI, and automation.

[![npm version](https://img.shields.io/npm/v/matilha?label=npm&color=e34c26)](https://www.npmjs.com/package/matilha)
[![tests](https://img.shields.io/badge/tests-1571%20passing-brightgreen)](#commands)
[![license](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)

---

## Fastest Start

For Claude Code users, this is the shortest path:

```bash
npm install -g matilha
matilha install-plugins --full --deep --with-claudemd
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
matilha install-plugins --target codex --full --scope user
```

This writes skills to:

```text
~/.agents/skills/
```

Restart Codex or open a new session so the skill list refreshes.

For a single project instead of global/user install:

```bash
matilha install-plugins --target codex --full --scope project
```

That writes to:

```text
.agents/skills/
```

### Cursor

Run from the project root:

```bash
npm install -g matilha@latest
matilha install-plugins --target cursor --full
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
matilha install-plugins --target codex
matilha install-plugins --target cursor
```

For Codex/Cursor, no `--deep` flag is needed: Matilha installs local skill files directly. `--deep` is only for Claude Code because it shells out to `claude plugin install`.

---

## What Gets Installed

Matilha has two layers:

| Layer | Installed by | What it does |
|---|---|---|
| **npm CLI** | `npm install -g matilha` | Gives you the `matilha` command: init, plan, hunt, gather, install/update plugins |
| **Claude Code plugins** | `matilha install-plugins --deep` | Installs `matilha-skills` and companion packs inside Claude Code |
| **Codex local skills** | `matilha install-plugins --target codex` | Installs skills into `~/.agents/skills` or `.agents/skills` |
| **Cursor project skills** | `matilha install-plugins --target cursor` | Installs skills into `.cursor/skills` and writes `.cursor/rules/matilha.mdc` |

Important: updating the npm CLI does **not** automatically update Claude Code plugins. To update both, run:

```bash
npm install -g matilha@latest
matilha install-plugins --full --deep --with-claudemd
```

Then reload Claude Code plugins:

```text
/reload-plugins
```

---

## Choose Packs

### Interactive — pick your packs

```bash
matilha install-plugins --deep
```

Launches a guided picker:

1. Choose a preset or **Custom** to select packs individually.
2. Confirm whether to write the `CLAUDE.md` activation snippet.
3. Installs directly through `claude plugin install`.

Presets available: `backend` · `ux` · `fullstack` · `security` · `core-only` · `custom`

If you prefer not to run the Claude CLI, omit `--deep`:

```bash
matilha install-plugins
```

Matilha prints and copies a `/plugin marketplace add` + `/plugin install` block for you to paste into Claude Code.

### Non-interactive — install everything in one shot

```bash
matilha install-plugins --full --deep --with-claudemd
```

What `--full --deep --with-claudemd` does:
1. Adds `danilods/matilha-skills` to the Claude Code marketplace
2. Runs `claude plugin install` for each of the 8 plugins (core + 7 packs)
3. Writes the activation-priority snippet to `./CLAUDE.md`

Then in Claude Code: `/reload-plugins` → done.

### Preset examples

```bash
matilha install-plugins --core-only --deep
matilha install-plugins --preset backend --deep --with-claudemd
matilha install-plugins --preset ux --deep --with-claudemd
matilha install-plugins --preset fullstack --deep --with-claudemd
matilha install-plugins --preset security --deep --with-claudemd
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

| Command | Phase | Description |
|---|---|---|
| `install-plugins` | — | Install the matilha ecosystem (plugin + packs) |
| `init` | — | Bootstrap a matilha project (`project-status.md`, `docs/matilha/`) |
| `howl` | 0 | Show current project phase + next action |
| `scout` | 00→10 | Phase 00 discovery — map the problem space |
| `plan <slug>` | 10→30 | Scaffold spec + implementation plan |
| `attest [gate]` | any | Validate and flip a phase gate |
| `plan-status` | any | Show feature artifacts + gate state |
| `hunt <slug>` | 40 | Decompose plan into waves, create git worktrees |
| `gather <slug>` | 40 | Merge completed SPs, run regression, update wave status |
| `list` | — | List skills in the matilha registry |
| `pull <slug>` | — | Pull a skill or resource from the registry |

---

## Plugin ecosystem

The CLI is one of two install surfaces. The other is the Claude Code plugin:

| Surface | Install | Best for |
|---|---|---|
| **npm CLI** (`matilha`) | `npm install -g matilha` | CI, scripts, headless automation, power users |
| **Plugin** (`matilha-skills`) | `matilha install-plugins --deep` or `/matilha-install` wizard | Interactive development inside Claude Code |

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
matilha install-plugins --full --deep --with-claudemd
```

Then in Claude Code:

```text
/reload-plugins
```

Use the interactive updater when you only want selected packs:

```bash
matilha install-plugins --deep
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
