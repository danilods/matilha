import { describe, it, expect, vi, beforeEach } from "vitest";
import { pickPendingGate } from "../../src/plan/attestInteractive";
import type { ProjectStatus } from "../../src/domain/projectStatusSchema";

vi.mock("../../src/ui/pick", () => ({
  pick: vi.fn()
}));
import { pick } from "../../src/ui/pick";

describe("pickPendingGate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  const makeStatus = (overrides: Partial<ProjectStatus> = {}): ProjectStatus => ({
    schema_version: 1,
    name: "test",
    archetype: "api-standalone",
    created: "2026-04-20T00:00:00Z",
    last_update: "2026-04-20T00:00:00Z",
    current_phase: 10,
    phase_status: "in_progress",
    next_action: "",
    tools_detected: [],
    companion_skills: { impeccable: "not_installed", shadcn: "not_installed", superpowers: "not_installed", typeui: "not_installed" },
    active_waves: [],
    completed_waves: [],
    feature_artifacts: [],
    recent_decisions: [],
    pending_decisions: [],
    blockers: [],
    aesthetic_direction: null,
    design_locked: false,
    phase_10_gates: {},
    ...overrides
  } as unknown as ProjectStatus);

  it("shows only pending gates grouped by phase", async () => {
    const mock = pick as unknown as ReturnType<typeof vi.fn>;
    mock.mockResolvedValue("problem_defined");
    const status = makeStatus({
      phase_10_gates: {
        problem_defined: "pending",
        target_user_clear: "yes",
        rfs_enumerated: "pending"
      } as ProjectStatus["phase_10_gates"]
    });
    const result = await pickPendingGate(status);
    expect(result).toBe("problem_defined");
    const arg = mock.mock.calls[0][0] as { groups: Array<{ title: string; options: Array<{ value: string }> }> };
    expect(arg.groups[0].title).toContain("Phase 10");
    expect(arg.groups[0].options.some((o) => o.value === "problem_defined")).toBe(true);
    expect(arg.groups[0].options.some((o) => o.value === "target_user_clear")).toBe(false);
  });

  it("includes count (N of M pending) in group titles", async () => {
    const mock = pick as unknown as ReturnType<typeof vi.fn>;
    mock.mockResolvedValue("x");
    const status = makeStatus({
      phase_10_gates: { x: "pending", y: "yes" } as ProjectStatus["phase_10_gates"]
    });
    await pickPendingGate(status);
    const arg = mock.mock.calls[0][0] as { groups: Array<{ title: string }> };
    expect(arg.groups[0].title).toMatch(/1 of 2 pending/);
  });

  it("throws if all gates complete", async () => {
    const status = makeStatus({
      phase_10_gates: { x: "yes", y: "yes" } as ProjectStatus["phase_10_gates"]
    });
    await expect(pickPendingGate(status)).rejects.toThrow(/all gates complete|no pending gates/i);
  });
});
