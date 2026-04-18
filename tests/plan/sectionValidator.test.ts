import { describe, it, expect } from "vitest";
import {
  validatePhase10Gate,
  extractSection,
  countWords,
  GATE_SECTION_MAP
} from "../../src/plan/sectionValidator";

const FILLED_SPEC = `# My feature

## 2. Problem Statement

Users abandon the setup flow at step three because the onboarding wizard forces them to configure integrations before they can see product value. This causes a measurable drop-off we've observed in telemetry over the last quarter.

## 3. Personas & JTBD

This section is intentionally short.

## 4. Functional Requirements (RFs)

- RF-001 (MUST): Onboarding can be skipped and resumed later. The user should be able to come back and finish it at any point in time from the dashboard.
  - Acceptance: user can resume via dashboard.
- RF-002 (SHOULD): Integration setup is deferred until after first value.

## 5. Non-Functional Requirements (RNFs)

- RNF-001 (performance): First Interactive under 2s on a 4G connection
- RNF-002 (security): Data encrypted at rest using AES-256
- RNF-003 (availability): 99.5 percent uptime monthly SLA
- RNF-004 (latency): P95 API response under 300ms measured at gateway
- RNF-005 (scalability): Support 10k concurrent users without degradation
- RNF-006 (accessibility): WCAG 2.1 AA compliance for all user-facing UI

## 6. Risks
[placeholder]

## Links
- foo
`;

describe("extractSection", () => {
  it("extracts body of a section", () => {
    const body = extractSection(FILLED_SPEC, "## 2. Problem Statement");
    expect(body).toContain("Users abandon");
  });

  it("returns empty string when section missing", () => {
    expect(extractSection(FILLED_SPEC, "## 99. Nonexistent")).toBe("");
  });
});

describe("countWords", () => {
  it("counts non-whitespace words", () => {
    expect(countWords("one two three")).toBe(3);
    expect(countWords("  ")).toBe(0);
    expect(countWords("hello\nworld")).toBe(2);
  });
});

describe("validatePhase10Gate", () => {
  it("passes problem_defined when section has ≥30 words no placeholder", () => {
    const result = validatePhase10Gate("problem_defined", FILLED_SPEC);
    expect(result.ok).toBe(true);
  });

  it("fails target_user_clear when <30 words", () => {
    const result = validatePhase10Gate("target_user_clear", FILLED_SPEC);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/words/);
  });

  it("fails risks_listed when placeholder present", () => {
    const result = validatePhase10Gate("risks_listed", FILLED_SPEC);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/placeholder/i);
  });

  it("passes rfs_enumerated when RF-001 present", () => {
    const result = validatePhase10Gate("rfs_enumerated", FILLED_SPEC);
    expect(result.ok).toBe(true);
  });

  it("passes rnfs_covered when RNF-001 present", () => {
    const result = validatePhase10Gate("rnfs_covered", FILLED_SPEC);
    expect(result.ok).toBe(true);
  });

  it("fails on unknown gate", () => {
    const result = validatePhase10Gate("nonexistent_gate", FILLED_SPEC);
    expect(result.ok).toBe(false);
  });
});

describe("GATE_SECTION_MAP", () => {
  it("has entries for all 10 phase 10 gates", () => {
    const keys = Object.keys(GATE_SECTION_MAP);
    expect(keys.length).toBe(10);
    expect(keys).toContain("problem_defined");
    expect(keys).toContain("peer_review_done");
  });
});
