# Gemini CLI Compatibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Matilha's Gemini CLI support match current Gemini CLI project and extension markers.

**Architecture:** Keep local project skills under `.gemini/skills`, while expanding detection to include normal Gemini context and extension files. For distribution, add minimal Gemini extension manifests to companion pack repositories so Gemini can install them as extensions.

**Tech Stack:** TypeScript, Vitest, JSON manifests, existing Matilha init/renderers.

---

### Task 1: CLI Gemini Detection

**Files:**
- Modify: `tests/init/detectTools.test.ts`
- Modify: `src/init/detectTools.ts`

- [x] **Step 1: Write failing tests**

Add tests showing Gemini CLI is detected via `GEMINI.md`, `gemini-extension.json`, and `.gemini/skills`.

- [x] **Step 2: Verify red**

Run: `npm test -- tests/init/detectTools.test.ts`
Expected: fail because Gemini currently only detects `.gemini`.

- [x] **Step 3: Implement minimal marker expansion**

Add `GEMINI.md`, `gemini-extension.json`, and `.gemini/skills` to the Gemini detection markers.

- [x] **Step 4: Verify green**

Run: `npm test -- tests/init/detectTools.test.ts`
Expected: pass.

### Task 2: Regression Check

**Files:**
- Existing test suite only.

- [x] **Step 1: Run focused tests**

Run: `npm test -- tests/init tests/renderers`
Expected: pass.

- [x] **Step 2: Run full verification**

Run: `npm run typecheck`, `npm test`, and `npm run build`
Expected: pass.

### Task 3: Gemini Pack Manifests

**Files:**
- Create: `gemini-extension.json` in each companion pack repo that lacks it.

- [x] **Step 1: Inspect pack metadata**

Read each pack's `.claude-plugin/plugin.json` and skill count.

- [x] **Step 2: Add minimal manifests**

Create valid `gemini-extension.json` files with `name`, `description`, and `version`.

- [x] **Step 3: Validate JSON**

Run a JSON parse check across all new manifests.
