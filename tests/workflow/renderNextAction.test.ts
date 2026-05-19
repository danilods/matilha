import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderNextAction } from "../../src/workflow/renderNextAction";

describe("renderNextAction", () => {
  let spy: ReturnType<typeof vi.spyOn>;
  let output = "";

  beforeEach(() => {
    output = "";
    spy = vi.spyOn(console, "log").mockImplementation((chunk?: unknown) => {
      output += `${String(chunk ?? "")}\n`;
    });
  });

  afterEach(() => {
    spy.mockRestore();
  });

  it("renders a compact recommendation block", () => {
    renderNextAction({
      id: "jira.sync.preview",
      label: "Sync pending Jira updates",
      command: "matilha jira sync --preview",
      reason: "2 pending task.completed events are waiting in the outbox.",
      risk: "remote_mutation",
      default: false,
      requiresPreview: true
    });

    expect(output).toContain("Next recommended step");
    expect(output).toContain("Sync pending Jira updates");
    expect(output).toContain("matilha jira sync --preview");
    expect(output).toContain("remote preview");
  });

  it("prints nothing when no action is available", () => {
    renderNextAction(null);

    expect(output).toBe("");
  });
});
