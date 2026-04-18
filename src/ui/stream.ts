import type pc from "picocolors";
import { colors } from "./colors";

export type StepStatus = "ok" | "warn" | "fail" | "skip" | "dry-run";

export interface StepHandle {
  ok(detail?: string): void;
  warn(detail?: string): void;
  fail(detail?: string): void;
  skip(detail?: string): void;
  dryRun(detail?: string): void;
}

export interface Stream {
  intro(command: string, context: string): void;
  section(title: string): void;
  step(label: string): StepHandle;
  footer(content: string): void;
}

const STATUS_LABELS: Record<StepStatus, string> = {
  ok: "ok",
  warn: "warn",
  fail: "fail",
  skip: "skip",
  "dry-run": "dry-run"
};

const LABEL_COLUMN = 28;

function writeLine(content: string): void {
  process.stdout.write(content + "\n");
}

function statusColor(c: typeof pc, status: StepStatus): (s: string) => string {
  switch (status) {
    case "ok":
      return c.green;
    case "warn":
      return c.yellow;
    case "fail":
      return c.red;
    case "skip":
      return c.dim;
    case "dry-run":
      return c.cyan;
  }
}

function writeStep(label: string, status: StepStatus, detail?: string): void {
  const c = colors();
  const pad = Math.max(1, LABEL_COLUMN - label.length);
  const statusText = statusColor(c, status)(STATUS_LABELS[status]);
  const detailText = detail !== undefined ? c.dim(` ${detail}`) : "";
  writeLine(`  ${label}${" ".repeat(pad)}${statusText}${detailText}`);
}

export function createStream(): Stream {
  return {
    intro(command, context) {
      const c = colors();
      writeLine("");
      writeLine(c.bold(c.cyan(command)) + c.dim(` — ${context}`));
      writeLine("");
    },
    section(title) {
      writeLine("");
      writeLine(title);
    },
    step(label) {
      return {
        ok: (detail) => writeStep(label, "ok", detail),
        warn: (detail) => writeStep(label, "warn", detail),
        fail: (detail) => writeStep(label, "fail", detail),
        skip: (detail) => writeStep(label, "skip", detail),
        dryRun: (detail) => writeStep(label, "dry-run", detail)
      };
    },
    footer(content) {
      writeLine("");
      writeLine(content);
      writeLine("");
    }
  };
}
