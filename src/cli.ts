import { Command } from "commander";
import { VERSION } from "./index";
import { printBanner, MATILHA_BANNER } from "./ui/banner";
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
import { governanceRebuildCommand } from "./governance/rebuildCommand";
import { importContractCommand } from "./governance/contractSeed";
import { metricsCommand } from "./governance/metricsCommand";
import { narrativeCommand } from "./governance/narrativeCommand";
import { taskCommand } from "./governance/taskCommand";
import {
  hooksInstallCommand,
  hooksRunCommitMsgCommand,
  hooksRunPostCommitCommand
} from "./governance/hooksCommand";
import { installPluginsCommand } from "./install-plugins/installPluginsCommand";
import {
  jiraApplyCommand,
  jiraCreateCommand,
  jiraInitCommand,
  jiraPreviewCommand,
  jiraSyncCommand,
  jiraValidateCommand
} from "./jira/jiraCommand";
import { renderGuide, shouldRenderGuide } from "./workflow/guide";

const program = new Command();

program
  .name("matilha")
  .description("Agentic methodology plugin + CLI. Humans lead, agents hunt.")
  .version(VERSION, "-v, --version", "Print version and exit")
  .option("--no-guide", "hide workflow next-step recommendations")
  .option("--guide", "show workflow next-step recommendations")
  .addHelpText("beforeAll", MATILHA_BANNER);

function guideEnabled(): boolean {
  const opts = program.opts<{ guide?: boolean }>();
  return shouldRenderGuide({ guide: opts.guide });
}

function renderWorkflowGuide(): void {
  renderGuide(process.cwd(), { guide: guideEnabled() });
}

program
  .command("list")
  .description("List skills available in the Matilha registry")
  .option("--json", "output as JSON for scripting", false)
  .action(async (opts: { json: boolean }) => {
    try {
      const client = new RegistryClient();
      await listCommand({ client, json: opts.json });
      if (!opts.json) renderWorkflowGuide();
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
      renderWorkflowGuide();
    } catch (err) {
      handleCommandError(err, "running 'matilha pull'");
    }
  });

program
  .command("start")
  .alias("init")
  .description("Start or refresh Matilha control files for this project")
  .option("--dry-run", "preview writes without touching disk", false)
  .action(async (opts: { dryRun: boolean }) => {
    try {
      await initProject(process.cwd(), { dryRun: opts.dryRun });
      renderWorkflowGuide();
    } catch (err) {
      handleCommandError(err, "running 'matilha start'");
    }
  });

program
  .command("status")
  .alias("howl")
  .description("Show Matilha project state and next action")
  .option("--json", "output as JSON for scripting", false)
  .action(async (opts: { json: boolean }) => {
    try {
      await howlCommand(process.cwd(), { json: opts.json });
      if (!opts.json) renderWorkflowGuide();
    } catch (err) {
      handleCommandError(err, "running 'matilha status'");
    }
  });

program
  .command("discover")
  .alias("scout")
  .description("Discover the problem space before planning or coding")
  .action(async () => {
    try {
      await scoutCommand(process.cwd());
      renderWorkflowGuide();
    } catch (err) {
      handleCommandError(err, "running 'matilha discover'");
    }
  });

program
  .command("spec <slug>")
  .alias("plan")
  .description("Create or continue a feature spec and implementation plan")
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
      renderWorkflowGuide();
    } catch (err) {
      handleCommandError(err, "running 'matilha spec'");
    }
  });

program
  .command("approve [gateKey]")
  .alias("attest")
  .description("Approve a phase gate after validation")
  .option("--feature <slug>", "feature name if multiple artifacts")
  .option("--force", "override validation failure", false)
  .action(async (gateKey: string | undefined, opts: { feature?: string; force: boolean }) => {
    try {
      await attestCommand(process.cwd(), {
        gateKey,
        feature: opts.feature,
        force: opts.force
      });
      renderWorkflowGuide();
    } catch (err) {
      handleCommandError(err, "running 'matilha approve'");
    }
  });

program
  .command("progress")
  .alias("plan-status")
  .description("Show feature artifacts, phase gates, and progress")
  .option("--feature <slug>", "scope to one feature")
  .option("--json", "machine-readable output", false)
  .option("--all", "show all gates (no truncation)", false)
  .action(async (opts: { feature?: string; json: boolean; all: boolean }) => {
    try {
      await statusCommand(process.cwd(), { feature: opts.feature, json: opts.json, all: opts.all });
      if (!opts.json) renderWorkflowGuide();
    } catch (err) {
      handleCommandError(err, "running 'matilha progress'");
    }
  });

program
  .command("split <featureSlug>")
  .alias("hunt")
  .description("Split a plan into parallel worktree tasks")
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
      renderWorkflowGuide();
    } catch (err) {
      handleCommandError(err, "running 'matilha split'");
    }
  });

