import { describe, it, expect } from "vitest";
import { executeDeepInstall } from "../../src/install-plugins/executeDeepInstall";
import { ALL_SLUGS } from "../../src/install-plugins/packCatalog";

describe("executeDeepInstall — dry run", () => {
  it("emits one marketplace-add + one install step per pack", async () => {
    const calls: Array<{ pack: string; action: string }> = [];

    const result = await executeDeepInstall(ALL_SLUGS, {
      claudePath: "/does/not/matter",
      dryRun: true,
      onStep: (pack, action) => calls.push({ pack, action })
    });

    expect(result.ok).toBe(true);
    expect(result.steps.length).toBe(ALL_SLUGS.length * 2);
    for (const slug of ALL_SLUGS) {
      const packSteps = result.steps.filter((s) => s.pack === slug);
      expect(packSteps.map((s) => s.action)).toEqual(["marketplace-add", "install"]);
      expect(packSteps.every((s) => s.status === "ok")).toBe(true);
    }
    expect(calls.length).toBe(ALL_SLUGS.length * 2);
  });

  it("dry-run step message includes the claude args that would run", async () => {
    const result = await executeDeepInstall(["matilha-skills"], {
      claudePath: "/ignored",
      dryRun: true
    });

    const addStep = result.steps.find((s) => s.action === "marketplace-add");
    const installStep = result.steps.find((s) => s.action === "install");

    expect(addStep?.message).toContain("marketplace add danilods/matilha-skills");
    expect(installStep?.message).toContain("plugin install matilha@matilha-skills");
    expect(installStep?.message).toContain("--scope user");
  });

  it("handles a single-pack selection (core only)", async () => {
    const result = await executeDeepInstall(["matilha-skills"], {
      claudePath: "/ignored",
      dryRun: true
    });

    expect(result.steps.length).toBe(2);
    expect(result.steps.every((s) => s.pack === "matilha-skills")).toBe(true);
  });

  it("preserves pack order in the steps array", async () => {
    const order = ["matilha-skills", "matilha-ux-pack", "matilha-harness-pack"] as const;

    const result = await executeDeepInstall(order, {
      claudePath: "/ignored",
      dryRun: true
    });

    const packs = result.steps.map((s) => s.pack);
    expect(packs).toEqual([
      "matilha-skills", "matilha-skills",
      "matilha-ux-pack", "matilha-ux-pack",
      "matilha-harness-pack", "matilha-harness-pack"
    ]);
  });
});
