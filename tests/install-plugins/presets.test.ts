import { describe, it, expect } from "vitest";
import { PRESETS, PRESET_NAMES, isPresetName } from "../../src/install-plugins/presets";
import { ALL_SLUGS } from "../../src/install-plugins/packCatalog";

describe("PRESETS", () => {
  it("defines exactly the four spec presets (backend, ux, fullstack, security)", () => {
    expect(Object.keys(PRESETS).sort()).toEqual(["backend", "fullstack", "security", "ux"]);
    expect([...PRESET_NAMES].sort()).toEqual(["backend", "fullstack", "security", "ux"]);
  });

  it("every preset includes matilha-skills (core)", () => {
    for (const name of PRESET_NAMES) {
      expect(PRESETS[name]).toContain("matilha-skills");
    }
  });

  it("every slug in every preset is a known pack", () => {
    const known = new Set(ALL_SLUGS);
    for (const name of PRESET_NAMES) {
      for (const slug of PRESETS[name]) {
        expect(known.has(slug)).toBe(true);
      }
    }
  });

  it("fullstack preset covers all 8 slugs (core + 7 packs)", () => {
    expect(PRESETS.fullstack).toHaveLength(8);
    expect([...PRESETS.fullstack].sort()).toEqual([...ALL_SLUGS].sort());
  });

  it("isPresetName narrows only for valid names", () => {
    expect(isPresetName("backend")).toBe(true);
    expect(isPresetName("fullstack")).toBe(true);
    expect(isPresetName("bogus")).toBe(false);
    expect(isPresetName("")).toBe(false);
  });
});
