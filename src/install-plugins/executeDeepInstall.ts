import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { PACK_BY_SLUG, type PackSlug } from "./packCatalog";

const execFileAsync = promisify(execFile);

export type DeepInstallStepStatus = "ok" | "already" | "failed" | "skipped";

export type DeepInstallStep = {
  pack: PackSlug;
  action: "marketplace-add" | "install";
  status: DeepInstallStepStatus;
  message?: string;
};

export type DeepInstallResult = {
  ok: boolean;
  steps: DeepInstallStep[];
};

export type DeepInstallOptions = {
  /** Absolute path to the claude CLI binary. */
  claudePath: string;
  /** If true, only log the commands that would run; don't execute. */
  dryRun?: boolean;
  /** Optional progress callback called before each command. */
  onStep?: (pack: PackSlug, action: DeepInstallStep["action"]) => void;
};

/**
 * Executes `claude plugin marketplace add` + `claude plugin install` for each
 * pack in `selection`, sequentially. No shell invocation — args are passed as
 * an array to execFile for injection safety.
 *
 * Errors are captured per-step. `claude plugin install` exits non-zero when
 * the plugin is already installed in some Claude Code versions; we detect
 * "already" patterns in stderr and mark the step as `already` rather than
 * `failed` so the overall install succeeds on re-run.
 *
 * Returns an aggregate result — overall `ok` is true when every step is
 * either `ok`, `already`, or `skipped` (no hard failures).
 */
export async function executeDeepInstall(
  selection: readonly PackSlug[],
  opts: DeepInstallOptions
): Promise<DeepInstallResult> {
  const steps: DeepInstallStep[] = [];

  for (const slug of selection) {
    const entry = PACK_BY_SLUG[slug];
    if (!entry) {
      steps.push({ pack: slug, action: "marketplace-add", status: "failed", message: `Unknown pack slug: ${slug}` });
      continue;
    }

    // Step 1: marketplace add
    opts.onStep?.(slug, "marketplace-add");
    const addStep = await runStep(
      opts,
      slug,
      "marketplace-add",
      ["plugin", "marketplace", "add", entry.marketplaceUrl]
    );
    steps.push(addStep);
    if (addStep.status === "failed") {
      steps.push({ pack: slug, action: "install", status: "skipped", message: "marketplace-add failed" });
      continue;
    }

    // Step 2: install
    opts.onStep?.(slug, "install");
    const pluginRef = `${entry.pluginName}@${entry.slug}`;
    const installStep = await runStep(
      opts,
      slug,
      "install",
      ["plugin", "install", pluginRef, "--scope", "user"]
    );
    steps.push(installStep);
  }

  const ok = steps.every((s) => s.status !== "failed");
  return { ok, steps };
}

async function runStep(
  opts: DeepInstallOptions,
  pack: PackSlug,
  action: DeepInstallStep["action"],
  args: string[]
): Promise<DeepInstallStep> {
  if (opts.dryRun) {
    return { pack, action, status: "ok", message: `dry-run: claude ${args.join(" ")}` };
  }

  try {
    const { stdout, stderr } = await execFileAsync(opts.claudePath, args, {
      encoding: "utf8",
      timeout: 120_000
    });
    const combined = `${stdout}\n${stderr}`;
    if (/already (installed|added|present)/i.test(combined)) {
      return { pack, action, status: "already" };
    }
    return { pack, action, status: "ok" };
  } catch (err) {
    const stderr = (err as { stderr?: string }).stderr ?? "";
    const message = (err as Error).message ?? String(err);
    // Some versions exit non-zero on "already installed" — treat as success.
    if (/already (installed|added|present)/i.test(stderr)) {
      return { pack, action, status: "already" };
    }
    return {
      pack,
      action,
      status: "failed",
      message: (stderr || message).trim().split("\n")[0]
    };
  }
}
