import pc from "picocolors";

export type MatilhaError = {
  summary: string;
  context: string;
  problem: string;
  nextActions: string[];
  example?: string;
};

export class MatilhaUserError extends Error {
  constructor(public readonly matilhaError: MatilhaError) {
    super(matilhaError.summary);
    this.name = "MatilhaUserError";
  }
}

export function formatError(err: MatilhaError): string {
  const header = `${pc.red("error:")} ${err.summary}`;
  const body = `\n  ${err.context}\n  ${err.problem}`;
  const nextHeader = `\n\n${pc.bold("next:")}`;
  const actions = err.nextActions.map((a) => `  ${a}`).join("\n");
  const exampleBlock = err.example
    ? `\n\n${pc.bold("example:")}\n  ${err.example}`
    : "";
  return header + body + nextHeader + "\n" + actions + exampleBlock + "\n";
}

export function printError(err: MatilhaError): void {
  process.stderr.write(formatError(err));
}
