import { MatilhaUserError, printError } from "./errorFormat";
import { translateUnknownError } from "./errorTranslator";

export function handleCommandError(err: unknown, context: string): void {
  if (err instanceof MatilhaUserError) {
    printError(err.matilhaError);
  } else {
    const me = translateUnknownError(err, { context });
    printError(me);
  }
  process.exitCode = 1;
}
