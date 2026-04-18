import { colors } from "./colors";

export type GateValue = "yes" | "no" | "pending";

const LABELS: Record<GateValue, string> = {
  yes: "yes",
  no: "no",
  pending: "pending"
};

const MAX_LABEL_WIDTH = Math.max(
  ...Object.values(LABELS).map((l) => l.length + 2) // +2 for brackets
);

export function renderGate(name: string, value: GateValue): string {
  const c = colors();
  const raw = `[${LABELS[value]}]`;
  const colorFn = value === "yes" ? c.green : value === "no" ? c.red : c.yellow;
  const colored = colorFn(raw);
  const pad = " ".repeat(MAX_LABEL_WIDTH - raw.length);
  return `  ${colored}${pad}  ${name}`;
}
