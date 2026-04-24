/**
 * Canonical CLAUDE.md snippet content per Wave 5g spec §4.1.
 *
 * This constant MUST match the snippet in `matilha-skills/docs/matilha/templates/claude-matilha-snippet.md`
 * byte-for-byte. Version marker `v1` allows future migrations. Delimited by
 * `<!-- matilha-start v1 -->` / `<!-- matilha-end v1 -->` so merge-or-create
 * consumers can idempotently update the managed region.
 */
export const CLAUDE_MD_SNIPPET = `<!-- matilha-start v1 -->
## Matilha — activation priority

This project uses the matilha harness. **Before invoking any creative-work skill** (\`superpowers:brainstorming\`, \`superpowers:writing-plans\`, etc.), you MUST first invoke \`matilha:matilha-compose\` via the Skill tool.

\`matilha-compose\` classifies intent into a matilha phase (scout / plan / design / hunt / gather / review / howl), detects installed companion packs, and dispatches to the right skill with pack-aware enrichment.

If \`matilha:matilha-compose\` is NOT visible in your skill list, matilha is not installed — proceed with default skills.

**Phases:** 0 (howl) → 10 (scout) → 20-30 (plan) → 40 (hunt/gather) → 50 (review) → 60 (den) → 70 (pack).

**Docs:** https://github.com/danilods/matilha-skills
<!-- matilha-end v1 -->`;
