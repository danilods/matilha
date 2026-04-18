import type { ZodError } from "zod";
import type { MatilhaError } from "./errorFormat";

export type TranslationCtx = {
  context: string;
  file?: string;
  resource?: string;
};

function fieldPath(path: (string | number)[]): string {
  return path.map(String).join(".");
}

export function translateZodError(err: ZodError, ctx: TranslationCtx): MatilhaError {
  const first = err.issues[0];
  if (!first) {
    return {
      summary: `${ctx.file ?? "input"} failed validation`,
      context: ctx.context,
      problem: err.message || "zod reported no issue details.",
      nextActions: [
        `open ${ctx.file ?? "the file"} and compare against the template`,
        "re-run with --debug to see the raw zod error"
      ]
    };
  }
  const field = fieldPath(first.path);
  const summary =
    first.code === "invalid_type" && (first as { received?: string }).received === "undefined"
      ? `${ctx.file ?? "input"} is missing the '${field}' field`
      : `${ctx.file ?? "input"} has an invalid '${field}' field`;

  const problem = first.message
    ? `${first.message} at '${field}'.`
    : `field '${field}' did not match expected shape.`;

  return {
    summary,
    context: ctx.context,
    problem,
    nextActions: [
      `open ${ctx.file ?? "the file"} and fix the '${field}' field`,
      "see the template for the expected shape"
    ]
  };
}

export function translateFsError(
  err: NodeJS.ErrnoException,
  ctx: TranslationCtx
): MatilhaError {
  const path = err.path ?? "unknown path";
  if (err.code === "ENOENT") {
    return {
      summary: `${ctx.resource ?? "file"} not found`,
      context: ctx.context,
      problem: `the path '${path}' does not exist.`,
      nextActions: [
        `check the path is correct (the file may have been moved or deleted)`,
        ctx.resource === "plan"
          ? "run 'matilha plan <slug>' to scaffold it"
          : "create the file manually or re-run a matilha command that scaffolds it"
      ]
    };
  }
  if (err.code === "EACCES" || err.code === "EPERM") {
    return {
      summary: "permission denied",
      context: ctx.context,
      problem: `matilha cannot write to '${path}' because your user lacks permission.`,
      nextActions: [
        `check write permissions on the parent directory`,
        `if you're in a read-only filesystem, switch to a writable location`
      ]
    };
  }
  return {
    summary: "unexpected filesystem error",
    context: ctx.context,
    problem: `${err.code ?? "unknown code"} at '${path}'.`,
    nextActions: [
      "check disk space and permissions",
      "re-run with --debug to see the raw error"
    ]
  };
}

export function translateUnknownError(err: unknown, ctx: TranslationCtx): MatilhaError {
  const message = err instanceof Error ? err.message : String(err);
  return {
    summary: "matilha hit an unexpected error",
    context: ctx.context,
    problem: message,
    nextActions: [
      "re-run with --debug to see details",
      "if this persists, open an issue at github.com/danilods/matilha/issues"
    ]
  };
}
