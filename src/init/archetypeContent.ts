import { ARCHETYPES, AESTHETIC_DIRECTIONS } from "../config";

export type Archetype = typeof ARCHETYPES[number];
export type AestheticDirection = typeof AESTHETIC_DIRECTIONS[number];

const FRONTEND_ARCHETYPES = new Set<Archetype>([
  "saas-b2b",
  "saas-b2c",
  "frontend-only",
  "marketplace"
]);

export function hasFrontend(archetype: Archetype): boolean {
  return FRONTEND_ARCHETYPES.has(archetype);
}

export function buildClaudeIndex(archetype: Archetype): string {
  switch (archetype) {
    case "saas-b2b":
    case "saas-b2c":
      return [
        "- Backend API: `src/api/` — REST/GraphQL handlers",
        "- Database: `src/db/` — schema + migrations",
        "- Frontend: `src/web/` — UI application",
        "- Jobs: `src/jobs/` — async workers",
        "- Shared: `src/shared/` — types, utils"
      ].join("\n");

    case "frontend-only":
      return [
        "- Components: `src/components/` — reusable UI",
        "- Pages: `src/app/` (or `src/pages/`) — route-level",
        "- Design tokens: `src/design/` — colors, typography",
        "- Hooks/state: `src/hooks/`, `src/stores/`"
      ].join("\n");

    case "cli":
      return [
        "- Entry: `src/cli.ts` — command parsing",
        "- Commands: `src/commands/<name>.ts`",
        "- Core logic: `src/core/`",
        "- Utils: `src/utils/`"
      ].join("\n");

    case "library":
      return [
        "- Public API: `src/index.ts` — barrel exports",
        "- Core modules: `src/<module>/`",
        "- Types: `src/types.ts`",
        "- Examples: `examples/`"
      ].join("\n");

    case "ml-service":
      return [
        "- Training: `src/train/`",
        "- Inference API: `src/serve/`",
        "- Data loaders: `src/data/`",
        "- Models: `src/models/`",
        "- Notebooks: `notebooks/`"
      ].join("\n");

    case "marketplace":
      return [
        "- Backend: `src/api/`",
        "- Seller portal: `src/seller/`",
        "- Buyer UI: `src/buyer/`",
        "- Payments: `src/payments/`",
        "- Database: `src/db/`"
      ].join("\n");
  }
}

export function buildAgentsIndex(archetype: Archetype): string {
  const claudeIndex = buildClaudeIndex(archetype);
  return `### Project structure\n\n${claudeIndex}\n\n### Conventions\n\n- TDD preferred for new code\n- Tests live next to source or in tests/ mirror`;
}

const AESTHETIC_GUIDANCE: Record<AestheticDirection, string> = {
  brutalist: "Heavy typography, raw edges, deliberate asymmetry. Monospace + display fonts. Black/white + one accent. No gradients.",
  editorial: "Magazine-inspired layouts. Generous white space. Serif body, sans heading. Image-text rhythm.",
  organic: "Hand-drawn feel, rounded edges, warm palette. Subtle texture. Serif or humanist sans.",
  luxury: "Dark palette + metallic accent, serif display, generous padding, slow animation. Zero clutter.",
  minimal: "Restraint. 1-2 typefaces, 2-3 colors, ample negative space. Every pixel justified.",
  maximalist: "Bold layered elements, multi-color palette, pattern fills, animated micro-interactions."
};

export function buildDesignSpecBody(archetype: Archetype, aesthetic: AestheticDirection): string {
  return `## Aesthetic guidance (${aesthetic})

${AESTHETIC_GUIDANCE[aesthetic]}

## Archetype context

This is a \`${archetype}\` archetype. See \`methodology/20-stack.md\` for default stack choices.

## Design Gates (from methodology/materializacoes.md)

- [ ] Aesthetic direction locked
- [ ] 3-5 references curated per direction
- [ ] Impeccable harness active (if available)
- [ ] shadcn/ui context loaded (if using shadcn)
- [ ] First screen reviewed by a human with fresh eyes`;
}
