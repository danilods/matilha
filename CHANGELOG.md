# Changelog

## [1.2.2] — 2026-04-24 — Novo sigil: ASCII art do lobo com wordmark MATILHA

### Changed

- `src/ui/banner.ts` — `MATILHA_BANNER` substituído pelo ASCII art `#`-based do lobo com wordmark MATILHA (era text-art de blocos Unicode).
- `src/cli.ts` — banner agora aparece em `matilha` (sem args) via `printBanner()` + em `matilha --help` via `addHelpText("beforeAll", ...)`. Fix de ordering: o check de args sem-comando agora ocorre antes de `program.parse()` para evitar exit 1 do commander antes de renderizar o banner.

## [1.2.1] — 2026-04-24 — Fix VERSION constant not reflecting package.json

### Fixed

- `fix: VERSION constant in src/index.ts was hardcoded to "0.1.0"` — `matilha --version` reportava `0.1.0` em todas as versões desde v1.0.0. Causa raiz: `src/index.ts` exportava uma string literal que nunca acompanhava os bumps do `package.json`. Corrigido: `VERSION` agora lê `version` do `package.json` em runtime via `createRequire`. `tests/cli.integration.test.ts` atualizado para assertar contra `pkg.version` em vez de string hardcoded — impede regressão futura.

## [1.2.0] — 2026-04-24 — Unified install UX (Wave 5g SP-A + SP-E)

### Added

- `feat(cli): matilha install-plugins subcommand — interactive + non-interactive pack selection, clipboard copy, CLAUDE.md snippet emission (Wave 5g SP-A)`. New command emits a paste-ready `/plugin install` block for the matilha ecosystem. Flags: `--full` (core + 7 packs), `--core-only`, `--preset <backend|ux|fullstack|security>`, `--with-claudemd` (append the activation-priority snippet with `<!-- matilha-start v1 -->` markers), `--no-clipboard` (stdout only). Default behavior with no flags: interactive @clack/prompts picker with preset + custom options, clipboard auto-copy via pbcopy/xclip/clip (graceful stdout fallback).
- `feat(cli): --deep flag — zero-paste install via claude plugin install (Wave 5g SP-E)`. When `--deep` is set, the CLI detects the `claude` binary on PATH and runs `claude plugin marketplace add` + `claude plugin install <plugin>@<marketplace> --scope user` for each selected pack, sequentially. Idempotent: re-runs treat "already installed" exits as success. Combined with `--with-claudemd`, also applies the Wave 5g SP-B merge-or-create contract to `./CLAUDE.md` in the current directory. Falls back gracefully to paste-block mode when the `claude` CLI is absent. New helpers: `detectClaudeCli.ts` (PATH scanner, no shell invocation), `executeDeepInstall.ts` (execFile-based sequential runner, dry-run support, `onStep` progress callback), `writeClaudeMd.ts` (3-case merge-or-create: create / append / replace-between-markers). Matches the `claude plugin install` shell API documented at docs.claude.com/plugins-reference. After completion, prints an instruction to run `/reload-plugins` (in-session) or open a new Claude Code session to activate.

## [1.1.0] — 2026-04-24 — Validator polish (synced with matilha-skills 1.1.0)

Non-breaking validator additions + infrastructure hardening. No CLI-command behavior changes.

### Added / Changed

- Validator schema tolerance for orchestrator-skill descriptions: `description.max` raised to 800 characters (was 300), accommodating matilha-compose-style activation gates that encode conjunct-heavy conditions.
- Description linter accepts `You MUST` opener in addition to `Use when` / `When`. Required for matilha-compose to out-trigger competing third-party MUST-clause skills in activation competition.
- Stopwords list for activation-uniqueness heuristic extended with Portuguese terms (de, da, do, para, com, em, quando, que, ao). Caminho C packs author descriptions in Portuguese; previous stopword list was Anglo-centric.
- Line-range check for Caminho C packs (software-eng, software-arch, security) broadened to 100–500 (vs 150–500 for literature packs) to accommodate the natural compactness of 2-layer distillation.
- Test coverage for `matilha-compose` body invariants (Pack awareness section, no-hardcoded-prefix guard, fallback cases B/C/D, preamble template guidance marker).

No regressions across the arc Wave 3a → 1.1.0. Test count stable at 1466 passing.

## [1.0.0] — 2026-04-23 — First official release

Matilha CLI reaches v1.0.0 alongside the matilha-skills plugin ecosystem (7 companion packs, 139 skills total).

**Published to npm** for the first time. Installable via:

```
npm install -g matilha
```

### What's shipped

