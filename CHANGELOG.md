# Changelog

## [0.3.0] — 2026-04-18 — Wave 3a: /hunt runtime

### Added

- `matilha hunt <slug>` — Phase 40 wave dispatch (worktrees + kickoff + sp-done + wave-status).
- `src/hunt/` — planPathResolver, planParser, disjunctionValidator, execGit, worktreeCreator, gitignoreUtil, kickoffRenderer, waveStatusWriter, dispatcher (Dispatcher interface + PrintDispatcher), huntCommand orchestrator.
- `templates/kickoff.md.tmpl` + `templates/sp-done.md.tmpl` in matilha-skills registry.
- Four new CLI flags: `--wave`, `--dry-run`, `--force`, `--allow-overlap`.

### Changed

- `skills/matilha-hunt/SKILL.md` in matilha-skills: aligned with Wave 3a runtime. Prior reference to `superpowers:dispatching-parallel-agents` (drift from Wave 2a) replaced with `superpowers:executing-plans` (correct engine for worktree-isolated sessions per methodology/40-execucao).

### Internal

- Swiss Cheese pre-flight: 4 gate layers (plan exists → phase ≥ 30 → working tree clean → disjunction valid) before any git mutation.
- Soft-strict plan parser: accepts em-dash / colon / single-hyphen in SP headings; warns on non-canonical variants.
- Dispatcher interface: Wave 3a ships `PrintDispatcher`; future `MacTerminalDispatcher` (osascript) plugs in.

## [0.2.0] — 2026-04-18 — Wave 2f UX Baseline

### Changed

- All error messages now follow Weinschenk 5-rule format.
- `init`, `scout`, `plan`, `attest` stream progress per step.
- `howl` and `plan-status` now show remaining gates (not done count).
- Gate status rendered as `[yes]`/`[pending]`/`[no]` text labels (accessible).
- Registry templates (CLAUDE.md, AGENTS.md, project-status.md, spec.md,
  design-spec.md, plan.md) rewritten per UX Foundation.

### Breaking

- `matilha attest` with no arg now opens interactive picker (was: error).

### Added

- `src/ui/errorFormat.ts`, `src/ui/stream.ts`, `src/ui/pick.ts`,
  `src/ui/gateStatus.ts`, `src/ui/errorTranslator.ts` — shared UI
  infrastructure.
- `--json` flag on `list`, `init`.
- `--all` flag on `plan-status`.

### Removed

- Implementation-detail leaks in output (sha256 debug strings, "Wave 2d"
  internal refs, `bytes` counters).

## [0.1.0] — 2026-04-17 to 2026-04-19

Waves 1, 2a-2e: CLI skeleton, registry publishing, init, howl, scout, plan,
attest, plan-status.
