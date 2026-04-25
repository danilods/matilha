<p align="center">
  <img src="https://raw.githubusercontent.com/danilods/matilha-skills/main/assets/matilha-banner.png" alt="matilha — You Lead. Agents Hunt." width="100%" />
</p>

# matilha — CLI

> **You lead. Agents hunt.**
> Methodology harness CLI for AI-assisted software development.

> 🏠 **This is the CLI twin.** The official matilha entry point is [**danilods/matilha-skills**](https://github.com/danilods/matilha-skills) — the Claude Code plugin ecosystem with 139 skills across 7 companion packs. This CLI is the deterministic engine for power-user workflows, CI, and automation. For interactive development inside Claude Code, start with the plugin.

[![npm version](https://img.shields.io/npm/v/matilha?label=npm&color=e34c26)](https://www.npmjs.com/package/matilha)
[![tests](https://img.shields.io/badge/tests-1496%20passing-brightgreen)](#commands)
[![license](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)

---

## Install

```bash
npm install -g matilha
matilha --version
```

---

## Install the ecosystem (core + 7 packs)

### Interactive — pick your packs

```bash
matilha install-plugins
```

Launches a guided picker:
1. Choose a preset or **Custom** to select packs individually
2. Confirm whether to write the CLAUDE.md activation snippet
3. Copies the install block to clipboard (paste in Claude Code) — or add `--deep` to install directly

Presets available: `backend` · `ux` · `fullstack` · `security` · `core-only` · `custom`

### Non-interactive — install everything in one shot

```bash
matilha install-plugins --full --deep --with-claudemd
```

What `--full --deep --with-claudemd` does:
1. Adds `danilods/matilha-skills` to the Claude Code marketplace
2. Runs `claude plugin install` for each of the 8 plugins (core + 7 packs)
3. Writes the activation-priority snippet to `./CLAUDE.md`

Then in Claude Code: `/reload-plugins` → done.

### All flags

| Flag | Effect |
|---|---|
| _(no flags)_ | Interactive picker — preset or custom multiselect |
| `--full` | Non-interactive: core + all 7 companion packs |
| `--core-only` | Non-interactive: core plugin only |
| `--preset <name>` | Non-interactive: `backend` · `ux` · `fullstack` · `security` |
| `--deep` | Run `claude plugin install` directly instead of emitting a paste block (requires `claude` CLI on PATH) |
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
