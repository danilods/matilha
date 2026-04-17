export const MANAGED_BLOCK_START = "<!-- MATILHA_MANAGED_START -->";
export const MANAGED_BLOCK_END = "<!-- MATILHA_MANAGED_END -->";

export const SCHEMA_VERSION = 1;

export const REGISTRY_REPO = "danilodesousa/matilha-skills";
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
