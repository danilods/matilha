import { PACK_BY_SLUG, type PackSlug } from "./packCatalog";
import { CLAUDE_MD_SNIPPET } from "./claudeMdSnippet";

/**
 * Render the `/plugin install` block for a pack selection.
 *
 * Output shape (2 lines per pack, blank line between packs — spec §4.2):
 *
 *   /plugin marketplace add danilods/<pack-slug>
 *   /plugin install <plugin-name>@<pack-slug> --user
 *
 *   /plugin marketplace add danilods/<next-pack-slug>
 *   /plugin install <next-plugin-name>@<next-pack-slug> --user
 *
 * The separator is a single blank line between pack pairs; no trailing
 * newline after the last line (consumers can append freely).
 */
export function renderInstallBlock(selection: readonly PackSlug[]): string {
  if (selection.length === 0) {
    return "";
  }
  const blocks = selection.map((slug) => {
    const entry = PACK_BY_SLUG[slug];
    if (!entry) {
      throw new Error(`Unknown pack slug: ${slug}`);
    }
    return [
      `/plugin marketplace add ${entry.marketplaceUrl}`,
      `/plugin install ${entry.pluginName}@${entry.slug} --user`
    ].join("\n");
  });
  return blocks.join("\n\n");
}

/**
 * Render the CLAUDE.md snippet section emitted when `--with-claudemd` is set.
 * Includes paste instructions so the user understands where to put it.
 *
 * Format matches spec §4.2 "Optional: bootstrap CLAUDE.md" region.
 */
export function renderClaudeMdBlock(): string {
  const header = [
    "# Optional: bootstrap CLAUDE.md",
    "Create or merge the following into your project's CLAUDE.md",
    "(between matilha-start/end markers — idempotent):",
    "",
    ""
  ].join("\n");
  return `${header}${CLAUDE_MD_SNIPPET}`;
}
