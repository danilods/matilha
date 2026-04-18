import { REGISTRY_REPO } from "../config";
import type { RegistryClient } from "../registry/registryClient";
import { printMiniBanner } from "../ui/banner";
import { colors } from "../ui/colors";

export type ListOptions = {
  client: RegistryClient;
  json?: boolean;
};

type Category = "Methodology" | "Concepts" | "Skills";

function categorize(slug: string): Category {
  if (slug.startsWith("methodology/")) return "Methodology";
  if (slug.startsWith("concepts/")) return "Concepts";
  return "Skills";
}

export async function listCommand(opts: ListOptions): Promise<void> {
  const entries = await opts.client.list();

  if (opts.json) {
    const categories: Record<Category, Array<{ slug: string; name: string }>> = {
      Methodology: [],
      Concepts: [],
      Skills: []
    };
    for (const e of entries) categories[categorize(e.slug)].push({ slug: e.slug, name: e.name });
    console.log(JSON.stringify({ count: entries.length, categories }, null, 2));
    return;
  }

  const c = colors();
  printMiniBanner("matilha list", "registry index");

  if (entries.length === 0) {
    console.log(c.dim("registry is empty (not yet populated)."));
    return;
  }

  const groups: Record<Category, Array<{ slug: string; name: string }>> = {
    Methodology: [],
    Concepts: [],
    Skills: []
  };
  for (const e of entries) groups[categorize(e.slug)].push(e);

  for (const cat of ["Methodology", "Concepts", "Skills"] as const) {
    const list = groups[cat];
    if (list.length === 0) continue;
    console.log(c.bold(`${cat} (${list.length}):`));
    for (const e of list) {
      console.log(`  ${e.slug.padEnd(40)}${c.dim(e.name)}`);
    }
    console.log("");
  }

  console.log(c.dim(`pulled from github.com/${REGISTRY_REPO}@main`));
  console.log("");
  console.log(c.bold("next:"));
  console.log(`  matilha pull <slug>   fetch resource to stdout`);
}
