import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { listCommand } from "../../src/list/listCommand";
import type { RegistryClient, RegistryEntry } from "../../src/registry/registryClient";

describe("listCommand", () => {
  let captured: string[];
  let spy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    captured = [];
    spy = vi.spyOn(console, "log").mockImplementation((m: unknown) => { captured.push(String(m)); });
  });
  afterEach(() => spy.mockRestore());

  const makeClient = (entries: RegistryEntry[]): RegistryClient => ({
    list: vi.fn().mockResolvedValue(entries),
    pull: vi.fn(),
    pullTemplate: vi.fn(),
    pullRaw: vi.fn(),
    pullCompanions: vi.fn()
  } as unknown as RegistryClient);

  it("groups entries by category (methodology/concepts/skills)", async () => {
    const client = makeClient([
      { slug: "methodology/10-prd", name: "Phase 10 PRD" },
      { slug: "concepts/agentic-patterns", name: "Agentic patterns" },
      { slug: "matilha-hunt", name: "/hunt wave dispatch" }
    ]);
    await listCommand({ client, json: false });
    const out = captured.join("\n");
    expect(out).toContain("Methodology");
    expect(out).toContain("Concepts");
    expect(out).toContain("Skills");
    expect(out).toContain("methodology/10-prd");
    expect(out).toContain("concepts/agentic-patterns");
    expect(out).toContain("matilha-hunt");
  });

  it("emits counts per category in headings", async () => {
    const client = makeClient([
      { slug: "methodology/10-prd", name: "a" },
      { slug: "methodology/20-stack", name: "b" }
    ]);
    await listCommand({ client, json: false });
    expect(captured.join("\n")).toContain("Methodology (2)");
  });

  it("emits bookend with next action", async () => {
    const client = makeClient([{ slug: "x", name: "y" }]);
    await listCommand({ client, json: false });
    expect(captured.join("\n")).toContain("matilha pull");
  });

  it("--json emits structured output", async () => {
    const client = makeClient([
      { slug: "methodology/10-prd", name: "a" },
      { slug: "matilha-hunt", name: "b" }
    ]);
    await listCommand({ client, json: true });
    const parsed = JSON.parse(captured.join(""));
    expect(parsed).toHaveProperty("categories");
    expect(parsed.count).toBe(2);
  });

  it("handles empty registry with helpful message", async () => {
    const client = makeClient([]);
    await listCommand({ client, json: false });
    const out = captured.join("\n");
    expect(out).toContain("empty");
  });
});
