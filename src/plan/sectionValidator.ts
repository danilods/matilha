import { MIN_WORDS_PER_SECTION, PLACEHOLDER_SENTINEL_RE, RF_PATTERN, RNF_PATTERN } from "../config";

export type GateKey = string;

export type ValidationResult =
  | { ok: true }
  | { ok: false; reason: string };

/**
 * Map each gate key to its expected spec section heading.
 * Keys outside this map are phase 20/30 gates handled by validateExternal().
 */
const GATE_TO_SECTION: Record<string, string> = {
  problem_defined: "## 2. Problem Statement",
  target_user_clear: "## 3. Personas & JTBD",
  rfs_enumerated: "## 4. Functional Requirements (RFs)",
  rnfs_covered: "## 5. Non-Functional Requirements (RNFs)",
  risks_listed: "## 6. Risks",
  premissas_listed: "## 7. Assumptions",
  success_metrics_defined: "## 8. Success Metrics",
  aha_moment_identified: "## 9. AHA Moment",
  scope_boundaries_locked: "## 11. Out of Scope",
  peer_review_done: "## 12. Peer Review"
};

/**
 * Extract section body given heading. Returns "" if not found.
 */
export function extractSection(markdown: string, heading: string): string {
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // No "m" flag so $ matches end-of-string, not end-of-line.
  // This prevents the lazy quantifier from stopping at the first newline.
  const re = new RegExp(`${escapedHeading}\\s*\\n([\\s\\S]*?)(?=\\n## |$)`);
  const match = re.exec(markdown);
  return match?.[1]?.trim() ?? "";
}

/**
 * Count non-whitespace words in a string.
 */
export function countWords(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Validate a Phase 10 gate by checking the corresponding spec section.
 * Returns ok or a reason string on failure.
 */
export function validatePhase10Gate(gate: GateKey, specMarkdown: string): ValidationResult {
  const heading = GATE_TO_SECTION[gate];
  if (!heading) {
    return { ok: false, reason: `Unknown Phase 10 gate: ${gate}` };
  }
  const body = extractSection(specMarkdown, heading);
  if (!body) {
    return { ok: false, reason: `Section not found: ${heading}` };
  }
  if (PLACEHOLDER_SENTINEL_RE.test(body)) {
    return { ok: false, reason: `Section "${heading}" still has placeholder sentinels. Remove [placeholder] / <!-- TODO and fill content.` };
  }
  const words = countWords(body);
  if (words < MIN_WORDS_PER_SECTION) {
    return { ok: false, reason: `Section "${heading}" has ${words} words (need >= ${MIN_WORDS_PER_SECTION}).` };
  }
  // Extra enumerated checks
  if (gate === "rfs_enumerated" && !RF_PATTERN.test(body)) {
    return { ok: false, reason: `Section "${heading}" needs at least one "- RF-001" style entry.` };
  }
  if (gate === "rnfs_covered" && !RNF_PATTERN.test(body)) {
    return { ok: false, reason: `Section "${heading}" needs at least one "- RNF-001" style entry.` };
  }
  return { ok: true };
}

export const GATE_SECTION_MAP = GATE_TO_SECTION;
