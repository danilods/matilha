import type { PackSlug } from "./packCatalog";

/**
 * Preset pack bundles per Wave 5g spec §4.2. Each preset always includes
 * `matilha-skills` (core) — users cannot opt out of core via a preset.
 *
 * Byte-identical to `/matilha-install` (SP-C) definitions so both surfaces
 * emit the same `/plugin install` block for the same preset name.
 */

export type PresetName = "backend" | "ux" | "fullstack" | "security";

export const PRESETS: Record<PresetName, readonly PackSlug[]> = {
  backend: [
    "matilha-skills",
    "matilha-harness-pack",
    "matilha-sysdesign-pack",
    "matilha-software-eng-pack",
    "matilha-software-arch-pack",
    "matilha-security-pack"
  ],
  ux: [
    "matilha-skills",
    "matilha-ux-pack",
    "matilha-growth-pack",
    "matilha-software-eng-pack"
  ],
  fullstack: [
    "matilha-skills",
    "matilha-ux-pack",
    "matilha-growth-pack",
    "matilha-harness-pack",
    "matilha-sysdesign-pack",
    "matilha-software-eng-pack",
    "matilha-software-arch-pack",
    "matilha-security-pack"
  ],
  security: [
    "matilha-skills",
    "matilha-security-pack",
    "matilha-software-arch-pack",
    "matilha-harness-pack"
  ]
};

export const PRESET_NAMES: readonly PresetName[] = [
  "backend",
  "ux",
  "fullstack",
  "security"
];

export function isPresetName(value: string): value is PresetName {
  return (PRESET_NAMES as readonly string[]).includes(value);
}
