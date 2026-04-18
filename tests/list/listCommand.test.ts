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
      { slug: "methodology/10-prd", name: "Phase 10 PRD", skillPath: "skills/methodology/10-prd/SKILL.md" },
      { slug: "concepts/agentic-patterns", name: "Agentic patterns", skillPath: "skills/concepts/agentic-patterns/SKILL.md" },
      { slug: "matilha-hunt", name: "/hunt wave dispatch", skillPath: "skills/matilha-hunt/SKILL.md" }
    ]);
    await listCommand({ client, json: false });
    const out = captured.join("\n");
    expect(out).toContain("Methodology");
    expect(out).toContain("Concepts");
    expect(out).toContain("Skills");
    expect(out).toContain("methodology/10-prd");
    expect(out).toContain("concepts/agentic-patterns");
    expect(out).toContain("matilha-hunt");
    expect(out).toContain("pulled from");
  });

  it("emits counts per category in headings", async () => {
    const client = makeClient([
      { slug: "methodology/10-prd", name: "a", skillPath: "skills/methodology/10-prd/SKILL.md" },
      { slug: "methodology/20-stack", name: "b", skillPath: "skills/methodology/20-stack/SKILL.md" }
    ]);
    await listCommand({ client, json: false });
    expect(captured.join("\n")).toContain("Methodology (2)");
  });

  it("emits bookend with next action", async () => {
    const client = makeClient([{ slug: "x", name: "y", skillPath: "skills/x/SKILL.md" }]);
    await listCommand({ client, json: false });
    expect(captured.join("\n")).toContain("matilha pull <slug>");
  });

  it("--json emits structured output", async () => {
    const client = makeClient([
      { slug: "methodology/10-prd", name: "a", skillPath: "skills/methodology/10-prd/SKILL.md" },
      { slug: "matilha-hunt", name: "b", skillPath: "skills/matilha-hunt/SKILL.md" }
    ]);
    await listCommand({ client, json: true });
    const parsed = JSON.parse(captured.join(""));
    expect(parsed).toHaveProperty("categories");
    expect(parsed.count).toBe(2);
    expect(parsed.categories.Methodology).toHaveLength(1);
    expect(parsed.categories.Skills).toHaveLength(1);
  });

  it("handles empty registry with helpful message", async () => {
    const client = makeClient([]);
    await listCommand({ client, json: false });
    const out = captured.join("\n");
    expect(out).toContain("empty");
  });
});
