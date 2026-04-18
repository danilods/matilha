export const MANAGED_BLOCK_START = "<!-- MATILHA_MANAGED_START -->";
export const MANAGED_BLOCK_END = "<!-- MATILHA_MANAGED_END -->";

export const SCHEMA_VERSION = 1;

export const REGISTRY_REPO = "danilods/matilha-skills";
export const REGISTRY_INDEX_URL = `https://raw.githubusercontent.com/${REGISTRY_REPO}/main/index.json`;
export const REGISTRY_RAW_BASE = `https://raw.githubusercontent.com/${REGISTRY_REPO}/main`;

export const ARCHETYPES = [
  "saas-b2b",
  "saas-b2c",
  "frontend-only",
  "cli",
  "library",
  "ml-service",
  "marketplace"
] as const;

export const PHASES = [0, 10, 20, 30, 40, 50, 60, 70] as const;

export const PHASE_STATUSES = [
  "not_started",
  "in_progress",
  "gate_failed",
  "completed"
] as const;

export const TOOLS = ["claude-code", "cursor", "codex", "gemini-cli"] as const;

export const COMPANION_STATUSES = ["installed", "not_installed", "skipped"] as const;

export const AESTHETIC_DIRECTIONS = [
  "brutalist",
  "editorial",
  "organic",
  "luxury",
  "minimal",
  "maximalist"
] as const;

export const PHASE_GATE_KEYS = {
  10: [
    "problem_defined",
    "target_user_clear",
    "rfs_enumerated",
    "rnfs_covered",
    "risks_listed",
    "premissas_listed",
    "success_metrics_defined",
    "aha_moment_identified",
    "scope_boundaries_locked",
    "peer_review_done"
  ],
  20: [
    "stack_table_declared",
    "architecture_doc_exists",
    "rnf_traceability",
    "docker_compose_mirrors_prod",
    "env_example_created",
    "versions_pinned"
  ],
  30: [
    "claude_md_declares_stack_rules",
    "skills_by_domain",
    "skills_by_key_tech",
    "agents_with_models",
    "one_blocking_hook"
  ]
} as const satisfies Record<10 | 20 | 30, readonly string[]>;

export const MIN_WORDS_PER_SECTION = 30;
export const PLACEHOLDER_SENTINEL_RE = /\[placeholder\]|<!--\s*TODO/i;
export const RF_PATTERN = /^- RF-\d{3}/m;
export const RNF_PATTERN = /^- RNF-\d{3}/m;
