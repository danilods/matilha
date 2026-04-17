import { Command } from "commander";
import { VERSION } from "./index";
import { printBanner } from "./ui/banner";
import { RegistryClient } from "./registry";

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
  .description("Bootstrap a Matilha project (full implementation in Wave 2)")
  .action(() => {
    printBanner();
    console.log("`matilha init` scaffolding comes in Wave 2.");
    console.log("For now, use the plugin installed via marketplace and run /scout.");
  });

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  printBanner();
  program.outputHelp();
}
