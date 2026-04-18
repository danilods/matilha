import { REGISTRY_REPO } from "../config";
import { colors } from "../ui/colors";
import { MatilhaUserError } from "../ui/errorFormat";
import type { RegistryClient } from "../registry/registryClient";

export type PullOptions = {
  client: RegistryClient;
  slug: string;
};

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

export async function pullCommand(opts: PullOptions): Promise<void> {
  try {
    const content = await opts.client.pull(opts.slug);
    process.stdout.write(content);
    if (!content.endsWith("\n")) process.stdout.write("\n");
    process.stderr.write(colors().dim(`fetched ${opts.slug} (${humanSize(content.length)})\n`));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);

    if (/invalid slug format/i.test(msg)) {
      throw new MatilhaUserError({
        summary: "invalid slug format",
        context: `matilha pull received '${opts.slug}'`,
        problem: "slugs must be lowercase letters, digits, hyphens, underscores; forward-slashes are allowed for scoped paths (e.g. 'methodology/10-prd').",
        nextActions: [
          "check the slug spelling and case — registry slugs are lowercase",
          "run 'matilha list' to copy a valid slug"
        ],
        example: "matilha pull methodology/10-prd"
      });
    }

    if (/not found/i.test(msg) || /\b404\b/.test(msg)) {
      throw new MatilhaUserError({
        summary: "resource not found in registry",
        context: `matilha pull was looking for '${opts.slug}' in github.com/${REGISTRY_REPO}`,
        problem: "the slug doesn't match any file in the registry.",
        nextActions: [
          "run 'matilha list' to see available slugs",
          "check the slug spelling"
        ],
        example: "matilha pull methodology/10-prd"
      });
    }

    throw new MatilhaUserError({
      summary: "registry unreachable",
      context: `matilha pull was trying to fetch '${opts.slug}' from github.com/${REGISTRY_REPO}`,
      problem: `the registry couldn't be reached: ${msg}`,
      nextActions: [
        "check your network connection",
        "verify github.com is reachable",
        "retry in a moment — the registry host may be temporarily down"
      ]
    });
  }
}
