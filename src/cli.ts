import { Command } from "commander";
import { VERSION } from "./index";
import { printBanner } from "./ui/banner";
import { RegistryClient } from "./registry";
import { initProject, printInitReport } from "./init/initProject";
import { howlCommand } from "./howl/howlCommand";
import { scoutCommand } from "./scout/scoutCommand";
import { planCommand } from "./plan/planCommand";
import { attestCommand } from "./plan/attestCommand";
import { statusCommand } from "./plan/statusCommand";
import { handleCommandError } from "./ui/handleCommandError";
import { listCommand } from "./list/listCommand";
import { pullCommand } from "./pull/pullCommand";

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
    const result = await initProject(process.cwd(), { dryRun: opts.dryRun });
    printInitReport(result);
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
      console.error(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
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
  .command("attest <gateKey>")
  .description("Attest a phase gate after the corresponding spec section is filled")
  .option("--feature <slug>", "feature name if multiple artifacts")
  .option("--force", "override validation failure", false)
  .action(async (gateKey: string, opts: { feature?: string; force: boolean }) => {
    try {
      await attestCommand(process.cwd(), gateKey, { feature: opts.feature, force: opts.force });
    } catch (err) {
      console.error(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

program
  .command("plan-status")
  .description("Show feature artifacts + phase gates state")
  .option("--feature <slug>", "scope to one feature")
  .option("--json", "machine-readable output", false)
  .action(async (opts: { feature?: string; json: boolean }) => {
    try {
      await statusCommand(process.cwd(), { feature: opts.feature, json: opts.json });
    } catch (err) {
      console.error(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  printBanner();
  program.outputHelp();
}