- **Phase-gated CLI** (from Waves 1-3b) — `matilha init`, `matilha scout`, `matilha plan`, `matilha hunt`, `matilha gather`, `matilha howl`, `matilha attest`, `matilha plan-status`, `matilha list`, `matilha pull`.
- **Deterministic engine** — commands produce reproducible outputs from the same inputs; enables CI integration + automation.
- **Twin identity** — same methodology content as matilha-skills plugin (Twin Identity directive from Wave 4a), two surfaces (CLI for determinism, plugin for composition).
- **Validator suite** — 1466 tests passing across core registry + 7 companion packs + composition layer + all iterations of Waves 3a → 5i.

### Install

Global:

```
npm install -g matilha
```

Verify:

```
matilha --version  # 1.0.0
```

### Version synchronization policy

matilha CLI 1.0.0 synchronizes with matilha-skills plugin 1.0.0 at this release. Companion packs stay at 0.1.0 (honest semver — each pack has shipped exactly once; they'll bump independently as content evolves). Future CLI minor/patch versions track CLI-specific changes; major version bumps re-sync with the plugin ecosystem when breaking methodology changes ship.

## [Wave 5d] — 2026-04-22 — Composition Layer Validator

Extends `tests/registry/content-validation.test.ts` with 18 new tests protecting the Wave 5d composition layer introduced in matilha-skills (matilha-compose gateway + matilha-plan / matilha-design refactors). CLI version stays at 0.4.0 — these are non-breaking validator additions.

### Added

- `matilha-compose skill (Wave 5d)` describe block — 4 tests (file exists, frontmatter schema, description activation gate with MUST + matilha-project condition, optional_companions includes superpowers:brainstorming).
- `matilha-compose body (Wave 5d)` describe block — 8 tests (Pack awareness section, Fallback semantics section, `matilha-*-pack` namespace reference, no-hardcoded-prefix guard, Cases B/C/D fallback documentation, preamble template guidance marker).
- `matilha-plan body (Wave 5d refactor)` describe block — 3 tests (pack-aware preamble injection language, matilha-compose cross-reference, superpowers-absent fallback).
- `matilha-design body (Wave 5d refactor)` describe block — 3 tests (Pack detection step, matilha-compose cross-reference, core-heuristics fallback).

### Changed

- `skill description linter` (Wave 4a → Wave 4a + 5d) — accepts `You MUST` opener in addition to existing `Use when` / `When`. Orchestrator skills need the MUST-imperative to out-trigger third-party MUST-clause skills in activation competition. Matilha-compose is the first such skill.
- `skillFrontmatterSchema.description` max length raised from 300 to 800 characters. Orchestrator skills encode their full activation gate (conjuncts + condition signals + dispatch behavior) in the description. Content skills still typically stay under 200 chars.

### Test counts

- Pre-Wave-5d baseline: 906 tests (903 passing + 2 pre-existing red on matilha-compose stub description-length and version validators — auto-resolved by Task 3.4 + compose 1.0.0 version).
- Post-Wave-5d: **924 passing (924)**. Zero regressions.

## [0.4.0] — 2026-04-19 — Wave 3b: /gather runtime

### Added

- `matilha gather <slug>` — Phase 40 wave merge (validate SP-DONE + merge `--no-ff` in merge_order + per-SP regression + wave-status bookkeeping).
- `src/gather/` — waveStatusReader, spDoneReader, mergeExecutor, cleanupExecutor, waveStatusUpdater, gatherCommand.
- Three new CLI flags on `gather`: `--wave`, `--dry-run`, `--cleanup`.
- `src/hunt/naming.ts` — extracted shared `slugifySP` + `padWave` helpers (Wave 3a follow-up).

### Changed

- `skills/matilha-gather/SKILL.md` in matilha-skills: aligned with Wave 3b scaffolder behavior. Prior references to auto-invoking `/review` and advancing `current_phase: 50` (Wave 2a drift) removed. Responsibility split now explicit: /gather = merge + regression bookkeeping; /review = quality (Wave 3c); attest = phase advancement.

### Internal

- Strict SP-DONE.md frontmatter validation via Zod (`spDoneSchema`) with drift detection against expected `sp_id` / `feature` / `wave`.
- Per-SP regression with injectable test command for integration tests (default: `npm test`).
- Resume-safe per-SP loop: SPs already at `status: completed` are skipped; SPs at `status: failed` halt until reset manually.
- HALT (not rollback) on merge conflict or regression failure: `git merge --abort` runs automatically on conflict; state is preserved; 5-rule errors include the exact recovery commands.

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
