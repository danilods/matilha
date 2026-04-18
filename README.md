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

## What's in Wave 2b

- `matilha init` functional end-to-end: detect tools → ask archetype + aesthetic → fetch templates from registry → write CLAUDE.md + AGENTS.md + project-status.md + design-spec.md (if frontend) → detect + offer companions (Impeccable, shadcn, Superpowers) → write 10 skills per detected tool
- `--dry-run` flag for preview mode
- Templates fetched from `github.com/danilods/matilha-skills/templates/` (not bundled)
- Companions registry-driven via `companions.json` (add a 4th companion = push to matilha-skills, zero CLI release)
- Uses existing `src/domain/projectStatusSchema.ts` (Wave 1) as SoR — no duplicate schema introduced
- 136 tests green (68 at Wave 2a close + 68 added in Wave 2b)
- New deps: `@clack/prompts` for interactive CLI UX

## What's in Wave 2c

- `matilha howl` functional: reads project-status.md, prints colored summary (text) or JSON (`--json`)
- `matilha scout` functional: Phase 00 discovery — interactive prompts, writes docs/matilha/discovery-notes.md, advances project-status from phase 0 to 10 with all gates set
- `src/util/frontmatter.ts`: reusable YAML frontmatter parse/serialize
- `src/util/projectStatus.ts`: read/write project-status.md with Zod schema validation
- 153 tests passing
- New deps: `yaml`, `picocolors`

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