program
  .command("merge <featureSlug>")
  .alias("gather")
  .description("Merge completed worktree tasks, run regression, and update wave status")
  .option("--wave <n>", "explicit wave number", (v) => parseInt(v, 10))
  .option("--dry-run", "validate SP-DONEs + print merge plan, no mutation", false)
  .option("--cleanup", "remove worktrees + delete merged branches after success (default)", true)
  .option("--keep-worktrees", "keep SP worktrees and merged branches after success", false)
  .option("--no-events", "skip local task.completed event emission", false)
  .action(async (featureSlug: string, opts: { wave?: number; dryRun: boolean; cleanup: boolean; keepWorktrees: boolean; events: boolean }) => {
    try {
      await gatherCommand(process.cwd(), featureSlug, {
        wave: opts.wave,
        dryRun: opts.dryRun,
        cleanup: opts.keepWorktrees ? false : opts.cleanup,
        events: opts.events
      });
      renderWorkflowGuide();
    } catch (err) {
      handleCommandError(err, "running 'matilha merge'");
    }
  });

const jira = program
  .command("jira")
  .description("Optional Jira sprint integration");

jira
  .command("init")
  .description("Install the local Jira skill and example JSON contract")
  .option("--dry-run", "preview files without writing", false)
  .action(async (opts: { dryRun: boolean }) => {
    try {
      await jiraInitCommand(process.cwd(), { dryRun: opts.dryRun });
      renderWorkflowGuide();
    } catch (err) {
      handleCommandError(err, "running 'matilha jira init'");
    }
  });

jira
  .command("validate <file>")
  .description("Validate a Matilha Jira JSON task contract")
  .action(async (file: string) => {
    try {
      await jiraValidateCommand(file);
      renderWorkflowGuide();
    } catch (err) {
      handleCommandError(err, "running 'matilha jira validate'");
    }
  });

jira
  .command("preview <file>")
  .description("Preview Jira mutations from a JSON task contract")
  .action(async (file: string) => {
    try {
      await jiraPreviewCommand(file);
      renderWorkflowGuide();
    } catch (err) {
      handleCommandError(err, "running 'matilha jira preview'");
    }
  });

jira
  .command("apply <file>")
  .description("Apply a validated Jira JSON task contract after explicit approval")
  .option("--yes", "approve Jira mutations", false)
  .option("--dry-run", "preview without calling Jira", false)
  .action(async (file: string, opts: { yes: boolean; dryRun: boolean }) => {
    try {
      await jiraApplyCommand(file, { yes: opts.yes, dryRun: opts.dryRun });
      renderWorkflowGuide();
    } catch (err) {
      handleCommandError(err, "running 'matilha jira apply'");
    }
  });

jira
  .command("sync")
  .description("Sync pending Matilha completion events to Jira after explicit approval")
  .option("--preview", "preview pending Jira updates without calling Jira", false)
  .option("--yes", "approve Jira sync mutations", false)
  .action(async (opts: { preview: boolean; yes: boolean }) => {
    try {
      await jiraSyncCommand(process.cwd(), { preview: opts.preview, yes: opts.yes });
      renderWorkflowGuide();
    } catch (err) {
      handleCommandError(err, "running 'matilha jira sync'");
    }
  });

jira
  .command("create")
  .description("Create a Jira issue from a Matilha task payload")
  .requiredOption("--summary <text>", "Jira issue summary")
  .option("--description <markdown>", "Jira issue description in lightweight markdown")
  .option("--type <name>", "Jira issue type", "Task")
  .option("--points <number>", "Story points value")
  .option("--project <key>", "Jira project key (overrides JIRA_PROJECT_KEY)")
  .option("--dry-run", "print the Jira payload without calling the API", false)
  .action(async (opts: { summary: string; description?: string; type?: string; points?: string; project?: string; dryRun: boolean }) => {
    try {
      await jiraCreateCommand(opts);
      renderWorkflowGuide();
    } catch (err) {
      handleCommandError(err, "running 'matilha jira create'");
    }
  });

const hooks = jira
  .command("hooks")
  .description("Manage governance git hooks (commit-msg + post-commit)");

hooks
  .command("install")
  .description("Install matilha governance git hooks into this repository")
  .action(async () => {
    try {
      await hooksInstallCommand(process.cwd());
      renderWorkflowGuide();
    } catch (err) {
      handleCommandError(err, "running 'matilha jira hooks install'");
    }
  });

hooks
  .command("run-commit-msg <messageFile>")
  .description("(internal) invoked by the installed commit-msg git hook")
  .action((messageFile: string) => {
    hooksRunCommitMsgCommand(messageFile);
  });

hooks
  .command("run-post-commit")
  .description("(internal) invoked by the installed post-commit git hook")
  .action(async () => {
    await hooksRunPostCommitCommand(process.cwd());
  });

