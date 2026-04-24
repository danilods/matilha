/**
 * Canonical catalog of matilha plugins installable via `/plugin install`.
 *
 * Slugs match the marketplace repo names on GitHub (`danilods/<slug>`).
 * For the core `matilha-skills` slug, the install command uses the plugin
 * name `matilha` inside the marketplace (not `matilha-skills`); all other
 * packs use their slug as both marketplace and plugin name.
 *
 * Source of truth: /matilha-install command in matilha-skills. Keep in sync
 * when a new pack ships.
 */

export type PackSlug =
  | "matilha-skills"
  | "matilha-ux-pack"
  | "matilha-growth-pack"
  | "matilha-harness-pack"
  | "matilha-sysdesign-pack"
  | "matilha-software-eng-pack"
  | "matilha-software-arch-pack"
  | "matilha-security-pack";

export type PackCatalogEntry = {
  slug: PackSlug;
  /** Plugin name inside the marketplace (usually same as slug, except core). */
  pluginName: string;
  marketplaceUrl: string;
  title: string;
  skillCount: number;
  description: string;
};

export const PACK_CATALOG: readonly PackCatalogEntry[] = [
  {
    slug: "matilha-skills",
    pluginName: "matilha",
    marketplaceUrl: "danilods/matilha-skills",
    title: "matilha (core)",
    skillCount: 11,
    description: "Core methodology — compose gateway + scout/plan/hunt/gather/howl/design/den/pack/init/review."
  },
  {
    slug: "matilha-ux-pack",
    pluginName: "matilha-ux-pack",
    marketplaceUrl: "danilods/matilha-ux-pack",
    title: "UX",
    skillCount: 22,
    description: "Build UIs, forms, error flows, cognitive-load decisions. Weinschenk + Krug + cognitive psych."
  },
  {
    slug: "matilha-growth-pack",
    pluginName: "matilha-growth-pack",
    marketplaceUrl: "danilods/matilha-growth-pack",
    title: "Growth",
    skillCount: 20,
    description: "Signup flows, pricing, activation, retention, positioning. AARRR + JTBD."
  },
  {
    slug: "matilha-harness-pack",
    pluginName: "matilha-harness-pack",
    marketplaceUrl: "danilods/matilha-harness-pack",
    title: "Harness",
    skillCount: 22,
    description: "Build LLM agents — multi-agent systems, context engineering, evals. Anthropic + OpenAI + Lopopolo."
  },
  {
    slug: "matilha-sysdesign-pack",
    pluginName: "matilha-sysdesign-pack",
    marketplaceUrl: "danilods/matilha-sysdesign-pack",
    title: "System Design",
    skillCount: 19,
    description: "Scale distributed systems — NFRs, CAP, Kafka, CDN, rate limiting. Zhiyong Tan."
  },
  {
    slug: "matilha-software-eng-pack",
    pluginName: "matilha-software-eng-pack",
    marketplaceUrl: "danilods/matilha-software-eng-pack",
    title: "Software Engineering",
    skillCount: 15,
    description: "Day-to-day engineering discipline — KISS, RORO, commits, docs, task tracking."
  },
  {
    slug: "matilha-software-arch-pack",
    pluginName: "matilha-software-arch-pack",
    marketplaceUrl: "danilods/matilha-software-arch-pack",
    title: "Software Architecture",
    skillCount: 17,
    description: "Organize code — layering, Lambda chains, event-driven, dual-store, bounded contexts."
  },
  {
    slug: "matilha-security-pack",
    pluginName: "matilha-security-pack",
    marketplaceUrl: "danilods/matilha-security-pack",
    title: "Security",
    skillCount: 13,
    description: "Ship AI software safely — keys, trust boundary, LLM risks, LGPD."
  }
] as const;

export const PACK_BY_SLUG: Record<PackSlug, PackCatalogEntry> = Object.fromEntries(
  PACK_CATALOG.map((p) => [p.slug, p])
) as Record<PackSlug, PackCatalogEntry>;

/** All slugs in canonical order (core first, then packs). */
export const ALL_SLUGS: readonly PackSlug[] = PACK_CATALOG.map((p) => p.slug);

/** Just the companion packs (excludes core). */
export const COMPANION_SLUGS: readonly PackSlug[] = PACK_CATALOG
  .filter((p) => p.slug !== "matilha-skills")
  .map((p) => p.slug);
