# Claude + Codex Compatibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the CLI's first compatibility pass honest for Claude Code and OpenAI Codex.

**Architecture:** Keep Claude Code behavior unchanged. Introduce a small provider target map that separates tool detection from skill installation directories, so Codex can be detected by Codex-relevant project artifacts while skills are written to `.agents/skills`.

**Tech Stack:** TypeScript, Vitest, Node fs/path helpers, existing Matilha renderer/init modules.

---

### Task 1: Codex Skill Target

**Files:**
- Modify: `tests/renderers/codexRenderer.test.ts`
- Modify: `tests/renderers/geminiRenderer.test.ts`
- Modify: `src/renderers/codexRenderer.ts`
- Modify: `src/renderers/index.ts`

- [x] **Step 1: Write failing tests**

Change the Codex renderer expectation to `.agents/skills/<name>/SKILL.md`, and add a `renderAll` expectation proving Codex does not produce a duplicate universal file.

- [x] **Step 2: Verify red**

Run: `npm test -- tests/renderers/codexRenderer.test.ts tests/renderers/geminiRenderer.test.ts`
Expected: fail because Codex still renders `.codex/skills` and `renderAll` still returns duplicate `.agents` targets.

- [x] **Step 3: Implement minimal renderer fix**

Update `renderCodex` to target `.agents/skills`, and update `renderAll` to dedupe by `relativePath` while preferring provider-specific renderers over the universal fallback.

- [x] **Step 4: Verify green**

Run: `npm test -- tests/renderers/codexRenderer.test.ts tests/renderers/geminiRenderer.test.ts`
Expected: pass.

### Task 2: Init Skill Installation Target

**Files:**
- Modify: `tests/init/detectTools.test.ts`
- Modify: `tests/init/writeSkills.test.ts`
- Modify: `src/init/detectTools.ts`
- Modify: `src/init/writeSkills.ts`

- [x] **Step 1: Write failing tests**

Add tests showing Codex can be detected from `AGENTS.md` and `.agents/skills`, and that `writeSkills(["codex"])` writes only `.agents/skills`, not `.codex/skills`.

- [x] **Step 2: Verify red**

Run: `npm test -- tests/init/detectTools.test.ts tests/init/writeSkills.test.ts`
Expected: fail because Codex detection only checks `.codex`, and writeSkills still targets `.codex`.

- [x] **Step 3: Implement provider target map**

Create detection markers and skill install directories in `src/init/detectTools.ts`. Keep Claude at `.claude`; set Codex skill directory to `.agents`; dedupe install directories in `writeSkills`.

- [x] **Step 4: Verify green**

Run: `npm test -- tests/init/detectTools.test.ts tests/init/writeSkills.test.ts`
Expected: pass.

### Task 3: Regression Check

**Files:**
- Existing test suite only.

- [x] **Step 1: Run focused compatibility tests**

Run: `npm test -- tests/renderers tests/init`
Expected: pass.

- [x] **Step 2: Run full verification**

Run: `npm run typecheck && npm test`
Expected: pass.
