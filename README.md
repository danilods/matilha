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

## What's in Wave 2d

- `matilha plan <slug>` scaffolds spec+plan from registry templates (BMAD-compatible PRD shape). No superpowers required.
  - `--import-research <file.md>` imports a deep-research markdown (Gemini/Claude) as Section 1 foundational context, wrapped in `<!-- MATILHA_RESEARCH_START/END -->` markers
  - `--archetype`, `--dry-run`, `--force` flags
  - Always writes to `docs/matilha/specs/` + `docs/matilha/plans/` regardless of superpowers detection; `owned_by` in feature_artifact distinguishes authorship
- `matilha attest <gate-key>` validates a spec section is filled (≥30 words, no placeholder markers, RF-001/RNF-001 patterns where required) and flips the gate to `yes`
  - Auto-advances `current_phase` when all gates in phase complete
  - `--force` override logs to `pending_decisions`
- `matilha plan-status` lists feature artifacts with phase gate state; `--json` for scripting
- Phase 10 has 10 gates (match fidelity to `methodology/10-prd.md`): problem_defined, target_user_clear, rfs_enumerated, rnfs_covered, risks_listed, premissas_listed, success_metrics_defined, aha_moment_identified, scope_boundaries_locked, peer_review_done
- Phase 20 has 6 gates (stack table, arch doc, RNF traceability, docker-compose, env.example, versions pinned)
- Phase 30 has 5 gates (CLAUDE.md, skills-by-domain, skills-by-tech, agents-with-models, one-blocking-hook)
- ~204 tests passing (+51 since Wave 2c)

### Typical pipeline

```
matilha init                                    # bootstrap project
matilha scout                                   # Phase 00 discovery (advances phase 0 → 10)
matilha plan my-feature --import-research research.md  # Phase 10 scaffold with deep research
# (open spec in IDE + AI agent to fill sections 2-12)
matilha attest problem_defined                  # validate + flip gate
matilha attest target_user_clear                # ...
# (when all 10 phase 10 gates flip to yes, auto-advance to phase 20)
matilha plan-status                             # check state anytime
matilha howl                                    # project-level status
```

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

## Wave 2f — UX Baseline Reformulation (2026-04-20)

Complete overhaul of every command's UX against the Matilha UX Foundation
(12 principles from Krug, Weinschenk 10 domains, frameworks comportamentais,
context-engineering). See:

- Foundation: `wiki/analyses/matilha-ux-foundation.md` (if vendored)
- Reformulation spec: `docs/superpowers/specs/2026-04-20-matilha-ux-reformulation-design.md`

**What changed:**

- Every error message now follows the Weinschenk 5-rule (summary / context /
  problem / next action / example).
- `init`, `scout`, `plan`, `attest` emit streaming progress (status-line per
  step).
- `howl` and `plan-status` show *remaining gates* instead of done count.
- `attest` without arguments now opens an **interactive picker** (TUI) of
  pending gates — grouped by phase. Passing a gate-key as argument still works
  for scripting.
- Gate status uses **text labels** (`[yes]` / `[pending]` / `[no]`) in
  addition to color — accessible to colorblind users and screen readers.
- Registry templates (`CLAUDE.md`, `spec.md`, `plan.md`, etc) rewritten with
  chunked sections, "good example" comments, and narrative footers.

**Breaking change:**

- `matilha attest` with no argument previously errored. Now launches TUI. If
  you were scripting around the error, keep passing the gate-key.

**Tests:** 204 → ~290.

## Wave 3a — `/hunt` runtime (2026-04-18)

`matilha hunt <feature-slug>` — Phase 40 wave dispatch.

Reads a plan artifact, validates intra-wave file disjunction, creates a git
worktree per SP with a rendered `kickoff.md` and `SP-DONE.md` template,
writes `docs/matilha/waves/wave-NN-status.md`, and prints dispatch commands
for the user to paste in new terminals.

**Scaffolder, not executor.** Matilha creates artifacts; AI in each
worktree (with or without superpowers) does the actual work. `/gather`
(Wave 3b) handles merge + regression + cleanup.

**Flags:**
- `--wave <N>` — explicit wave number (default: first pending)
- `--dry-run` — preview without mutation
- `--force` — re-dispatch destructively (logs recovery info first)
- `--allow-overlap` — bypass disjunction check (merge-conflict risk)

**Accessibility / UX:** applies all 12 principles from
`wiki/analyses/matilha-ux-foundation.md`. Streaming progress, 5-rule
errors, soft-strict plan parser, Swiss Cheese pre-flight (4 gates before
any mutation), `NO_COLOR` respected.

## Wave 3b — `/gather` runtime (2026-04-19)

`matilha gather <feature-slug>` — Phase 40 wave merge + regression.

Reads `docs/matilha/waves/wave-NN-status.md`, validates each SP's
`SP-DONE.md` against strict completion gates, merges every SP branch
into the current integration branch in the declared `merge_order`
(`git merge --no-ff`), runs `npm test` after every merge to localize
regressions, and updates the wave-status file with per-SP +
overall state.

**Scaffolder, not orchestrator.** /gather does not invoke /review, does
not advance `current_phase`, does not tag. On any failure, it HALTS
and preserves state — Matilha never rolls back on the user's behalf.

**Flags:**
- `--wave <N>` — explicit wave number (default: 1)
- `--dry-run` — validate SP-DONE gates + print merge plan, no mutation
- `--cleanup` — after wave success, remove worktrees + delete merged branches (opt-in)

**SP-DONE gates (strict):** `status=completed`, `tests.passed=true`,
non-empty `commits[]`, non-null `completed_at`, `tests.count >= 1`,
and `sp_id` / `feature` / `wave` must match the gather target.

## License

MIT © Danilo de Sousa
