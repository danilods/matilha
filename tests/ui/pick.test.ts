import { describe, it, expect, vi, beforeEach } from "vitest";
import { pick, type PickGroup } from "../../src/ui/pick";

vi.mock("@clack/prompts", () => ({
  select: vi.fn(),
  isCancel: vi.fn((v: unknown) => typeof v === "symbol" && v === CANCEL_SYMBOL)
}));

const CANCEL_SYMBOL = Symbol("cancel");

import { select, isCancel } from "@clack/prompts";

describe("pick", () => {
  const mockSelect = select as unknown as ReturnType<typeof vi.fn>;
  const mockIsCancel = isCancel as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockSelect.mockReset();
    mockIsCancel.mockImplementation((v: unknown) => v === CANCEL_SYMBOL);
  });

  it("flattens groups into @clack select; returns the selected value", async () => {
    mockSelect.mockResolvedValue("option-a");
    const groups: PickGroup<string>[] = [
      {
        title: "Phase 10 — 2 of 10 pending",
        options: [
          { value: "option-a", label: "problem_defined" },
          { value: "option-b", label: "target_user_clear" }
        ]
      }
    ];
    const result = await pick({ message: "choose a gate", groups });
    expect(result).toBe("option-a");
    expect(mockSelect).toHaveBeenCalledOnce();
    const arg = mockSelect.mock.calls[0][0] as { message: string; options: Array<{ value: unknown; label: string }> };
    expect(arg.message).toBe("choose a gate");
    expect(arg.options.some((o) => o.value === "option-a")).toBe(true);
    expect(arg.options.some((o) => o.value === "option-b")).toBe(true);
  });

  it("renders each group title as a non-selectable separator", async () => {
    mockSelect.mockResolvedValue("v1");
    const groups: PickGroup<string>[] = [
      { title: "Phase 10", options: [{ value: "v1", label: "a" }] },
      { title: "Phase 20", options: [{ value: "v2", label: "b" }] }
    ];
    await pick({ message: "m", groups });
    const opts = (mockSelect.mock.calls[0][0] as { options: Array<{ label: string; value: unknown }> }).options;
    // Group titles appear as separator options (label contains title, value is null)
    expect(opts.some((o) => o.label.includes("Phase 10") && o.value === null)).toBe(true);
    expect(opts.some((o) => o.label.includes("Phase 20") && o.value === null)).toBe(true);
  });

  it("throws when user cancels", async () => {
    mockSelect.mockResolvedValue(CANCEL_SYMBOL);
    await expect(
      pick({ message: "m", groups: [{ title: "t", options: [{ value: "v", label: "l" }] }] })
    ).rejects.toThrow(/cancel/i);
  });

  it("throws 'no options' when all groups are empty", async () => {
    await expect(pick({ message: "m", groups: [] })).rejects.toThrow(/no options/i);
    await expect(
      pick({ message: "m", groups: [{ title: "empty", options: [] }] })
    ).rejects.toThrow(/no options/i);
  });

  it("embeds hint text in the select message", async () => {
    mockSelect.mockResolvedValue("v");
    await pick({
      message: "choose a gate",
      groups: [{ title: "t", options: [{ value: "v", label: "l" }] }],
      hint: "use arrows + enter"
    });
    const arg = mockSelect.mock.calls[0][0] as { message: string };
    expect(arg.message).toContain("use arrows + enter");
  });
});
