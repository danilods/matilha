import { describe, it, expect } from "vitest";
import { CLAUDE_MD_SNIPPET } from "../../src/install-plugins/claudeMdSnippet";

/**
 * Expected snippet per Wave 5g spec §4.1. Byte-for-byte canonical content;
 * updating this requires coordinated updates to the SP-B template file in
 * matilha-skills (`docs/matilha/templates/claude-matilha-snippet.md`).
 */
const EXPECTED_SNIPPET = `<!-- matilha-start v1 -->
## Matilha — activation priority

This project uses the matilha harness. **Before invoking any creative-work skill** (\`superpowers:brainstorming\`, \`superpowers:writing-plans\`, etc.), you MUST first invoke \`matilha:matilha-compose\` via the Skill tool.

\`matilha-compose\` classifies intent into a matilha phase (scout / plan / design / hunt / gather / review / howl), detects installed companion packs, and dispatches to the right skill with pack-aware enrichment.

If \`matilha:matilha-compose\` is NOT visible in your skill list, matilha is not installed — proceed with default skills.

**Phases:** 0 (howl) → 10 (scout) → 20-30 (plan) → 40 (hunt/gather) → 50 (review) → 60 (den) → 70 (pack).

**Docs:** https://github.com/danilods/matilha-skills
<!-- matilha-end v1 -->`;

describe("CLAUDE_MD_SNIPPET", () => {
  it("contains the matilha-start v1 marker", () => {
    expect(CLAUDE_MD_SNIPPET).toContain("<!-- matilha-start v1 -->");
  });

  it("contains the matilha-end v1 marker", () => {
    expect(CLAUDE_MD_SNIPPET).toContain("<!-- matilha-end v1 -->");
  });

  it("references matilha:matilha-compose as the activation gateway", () => {
    expect(CLAUDE_MD_SNIPPET).toContain("matilha:matilha-compose");
  });

  it("matches spec §4.1 canonical content byte-for-byte", () => {
    expect(CLAUDE_MD_SNIPPET).toBe(EXPECTED_SNIPPET);
  });

  it("starts and ends with the delimiter markers", () => {
    const lines = CLAUDE_MD_SNIPPET.split("\n");
    expect(lines[0]).toBe("<!-- matilha-start v1 -->");
    expect(lines[lines.length - 1]).toBe("<!-- matilha-end v1 -->");
  });
});
