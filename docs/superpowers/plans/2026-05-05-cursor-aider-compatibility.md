# Cursor And Aider Compatibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Matilha bootstrap honest project-level support for Cursor and Aider in addition to Claude, Codex, and Gemini.

**Architecture:** Keep `SKILL.md` installation for tools that can consume skill directories. Add Aider as a detected tool without a native skill directory, and generate project bootstrap files for Cursor rules and Aider conventions during `matilha init`.

**Tech Stack:** TypeScript, Vitest, Markdown/MDC/YAML project files.

---

### Task 1: Detection And Skill Targets

**Files:**
- Modify: `src/config.ts`
- Modify: `src/init/detectTools.ts`
- Modify: `src/init/writeSkills.ts`
- Modify: `tests/init/detectTools.test.ts`
- Modify: `tests/init/writeSkills.test.ts`

- [x] **Step 1: Write failing tests**

Add tests for Cursor detection through `.cursor/rules` and `.cursorrules`, and Aider detection through `.aider.conf.yml` and `.aiderignore`. Add a `writeSkills(["aider"])` test proving only `.agents/skills` is written for Aider.

- [x] **Step 2: Verify red**

Run: `npm test -- tests/init/detectTools.test.ts tests/init/writeSkills.test.ts`
Expected: fail because Aider is not a known tool and Cursor markers are incomplete.

- [x] **Step 3: Implement minimal detection**

Add `"aider"` to `TOOLS`, add Aider target markers with no native `skillDir`, and make `writeSkills` skip undefined native skill targets.

- [x] **Step 4: Verify green**

Run: `npm test -- tests/init/detectTools.test.ts tests/init/writeSkills.test.ts`
Expected: pass.

### Task 2: Project Bootstrap Files

**Files:**
- Create: `src/init/writeToolBootstraps.ts`
- Create: `tests/init/writeToolBootstraps.test.ts`
- Modify: `src/init/initProject.ts`
- Modify: `tests/init/initProject.integration.test.ts`

- [x] **Step 1: Write failing tests**

Add tests proving Cursor writes `.cursor/rules/matilha.mdc`, Aider writes `CONVENTIONS.md` and `.aider.conf.yml`, dry-run reports without writing, and Claude-only init remains at the old file count.

- [x] **Step 2: Verify red**

Run: `npm test -- tests/init/writeToolBootstraps.test.ts tests/init/initProject.integration.test.ts`
Expected: fail because the module does not exist.

- [x] **Step 3: Implement bootstrap writer**

Create deterministic managed files for Cursor and Aider, return `WriteResult[]`, and merge them into `initProject`'s `writtenFiles`.

- [x] **Step 4: Verify green**

Run: `npm test -- tests/init/writeToolBootstraps.test.ts tests/init/initProject.integration.test.ts`
Expected: pass.

### Task 3: Regression

**Files:**
- Existing test suite only.

- [x] **Step 1: Run focused compatibility tests**

Run: `npm test -- tests/init tests/renderers tests/domain`
Expected: pass.

- [x] **Step 2: Run full verification**

Run: `npm run typecheck`, `npm test`, and `npm run build`
Expected: pass.
