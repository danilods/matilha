import { Command } from "commander";
import { VERSION } from "./index";
import { printBanner } from "./ui/banner";
import { RegistryClient } from "./registry";
import { initProject } from "./init/initProject";
import { howlCommand } from "./howl/howlCommand";
import { scoutCommand } from "./scout/scoutCommand";
import { planCommand } from "./plan/planCommand";
import { attestCommand } from "./plan/attestCommand";
import { statusCommand } from "./plan/statusCommand";
import { handleCommandError } from "./ui/handleCommandError";
import { listCommand } from "./list/listCommand";
import { pullCommand } from "./pull/pullCommand";
import { huntCommand } from "./hunt/huntCommand";
import { gatherCommand } from "./gather/gatherCommand";
import { installPluginsCommand } from "./install-plugins/installPluginsCommand";

const program = new Command();

program
  .name("matilha")
  .description("Agentic methodology plugin + CLI. Humans lead, agents hunt.")
  .version(VERSION, "-v, --version", "Print version and exit");

program
  .command("list")
  .description("List skills available in the Matilha registry")
  .option("--json", "output as JSON for scripting", false)
  .action(async (opts: { json: boolean }) => {
    try {
      const client = new RegistryClient();
      await listCommand({ client, json: opts.json });
    } catch (err) {
      handleCommandError(err, "running 'matilha list'");
    }
  });

program
  .command("pull <slug>")
  .description("Pull a resource from the registry to stdout")
  .action(async (slug: string) => {
    try {
      const client = new RegistryClient();
      await pullCommand({ client, slug });
    } catch (err) {
      handleCommandError(err, "running 'matilha pull'");
    }
  });

program
  .command("init")
  .description("Bootstrap a Matilha project")
  .option("--dry-run", "preview writes without touching disk", false)
  .action(async (opts: { dryRun: boolean }) => {
    try {
      await initProject(process.cwd(), { dryRun: opts.dryRun });
    } catch (err) {
      handleCommandError(err, "running 'matilha init'");
    }
  });

program
  .command("howl")
  .description("Show Matilha project state and next action")
  .option("--json", "output as JSON for scripting", false)
  .action(async (opts: { json: boolean }) => {
    try {
      await howlCommand(process.cwd(), { json: opts.json });
    } catch (err) {
      handleCommandError(err, "running 'matilha howl'");
    }
  });

program
  .command("scout")
  .description("Run Phase 00 discovery — map the problem before any code")
  .action(async () => {
    try {
      await scoutCommand(process.cwd());
    } catch (err) {
      handleCommandError(err, "running 'matilha scout'");
    }
  });

program
  .command("plan <slug>")
  .description("Scaffold spec+plan for a feature (Phases 10-30)")
  .option("--import-research <file>", "import a deep-research markdown as Section 1 context")
  .option("--archetype <archetype>", "override archetype from project-status")
  .option("--dry-run", "preview writes without touching disk", false)
  .option("--force", "overwrite existing spec", false)
  .action(async (slug: string, opts: { importResearch?: string; archetype?: string; dryRun: boolean; force: boolean }) => {
    try {
      await planCommand(process.cwd(), slug, {
        importResearchPath: opts.importResearch,
        archetype: opts.archetype,
        dryRun: opts.dryRun,
        force: opts.force
      });
    } catch (err) {
      handleCommandError(err, "running 'matilha plan'");
    }
  });

program
  .command("attest [gateKey]")
  .description("Attest a phase gate (interactive if gateKey omitted)")
  .option("--feature <slug>", "feature name if multiple artifacts")
  .option("--force", "override validation failure", false)
  .action(async (gateKey: string | undefined, opts: { feature?: string; force: boolean }) => {
    try {
      await attestCommand(process.cwd(), {
        gateKey,
        feature: opts.feature,
        force: opts.force
      });
    } catch (err) {
      handleCommandError(err, "running 'matilha attest'");
    }
  });

program
  .command("plan-status")
  .description("Show feature artifacts + phase gates state")
  .option("--feature <slug>", "scope to one feature")
  .option("--json", "machine-readable output", false)
  .option("--all", "show all gates (no truncation)", false)
  .action(async (opts: { feature?: string; json: boolean; all: boolean }) => {
    try {
      await statusCommand(process.cwd(), { feature: opts.feature, json: opts.json, all: opts.all });
    } catch (err) {
      handleCommandError(err, "running 'matilha plan-status'");
    }
  });

program
  .command("hunt <featureSlug>")
  .description("Phase 40 — decompose plan into waves, create worktrees, dispatch parallel")
  .option("--wave <n>", "explicit wave number", (v) => parseInt(v, 10))
  .option("--dry-run", "preview without touching git", false)
  .option("--force", "re-dispatch wave (destructive)", false)
  .option("--allow-overlap", "bypass disjunction validation", false)
  .action(async (featureSlug: string, opts: { wave?: number; dryRun: boolean; force: boolean; allowOverlap: boolean }) => {
    try {
      await huntCommand(process.cwd(), featureSlug, {
        wave: opts.wave,
        dryRun: opts.dryRun,
        force: opts.force,
        allowOverlap: opts.allowOverlap
      });
    } catch (err) {
      handleCommandError(err, "running 'matilha hunt'");
    }
  });

program
  .command("gather <featureSlug>")
  .description("Phase 40 — merge completed SPs in wave order, run regression, update wave-status")
  .option("--wave <n>", "explicit wave number", (v) => parseInt(v, 10))
  .option("--dry-run", "validate SP-DONEs + print merge plan, no mutation", false)
  .option("--cleanup", "remove worktrees + delete merged branches after success", false)
  .action(async (featureSlug: string, opts: { wave?: number; dryRun: boolean; cleanup: boolean }) => {
    try {
      await gatherCommand(process.cwd(), featureSlug, {
        wave: opts.wave,
        dryRun: opts.dryRun,
        cleanup: opts.cleanup
      });
    } catch (err) {
      handleCommandError(err, "running 'matilha gather'");
    }
  });

program
  .command("install-plugins")
  .description("Install the matilha ecosystem (interactive by default; paste-block or --deep direct install)")
  .option("--full", "non-interactive: core + all 7 companion packs", false)
  .option("--core-only", "non-interactive: just matilha-skills core", false)
  .option("--preset <name>", "non-interactive: backend | ux | fullstack | security")
  .option("--with-claudemd", "also handle CLAUDE.md activation-priority snippet (emit in paste mode, merge-or-create in --deep mode)", false)
  .option("--deep", "execute `claude plugin install` for each pack instead of emitting a paste block (requires claude CLI on PATH)", false)
  .option("--no-clipboard", "skip clipboard copy in paste mode; print to stdout only")
  .action(async (opts: { full: boolean; coreOnly: boolean; preset?: string; withClaudemd: boolean; deep: boolean; clipboard: boolean }) => {
    try {
      await installPluginsCommand({
        full: opts.full,
        coreOnly: opts.coreOnly,
        preset: opts.preset,
        withClaudemd: opts.withClaudemd,
        deep: opts.deep,
        clipboard: opts.clipboard
      });
    } catch (err) {
      handleCommandError(err, "running 'matilha install-plugins'");
    }
  });

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  printBanner();
  program.outputHelp();
}
