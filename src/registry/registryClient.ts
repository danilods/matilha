import { z } from "zod";
import { REGISTRY_INDEX_URL, REGISTRY_RAW_BASE } from "../config";
import { companionsFileSchema, type CompanionsFile } from "../domain/companionSchema";

const registryEntrySchema = z.object({
  slug: z.string().regex(/^[a-z0-9](?:[a-z0-9-_]*[a-z0-9])?$/),
  name: z.string().min(1),
  skillPath: z.string().min(1)
});

const registryIndexSchema = z.record(z.string(), registryEntrySchema);

export type RegistryEntry = z.infer<typeof registryEntrySchema>;

export class RegistryClient {
  constructor(
    private readonly indexUrl: string = REGISTRY_INDEX_URL,
    private readonly rawBase: string = REGISTRY_RAW_BASE,
    private readonly fetcher: typeof fetch = globalThis.fetch
  ) {}

  async list(): Promise<RegistryEntry[]> {
    const response = await this.fetcher(this.indexUrl);
    if (!response.ok) {
      throw new Error(
        `Registry index fetch failed: ${response.status} ${response.statusText ?? ""}`.trim()
      );
    }
    const raw = await response.json();
    const parsed = registryIndexSchema.parse(raw);
    return Object.values(parsed);
  }

  async pull(slug: string): Promise<string> {
    const validated = z
      .string()
      .regex(/^[a-z0-9](?:[a-z0-9-_]*[a-z0-9])?$/, "Invalid slug format")
      .parse(slug);

    const entries = await this.list();
    const entry = entries.find((e) => e.slug === validated);
    if (!entry) {
      throw new Error(`Slug not found in registry: ${validated}`);
    }

    const skillUrl = `${this.rawBase}/${entry.skillPath}`;
    const response = await this.fetcher(skillUrl);
    if (!response.ok) {
      throw new Error(
        `Registry skill fetch failed: ${response.status} for ${entry.skillPath}`
      );
    }
    return await response.text();
  }

  /**
   * Fetch arbitrary raw file from the registry by path relative to repo root.
   * Used for templates, companions.json, or any non-skill asset.
   */
  async pullRaw(relativePath: string): Promise<string> {
    const url = `${this.rawBase}/${relativePath}`;
    const response = await this.fetcher(url);
    if (!response.ok) {
      throw new Error(
        `Registry raw fetch failed: ${response.status} for ${relativePath}`
      );
    }
    return await response.text();
  }

  /**
   * Fetch a template file by logical name.
   */
  async pullTemplate(name: "claude" | "agents" | "project-status" | "design-spec"): Promise<string> {
    const fileNameMap = {
      claude: "CLAUDE.md.tmpl",
      agents: "AGENTS.md.tmpl",
      "project-status": "project-status.md.tmpl",
      "design-spec": "design-spec.md.tmpl"
    };
    return await this.pullRaw(`templates/${fileNameMap[name]}`);
  }

  /**
   * Fetch and parse companions.json, validating shape via Zod.
   */
  async pullCompanions(): Promise<CompanionsFile> {
    const raw = await this.pullRaw("companions.json");
    const parsed = JSON.parse(raw);
    const result = companionsFileSchema.safeParse(parsed);
    if (!result.success) {
      throw new Error(
        `companions.json invalid: ${JSON.stringify(result.error.issues)}`
      );
    }
    return result.data;
  }
}
