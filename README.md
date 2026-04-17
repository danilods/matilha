# Matilha

> Humanos lideram. Agentes caçam.

Agentic methodology plugin + CLI for Claude Code, Cursor, Codex, and Gemini CLI.

**Status:** v0.1 — Wave 1 complete (CLI skeleton). Not yet published to marketplaces. Under active development.

## What's in Wave 1

- TypeScript CLI with Commander
- 4 Zod schemas (projectStatus, spec, plan, wave)
- 5 cross-tool renderers (universal, Claude Code, Cursor, Codex, Gemini CLI)
- 4 plugin manifests (`.claude-plugin/`, `.cursor-plugin/`, `.codex/`, `gemini-extension.json`)
- Registry client (`list` + `pull` from `github.com/danilods/matilha-skills`)
- Vitest test suite (47 tests)

## What's in Wave 2a (partial)

- Registry repo: [github.com/danilods/matilha-skills](https://github.com/danilods/matilha-skills)
- 10 skills following 12-section blueprint
- 11 methodology pages (ported from Obsidian vault)
- 9 slash commands (scout, plan, hunt, gather, howl, review, den, pack, matilha-design)
- `matilha list` now returns real skills from registry
- `matilha pull <slug>` fetches actual skill markdown

## Try the CLI locally

```
git clone https://github.com/danilods/matilha.git
cd matilha
npm install
npm run build
node dist/cli.js --help
```

## Roadmap

See `docs/superpowers/specs/2026-04-17-matilha-v1-design.md` in the Memory vault for the full v1 design (7 waves).

- Wave 1: CLI skeleton — done
- Wave 2: Core skills + commands + registry bundled
- Wave 3: Quality harness (review agents)
- Wave 4: Design harness + companions
- Wave 5: Wave execution (hunt + gather)
- Wave 6: Polish + npm publish + marketplace submission
- Wave 7: Cross-tool publishing + validation

## License

MIT © Danilo de Sousa