const governance = program
  .command("governance")
  .description("Issue-grained governance ledger operations");

governance
  .command("rebuild")
  .description("Rebuild docs/matilha/governance/state.json from the event ledger")
  .action(() => {
    try {
      governanceRebuildCommand(process.cwd());
      renderWorkflowGuide();
    } catch (err) {
      handleCommandError(err, "running 'matilha governance rebuild'");
    }
  });

governance
  .command("import-contract <file>")
  .description("Seed task.created events into the ledger from a Jira task contract")
  .action((file: string) => {
    try {
      importContractCommand(process.cwd(), file);
      renderWorkflowGuide();
    } catch (err) {
      handleCommandError(err, "running 'matilha governance import-contract'");
    }
  });

function collectRepeatable(value: string, previous: string[]): string[] {
  return [...previous, value];
}

program
  .command("metrics")
  .description("Aggregate issue-grained governance metrics from the ledger")
  .option("--json", "output as JSON for scripting", false)
  .option("--ledger <path>", "additional ledger repo root to aggregate (repeatable)", collectRepeatable, [])
  .action((opts: { json: boolean; ledger: string[] }) => {
    try {
      metricsCommand(process.cwd(), { json: opts.json, ledger: opts.ledger });
      if (!opts.json) renderWorkflowGuide();
    } catch (err) {
      handleCommandError(err, "running 'matilha metrics'");
    }
  });

program
  .command("narrative")
  .description("Generate the executive paradigm-shift narrative from the ledger")
  .option("--output <file>", "write the narrative markdown to a file instead of stdout")
  .option("--ledger <path>", "additional ledger repo root to aggregate (repeatable)", collectRepeatable, [])
  .action((opts: { output?: string; ledger: string[] }) => {
    try {
      narrativeCommand(process.cwd(), { output: opts.output, ledger: opts.ledger });
      if (!opts.output) renderWorkflowGuide();
    } catch (err) {
      handleCommandError(err, "running 'matilha narrative'");
    }
  });

const task = program
  .command("task")
  .description("Issue-grained governance time tracking");

function collectCommit(value: string, previous: string[]): string[] {
  return [...previous, value];
}

const TASK_EVENT_NAME: Record<"start" | "pause" | "resume" | "done", string> = {
  start: "task.started",
  pause: "task.paused",
  resume: "task.resumed",
  done: "task.completed"
};

for (const action of ["start", "pause", "resume", "done"] as const) {
  const cmd = task
    .command(`${action} <id>`)
    .description(`Record a ${TASK_EVENT_NAME[action]} event for an issue`);
  if (action === "pause") {
    cmd.option("--reason <text>", "why the task is paused");
  }
  if (action === "done") {
    cmd.option("--commit <sha>", "commit SHA closing the issue (repeatable)", collectCommit, []);
  }
  cmd.action((id: string, opts: { reason?: string; commit?: string[] }) => {
    try {
      taskCommand(process.cwd(), action, id, { reason: opts.reason, commit: opts.commit });
      renderWorkflowGuide();
    } catch (err) {
      handleCommandError(err, `running 'matilha task ${action}'`);
    }
  });
}

program
  .command("install")
  .alias("install-plugins")
  .description("Install Matilha skills and optional companion packs")
  .option("--full", "non-interactive: core + all 7 companion packs", false)
  .option("--core-only", "non-interactive: just matilha-skills core", false)
  .option("--preset <name>", "non-interactive: backend | ux | fullstack | security")
  .option("--with-claudemd", "also handle CLAUDE.md activation-priority snippet (emit in paste mode, merge-or-create in --deep mode)", false)
  .option("--deep", "execute `claude plugin install` for each pack instead of emitting a paste block (requires claude CLI on PATH)", false)
  .option("--target <target>", "install target: claude | codex | cursor", "claude")
  .option("--scope <scope>", "local install scope for --target codex|cursor: user | project")
  .option("--no-clipboard", "skip clipboard copy in paste mode; print to stdout only")
  .action(async (opts: { full: boolean; coreOnly: boolean; preset?: string; withClaudemd: boolean; deep: boolean; target: string; scope?: string; clipboard: boolean }) => {
    try {
      await installPluginsCommand({
        full: opts.full,
        coreOnly: opts.coreOnly,
        preset: opts.preset,
        withClaudemd: opts.withClaudemd,
        deep: opts.deep,
        target: opts.target as "claude" | "codex" | "cursor",
        scope: opts.scope as "user" | "project" | undefined,
        clipboard: opts.clipboard
      });
      renderWorkflowGuide();
    } catch (err) {
      handleCommandError(err, "running 'matilha install'");
    }
  });

if (!process.argv.slice(2).length) {
  printBanner();
  program.outputHelp();
  process.exit(0);
}

program.parse(process.argv);
