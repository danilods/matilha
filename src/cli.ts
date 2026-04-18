import { Command } from "commander";
import { VERSION } from "./index";
import { printBanner } from "./ui/banner";
import { RegistryClient } from "./registry";
import { initProject, printInitReport } from "./init/initProject";
import { howlCommand } from "./howl/howlCommand";
import { scoutCommand } from "./scout/scoutCommand";
import { planCommand } from "./plan/planCommand";

const program = new Command();

program
  .name("matilha")
  .description("Agentic methodology plugin + CLI. Humans lead, agents hunt.")
  .version(VERSION, "-v, --version", "Print version and exit");

program
  .command("list")
  .description("List skills available in the Matilha registry")
  .action(async () => {
    printBanner();
    const client = new RegistryClient();
    try {
      const entries = await client.list();
      if (entries.length === 0) {
        console.log("Registry is empty (not yet populated).");
        return;
      }
      console.log("Available skills:\n");
      for (const e of entries) {
        console.log(`  ${e.slug.padEnd(30)}${e.name}`);
      }
    } catch (err) {
      console.error(`Failed to fetch registry: ${(err as Error).message}`);
      process.exitCode = 1;
    }
  });

program
  .command("pull <slug>")
  .description("Pull a skill from the registry (print to stdout in Wave 1)")
  .action(async (slug: string) => {
    const client = new RegistryClient();
    try {
      const content = await client.pull(slug);
      console.log(content);
    } catch (err) {
      console.error(`Failed to pull ${slug}: ${(err as Error).message}`);
      process.exitCode = 1;
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
      console.error(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
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
      console.error(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  printBanner();
  program.outputHelp();
}
