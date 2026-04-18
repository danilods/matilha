import { intro, outro, select, text, confirm, isCancel, cancel } from "@clack/prompts";
import type { Tool } from "./detectTools";
import { hasFrontend, type Archetype, type AestheticDirection } from "./archetypeContent";

export type InitInputs = {
  projectName: string;
  archetype: Archetype;
  aestheticDirection?: AestheticDirection;
  overwriteExisting: boolean;
};

export async function askInputs(detected: readonly Tool[], existing: boolean): Promise<InitInputs> {
  intro("matilha init");

  console.log(`Detected tools: ${detected.length > 0 ? detected.join(", ") : "none"}`);

  let overwriteExisting = false;
  if (existing) {
    const answer = await confirm({
      message: "project-status.md already exists. Overwrite?",
      initialValue: false
    });
    if (isCancel(answer)) {
      cancel("Cancelled.");
      process.exit(0);
    }
    overwriteExisting = answer as boolean;
    if (!overwriteExisting) {
      cancel("Aborted — not overwriting existing project-status.md.");
      process.exit(0);
    }
  }

  const projectName = await text({
    message: "Project name?",
    placeholder: "my-project",
    validate: (v: string) => (v.trim().length > 0 ? undefined : "Name required")
  });
  if (isCancel(projectName)) {
    cancel("Cancelled.");
    process.exit(0);
  }

  const archetype = await select({
    message: "Archetype?",
    options: [
      { value: "saas-b2b" as Archetype, label: "SaaS B2B" },
      { value: "saas-b2c" as Archetype, label: "SaaS B2C" },
      { value: "frontend-only" as Archetype, label: "Frontend-only" },
      { value: "cli" as Archetype, label: "CLI tool" },
      { value: "library" as Archetype, label: "Library" },
      { value: "ml-service" as Archetype, label: "ML service" },
      { value: "marketplace" as Archetype, label: "Marketplace" }
    ]
  });
  if (isCancel(archetype)) {
    cancel("Cancelled.");
    process.exit(0);
  }

  let aestheticDirection: AestheticDirection | undefined;
  if (hasFrontend(archetype as Archetype)) {
    const aesthetic = await select({
      message: "Aesthetic direction?",
      options: [
        { value: "brutalist" as AestheticDirection, label: "Brutalist" },
        { value: "editorial" as AestheticDirection, label: "Editorial" },
        { value: "organic" as AestheticDirection, label: "Organic" },
        { value: "luxury" as AestheticDirection, label: "Luxury" },
        { value: "minimal" as AestheticDirection, label: "Minimal" },
        { value: "maximalist" as AestheticDirection, label: "Maximalist" }
      ]
    });
    if (isCancel(aesthetic)) {
      cancel("Cancelled.");
      process.exit(0);
    }
    aestheticDirection = aesthetic as AestheticDirection;
  }

  outro("Choices captured. Generating project...");

  return {
    projectName: (projectName as string).trim(),
    archetype: archetype as Archetype,
    aestheticDirection,
    overwriteExisting
  };
}
