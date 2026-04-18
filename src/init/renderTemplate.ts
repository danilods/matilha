export type TemplateVars = Record<string, string>;

/**
 * Simple {{var}} substitution. No loops, no conditionals.
 * Throws on missing var so misuse fails loud at render time.
 */
export function renderTemplate(source: string, vars: TemplateVars): string {
  return source.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    const value = vars[key];
    if (value === undefined) {
      throw new Error(`Missing template var: ${key}`);
    }
    return value;
  });
}
