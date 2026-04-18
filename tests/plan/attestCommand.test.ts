import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { attestCommand } from "../../src/plan/attestCommand";

const STATUS_WITH_FEATURE = (extraGates: string = "") => `---
schema_version: 1
name: test-proj
archetype: saas-b2b
created: "2026-04-19T10:00:00Z"
last_update: "2026-04-19T10:00:00Z"
current_phase: 10
phase_status: not_started
next_action: "attest gates"
tools_detected:
  - claude-code
companion_skills:
  impeccable: not_installed
  shadcn: not_installed
  superpowers: not_installed
  typeui: not_installed
active_waves: []
completed_waves: []
feature_artifacts:
  - name: feat-a
    spec: docs/matilha/specs/2026-04-19-feat-a-spec.md
    plan: docs/matilha/plans/2026-04-19-feat-a-plan.md
    phase: planning
    wave: w1
    owned_by: matilha
recent_decisions: []
pending_decisions: []
blockers: []
phase_10_gates:
  problem_defined: pending
  target_user_clear: pending
  rfs_enumerated: pending
  rnfs_covered: pending
  risks_listed: pending
  premissas_listed: pending
  success_metrics_defined: pending
  aha_moment_identified: pending
  scope_boundaries_locked: pending
  peer_review_done: pending
${extraGates}---
# Body`;

const SPEC_WITH_SECTION_2_FILLED = `---
name: feat-a
created: "2026-04-19"
archetype: saas-b2b
methodology_phase: 10
---

# Feat A

## 2. Problem Statement

Users consistently abandon onboarding at step three. The flow forces integration configuration before product value is demonstrated, causing measurable drop-off in telemetry over the last quarter. We need to reorder discovery and integration.

## 3. Personas & JTBD
[placeholder]

## 4. Functional Requirements (RFs)
[placeholder]

## Links
- plan
`;

const SPEC_ALL_FILLED = `---
name: feat-a
---

# Feat A

## 2. Problem Statement

Users consistently abandon onboarding at step three. The flow forces integration configuration before product value is demonstrated, causing measurable drop-off in telemetry over the last quarter. We need to reorder discovery so users experience value before being asked to configure anything technical.

## 3. Personas & JTBD

Emma is a solo founder building her first SaaS. She wants to validate her idea fast. She is impatient with configuration and wants to see results immediately. Her job-to-be-done: set up a working product demo within the first session without needing engineering help.

## 4. Functional Requirements (RFs)

- RF-001 (MUST): Skip and resume onboarding. Users can skip any optional step and return later from the dashboard to complete it when ready. Acceptance: user can resume via dashboard link at any time.
- RF-002 (SHOULD): Integration setup is deferred until after first value is demonstrated to the user.

## 5. Non-Functional Requirements (RNFs)

- RNF-001 (performance): First Interactive under two seconds on broadband connection from standard devices in all supported regions.
- RNF-002 (security): All user data encrypted at rest and in transit using industry standard algorithms and key management.

## 6. Risks

Medium probability of confusion in skip-and-resume UI patterns. Low probability of data loss if session expires mid-flow. High impact only in worst case data-loss scenario. Mitigation: autosave progress every 30 seconds to prevent data loss on session expiry.

## 7. Assumptions

We assume users have email and can complete two-factor authentication. We assume modern browser with JavaScript enabled. We assume broadband connection during onboarding. We assume returning users remember their credentials or can reset via email.

## 8. Success Metrics

North star: onboarding completion rate measured from signup to first created record. KPI 1: time-to-first-value under five minutes. KPI 2: resume rate after partial completion above 40 percent. Target NSM is 70 percent completion within 30 days of launch.

## 9. AHA Moment

User creates their first record and sees it appear in a shared team view within ten seconds of signup completion, confirming that collaboration works without any manual setup or configuration required.

## 10. Candidate Stack
Next.js + Postgres. Redis cache for session. Clerk for auth.

## 11. Out of Scope

Enterprise SSO and SAML integration, multi-tenant admin dashboard, custom white-labeling for agency clients, public API access for external developers, native mobile apps for iOS and Android, full offline mode with local-first sync.

## 12. Peer Review

Reviewed by teammate on 2026-04-19. Verdict: approved with minor notes on RNF wording which were addressed in a follow-up edit to section five. No blocking issues found. Ready to proceed to Phase 20 stack decisions.

## Links
- plan
`;

