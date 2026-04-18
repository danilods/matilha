import pc from "picocolors";
import { REGISTRY_REPO } from "../config";
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
    process.stderr.write(pc.dim(`fetched ${opts.slug} (${humanSize(content.length)})\n`));
  } catch (err) {
    throw new MatilhaUserError({
      summary: "resource not found in registry",
      context: `matilha pull was looking for '${opts.slug}' in github.com/${REGISTRY_REPO}`,
      problem: `the slug doesn't match any file in the registry (or the registry is unreachable).`,
      nextActions: [
        "run 'matilha list' to see available slugs",
        "check your network connection if the registry seems unreachable"
      ],
      example: "matilha pull methodology/10-prd"
    });
  }
}
