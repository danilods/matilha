import { MatilhaUserError } from "../ui/errorFormat";
import { colors } from "../ui/colors";
import { renderInstallBlock, renderClaudeMdBlock } from "./renderBlock";
import { copyToClipboard } from "./copyToClipboard";
import { PRESETS, isPresetName, PRESET_NAMES, type PresetName } from "./presets";
import { ALL_SLUGS, PACK_BY_SLUG, type PackSlug } from "./packCatalog";
import { runInteractivePrompt } from "./interactivePrompt";
import { detectClaudeCli } from "./detectClaudeCli";
import { executeDeepInstall, type DeepInstallResult } from "./executeDeepInstall";
import { writeClaudeMd } from "./writeClaudeMd";

export type InstallPluginsOptions = {
  full?: boolean;
  coreOnly?: boolean;
  preset?: string;
  withClaudemd?: boolean;
  clipboard?: boolean; // commander --no-clipboard inverts this → false when flag given
  deep?: boolean; // SP-E: actually install via `claude plugin install` instead of emitting paste block
};

/**
 * `matilha install-plugins` entry point.
 *
 * Default (paste-block) mode: emits `/plugin install` lines to stdout and
 * copies them to the clipboard for the user to paste into Claude Code.
 *
 * Deep mode (`--deep`): detects `claude` CLI on PATH and runs
 * `claude plugin marketplace add` + `claude plugin install` for each selected
 * pack. Zero paste. Falls back to paste-block mode automatically if the CLI
 * is absent. When combined with `--with-claudemd`, writes the snippet to the
 * project's CLAUDE.md via merge-or-create (Wave 5g SP-B contract).
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

  if (opts.deep) {
    await runDeepMode(selection, withClaudemd);
    return;
  }

  await runPasteBlockMode(selection, withClaudemd, opts.clipboard !== false, interactive);
}

async function runDeepMode(
  selection: readonly PackSlug[],
  withClaudemd: boolean
): Promise<void> {
  const c = colors();
  const cli = detectClaudeCli();

  if (!cli.available) {
    console.log(c.yellow("⚠ --deep set but `claude` CLI not found on PATH."));
    console.log(c.dim("   Falling back to paste-block mode. Install Claude Code CLI and re-run --deep, or paste manually."));
    console.log("");
    await runPasteBlockMode(selection, withClaudemd, /* clipboard */ true, /* interactive */ false);
    return;
  }

  console.log(c.dim(`(using claude CLI at ${cli.path})`));
  console.log("");
  console.log(c.bold(`# Installing ${selection.length} ${selection.length === 1 ? "plugin" : "plugins"} via claude plugin install`));
  console.log("");

  const result = await executeDeepInstall(selection, {
    claudePath: cli.path!,
    onStep: (pack, action) => {
      const entry = PACK_BY_SLUG[pack];
      const label = action === "marketplace-add" ? "marketplace add" : "install";
      console.log(c.dim(`  → ${label} ${entry.title}...`));
    }
  });

  console.log("");
  printDeepSummary(result);

  if (withClaudemd) {
    try {
      const write = writeClaudeMd({ cwd: process.cwd() });
      console.log("");
      console.log(c.green(`✓ CLAUDE.md ${write.action} at ${write.path}`));
    } catch (err) {
      console.log("");
      console.log(c.yellow(`⚠ CLAUDE.md write failed: ${(err as Error).message}`));
      console.log(c.dim("   You can merge docs/matilha/templates/claude-matilha-snippet.md manually."));
    }
  }

  console.log("");
  if (result.ok) {
    console.log(c.bold("next:") + "  open Claude Code and run `/reload-plugins` to activate — or just start a new session.");
  } else {
    console.log(c.yellow("⚠ Some steps failed. Review summary above and re-run --deep to retry (idempotent)."));
  }
}

function printDeepSummary(result: DeepInstallResult): void {
  const c = colors();
  const packs = new Set(result.steps.map((s) => s.pack));
  const lines: string[] = [];

  for (const pack of packs) {
    const steps = result.steps.filter((s) => s.pack === pack);
    const entry = PACK_BY_SLUG[pack];
    const worstStatus = steps.some((s) => s.status === "failed")
      ? "failed"
      : steps.some((s) => s.status === "already")
        ? "already"
        : "ok";
    const icon = worstStatus === "failed" ? c.red("✗") : worstStatus === "already" ? c.dim("·") : c.green("✓");
    const suffix = worstStatus === "already" ? c.dim(" (already installed)") : "";
    const errLine = steps.find((s) => s.status === "failed")?.message;
    lines.push(`  ${icon} ${entry.title}${suffix}`);
    if (errLine) {
      lines.push(`    ${c.red(errLine)}`);
    }
  }

  console.log(c.bold("Summary:"));
  for (const line of lines) {
    console.log(line);
  }
}

async function runPasteBlockMode(
  selection: readonly PackSlug[],
  withClaudemd: boolean,
  clipboardEnabled: boolean,
  interactive: boolean
): Promise<void> {
  const installBlock = renderInstallBlock(selection);
  const fullOutput = withClaudemd
    ? `${installBlock}\n\n${renderClaudeMdBlock()}`
    : installBlock;

  const c = colors();

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
    console.log(c.dim("       or add --deep to run `claude plugin install` automatically (requires claude CLI)."));
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
