import { z } from "zod";
import { REGISTRY_INDEX_URL, REGISTRY_RAW_BASE } from "../config";

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
}