describe("attestCommand", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "attest-"));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  function setup(statusContent: string, specContent: string) {
    writeFileSync(join(tmp, "project-status.md"), statusContent);
    const specPath = join(tmp, "docs", "matilha", "specs", "2026-04-19-feat-a-spec.md");
    mkdirSync(join(tmp, "docs", "matilha", "specs"), { recursive: true });
    writeFileSync(specPath, specContent);
  }

  it("flips gate to yes when section is valid", async () => {
    setup(STATUS_WITH_FEATURE(), SPEC_WITH_SECTION_2_FILLED);
    await attestCommand(tmp, "problem_defined");

    const updated = readFileSync(join(tmp, "project-status.md"), "utf-8");
    expect(updated).toContain("problem_defined: yes");
  });

  it("rejects when section has placeholder", async () => {
    setup(STATUS_WITH_FEATURE(), SPEC_WITH_SECTION_2_FILLED);
    await expect(attestCommand(tmp, "target_user_clear")).rejects.toThrow(/placeholder|Validation failed/i);
  });

  it("--force overrides validation failure and logs pending_decisions", async () => {
    setup(STATUS_WITH_FEATURE(), SPEC_WITH_SECTION_2_FILLED);
    await attestCommand(tmp, "target_user_clear", { force: true });

    const updated = readFileSync(join(tmp, "project-status.md"), "utf-8");
    expect(updated).toContain("target_user_clear: yes");
    expect(updated).toContain("pending_decisions:");
    expect(updated).toMatch(/--force override/);
  });

  it("auto-advances current_phase when all phase 10 gates become yes", async () => {
    setup(STATUS_WITH_FEATURE(), SPEC_ALL_FILLED);
    // Attest 9 of 10 gates first; expect phase stays at 10
    const gates = [
      "problem_defined", "target_user_clear", "rfs_enumerated", "rnfs_covered",
      "risks_listed", "premissas_listed", "success_metrics_defined",
      "aha_moment_identified", "scope_boundaries_locked"
    ];
    for (const g of gates) {
      await attestCommand(tmp, g);
    }
    const midState = readFileSync(join(tmp, "project-status.md"), "utf-8");
    expect(midState).toContain("current_phase: 10");

    // Attest the 10th → should advance to 20
    await attestCommand(tmp, "peer_review_done");
    const finalState = readFileSync(join(tmp, "project-status.md"), "utf-8");
    expect(finalState).toContain("current_phase: 20");
    expect(finalState).toContain("phase_status: not_started");
  });

  it("rejects unknown gate key", async () => {
    setup(STATUS_WITH_FEATURE(), SPEC_WITH_SECTION_2_FILLED);
    await expect(attestCommand(tmp, "nonexistent_gate")).rejects.toThrow(/Unknown gate/i);
  });

  it("accepts phase 20 gate with minimal validation", async () => {
    // Phase 20 gates get minimal validation in Wave 2d
    setup(STATUS_WITH_FEATURE(), SPEC_WITH_SECTION_2_FILLED);
    await attestCommand(tmp, "stack_table_declared");
    const updated = readFileSync(join(tmp, "project-status.md"), "utf-8");
    expect(updated).toContain("stack_table_declared: yes");
  });

  it("rejects when feature_artifacts empty", async () => {
    const emptyStatus = STATUS_WITH_FEATURE().replace(/feature_artifacts:[\s\S]*?recent_decisions:/, "feature_artifacts: []\nrecent_decisions:");
    writeFileSync(join(tmp, "project-status.md"), emptyStatus);
    await expect(attestCommand(tmp, "problem_defined")).rejects.toThrow(/No feature_artifacts|Run.*plan/i);
  });
});
