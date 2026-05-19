import { resolveNextAction } from "./nextAction";
import { renderNextAction } from "./renderNextAction";

export type GuideOptions = {
  guide?: boolean;
};

export function shouldRenderGuide(opts: GuideOptions = {}): boolean {
  return opts.guide ?? process.stdout.isTTY === true;
}

export function renderGuide(cwd: string, opts: GuideOptions = {}): void {
  if (!shouldRenderGuide(opts)) return;
  renderNextAction(resolveNextAction(cwd));
}
