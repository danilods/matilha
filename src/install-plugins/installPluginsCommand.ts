import { MatilhaUserError } from "../ui/errorFormat";
import { colors } from "../ui/colors";
import { renderInstallBlock, renderClaudeMdBlock } from "./renderBlock";
import { copyToClipboard } from "./copyToClipboard";
import { PRESETS, isPresetName, PRESET_NAMES, type PresetName } from "./presets";
import { ALL_SLUGS, type PackSlug } from "./packCatalog";
import { runInteractivePrompt } from "./interactivePrompt";

export type InstallPluginsOptions = {
  full?: boolean;
  coreOnly?: boolean;
  preset?: string;
  withClaudemd?: boolean;
  clipboard?: boolean; // commander --no-clipboard inverts this → false when flag given
};

/**
 * `matilha install-plugins` entry point. Dispatches to either the
 * non-interactive resolver (when a selector flag is set) or the interactive
 * @clack/prompts flow (no selector flag). Emits a paste-ready `/plugin
 * install` block to stdout and, unless `--no-clipboard`, also copies it to
 * the system clipboard.
 */
export async function installPluginsCommand(opts: InstallPluginsOptions): Promise<void> {
  assertExclusiveSelectors(opts);

  let selection: readonly PackSlug[];
  let withClaudemd = opts.withClaudemd ?? false;
  let interactive = false;

  if (opts.full) {
    selection = ALL_SLUGS;
  } else if (opts.coreOnly) {
    selection = ["matilha-skills"];
  } else if (opts.preset !== undefined) {
    if (!isPresetName(opts.preset)) {
      throw new MatilhaUserError({
        summary: `Unknown preset "${opts.preset}"`,
        context: "running 'matilha install-plugins --preset <name>'",
        problem: `Preset "${opts.preset}" is not one of the four supported names.`,
        nextActions: [
          `Pick one of: ${PRESET_NAMES.join(", ")}.`,
          "Or omit --preset to use the interactive picker."
        ]
      });
    }
    selection = PRESETS[opts.preset as PresetName];
  } else {
    // Interactive path — ignore --with-claudemd flag (prompt asks explicitly).
    const choice = await runInteractivePrompt();
    selection = choice.selection;
    withClaudemd = choice.withClaudemd;
    interactive = true;
  }

  const installBlock = renderInstallBlock(selection);
  const fullOutput = withClaudemd
    ? `${installBlock}\n\n${renderClaudeMdBlock()}`
    : installBlock;

  const c = colors();
  const clipboardEnabled = opts.clipboard !== false;

  console.log("");
  console.log(c.bold("# Paste into Claude Code:"));
  console.log("");
  console.log(installBlock);
  console.log("");

  if (withClaudemd) {
    console.log(renderClaudeMdBlock());
    console.log("");
  }

  if (clipboardEnabled) {
    const result = await copyToClipboard(fullOutput);
    if (result.copied) {
      console.log(c.dim(`(copied to clipboard via ${result.method})`));
    } else {
      console.log(c.dim("(clipboard binary not available — block printed above)"));
    }
  } else {
    console.log(c.dim("(--no-clipboard set — block printed above)"));
  }

  const packCount = selection.length;
  const packNoun = packCount === 1 ? "plugin" : "plugins";
  console.log("");
  console.log(
    c.bold("next:") +
      `  paste the block above into Claude Code to install ${packCount} ${packNoun}.`
  );
  if (!interactive) {
    console.log(c.dim("       re-run without flags for the interactive picker."));
  }
}

function assertExclusiveSelectors(opts: InstallPluginsOptions): void {
  const set = [
    opts.full ? "--full" : null,
    opts.coreOnly ? "--core-only" : null,
    opts.preset !== undefined ? "--preset" : null
  ].filter((x): x is string => x !== null);
  if (set.length > 1) {
    throw new MatilhaUserError({
      summary: "Flags are mutually exclusive",
      context: "running 'matilha install-plugins'",
      problem: `Only one of --full / --core-only / --preset may be set. Got: ${set.join(", ")}.`,
      nextActions: [
        "Pick one selection flag (--full, --core-only, or --preset <name>).",
        "Or omit all three for the interactive picker."
      ]
    });
  }
}
