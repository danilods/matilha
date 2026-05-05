import { colors } from "./colors";

export const MATILHA_BANNER = `

matilha
                 _   _ _ _
 _ __ ___   __ _| |_(_) | |__   __ _
| '_ \` _ \\ / _\` | __| | | '_ \\ / _\` |
| | | | | | (_| | |_| | | | | | (_| |
|_| |_| |_|\\__,_|\\__|_|_|_| |_|\\__,_|

You lead. Agents hunt.

`;

export function printBanner(): void {
  console.log(MATILHA_BANNER);
}

export function printMiniBanner(command: string, context: string): void {
  const c = colors();
  console.log("");
  console.log(c.bold(c.cyan(command)) + c.dim(` — ${context}`));
  console.log("");
}
