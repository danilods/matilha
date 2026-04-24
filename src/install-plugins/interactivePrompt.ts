import {
  intro,
  outro,
  select,
  multiselect,
  confirm,
  isCancel,
  cancel
} from "@clack/prompts";
import { COMPANION_SLUGS, PACK_BY_SLUG } from "./packCatalog";
import type { PackSlug } from "./packCatalog";
import { PRESETS, type PresetName } from "./presets";

export type InstallChoice = {
  selection: readonly PackSlug[];
  withClaudemd: boolean;
};

type PresetChoice = PresetName | "core-only" | "custom";

/**
 * Interactive @clack/prompts flow for `matilha install-plugins` with no flags.
 *
 * Flow:
 *   1. Preset picker (backend / ux / fullstack / security / core-only / custom).
 *   2. If custom → multiselect across companion packs; core always included.
 *   3. Confirm whether to also emit the CLAUDE.md snippet.
 */
export async function runInteractivePrompt(): Promise<InstallChoice> {
  intro("matilha install-plugins");

  const presetChoice = await select<PresetChoice>({
    message: "Which matilha packs do you want to install?",
    options: [
      { value: "backend", label: "Backend", hint: "core + harness + sysdesign + software-eng + software-arch + security" },
      { value: "ux", label: "UX / Product", hint: "core + ux + growth + software-eng" },
      { value: "fullstack", label: "Full-stack", hint: "core + all 7 packs (everything)" },
      { value: "security", label: "Security-focused", hint: "core + security + software-arch + harness" },
      { value: "core-only", label: "Core only", hint: "just matilha-skills" },
      { value: "custom", label: "Custom selection", hint: "pick individual packs" }
    ]
  });
  if (isCancel(presetChoice)) {
    cancel("Cancelled.");
    process.exit(0);
  }

  let selection: readonly PackSlug[];
  if (presetChoice === "custom") {
    const picked = await multiselect<PackSlug>({
      message: "Which companion packs? (matilha-skills core is always included)",
      options: COMPANION_SLUGS.map((slug) => {
        const entry = PACK_BY_SLUG[slug];
        return {
          value: slug,
          label: `${entry.title}  (${entry.skillCount} skills)`,
          hint: entry.description
        };
      }),
      required: false
    });
    if (isCancel(picked)) {
      cancel("Cancelled.");
      process.exit(0);
    }
    selection = ["matilha-skills", ...(picked as PackSlug[])];
  } else if (presetChoice === "core-only") {
    selection = ["matilha-skills"];
  } else {
    selection = PRESETS[presetChoice];
  }

  const withClaudemd = await confirm({
    message: "Also emit the CLAUDE.md activation-priority snippet? (recommended on new projects)",
    initialValue: true
  });
  if (isCancel(withClaudemd)) {
    cancel("Cancelled.");
    process.exit(0);
  }

  outro(`Selected ${selection.length} plugin${selection.length === 1 ? "" : "s"}.`);

  return { selection, withClaudemd: withClaudemd as boolean };
}
