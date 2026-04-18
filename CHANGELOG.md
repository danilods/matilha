# Changelog

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
