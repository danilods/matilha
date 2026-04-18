import { RegistryClient } from "../registry/registryClient";
import { PHASE_GATE_KEYS } from "../config";

export type Phase = 10 | 20 | 30;

/**
 * Fetch a methodology page via RegistryClient.pullRaw and extract gate keys
 * from the "Gates de saída" section. Returns null on any fetch/parse failure
 * (caller decides whether to warn).
 */
export async function fetchMethodologyGateKeys(
  phase: Phase,
  client: RegistryClient = new RegistryClient()
): Promise<string[] | null> {
  const pageMap: Record<Phase, string> = {
    10: "methodology/10-prd.md",
    20: "methodology/20-stack.md",
    30: "methodology/30-skills-agents.md"
  };
  try {
    const content = await client.pullRaw(pageMap[phase]);
    return parseGateKeysFromMethodology(content);
  } catch {
    return null;
  }
}

/**
 * Parse "Gates de saída" section from methodology markdown, returning inferred
 * gate keys from the checklist items. Best-effort heuristic.
 * Returns gate keys converted to snake_case based on content semantics —
 * caller compares with hardcoded PHASE_GATE_KEYS.
 */
export function parseGateKeysFromMethodology(content: string): string[] {
  // Find "## Gates de saída" section (tolerant to accent/case)
  const sectionMatch = /##\s+Gates de sa[íi]da[^\n]*\n([\s\S]*?)(?=\n##\s|$)/i.exec(content);
  if (!sectionMatch) return [];
  const section = sectionMatch[1] ?? "";
  // Count the bullet/checkbox items as a rough heuristic
  const bullets = section.match(/^-\s+\[\s*[x ]\s*\]/gm) ?? [];
  // Return empty placeholder keys (we can't accurately derive keys from prose);
  // caller's purpose is just to compare COUNT or presence — this is advisory only.
  return bullets.map((_, i) => `gate_${i}`);
}

/**
 * Compare hardcoded PHASE_GATE_KEYS[phase] with methodology page; emit warning
 * if counts differ. Non-fatal; just logs to stderr.
 */
export async function warnIfGatesDrift(
  phase: Phase,
  client: RegistryClient = new RegistryClient()
): Promise<void> {
  const live = await fetchMethodologyGateKeys(phase, client);
  if (live === null) return; // network or parse failure; silent
  const hardcoded = PHASE_GATE_KEYS[phase];
  if (live.length !== hardcoded.length) {
    console.warn(
      `[matilha] Gate drift warning: methodology/${phase}-*.md has ${live.length} gates, but hardcoded PHASE_GATE_KEYS[${phase}] has ${hardcoded.length}. Consider re-checking.`
    );
  }
}
