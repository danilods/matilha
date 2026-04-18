import { RegistryClient } from "../registry/registryClient";

export type TemplateName = "claude" | "agents" | "project-status" | "design-spec";

/**
 * Fetch a single template by logical name.
 * If `client` is not provided, creates a default one with production registry URLs.
 */
export async function fetchTemplate(name: TemplateName, client?: RegistryClient): Promise<string> {
  const c = client ?? new RegistryClient();
  return await c.pullTemplate(name);
}

/**
 * Fetch all 4 templates (or 3 if no frontend). Returns Map for quick lookup.
 */
export async function fetchAllTemplates(
  withDesignSpec: boolean,
  client?: RegistryClient
): Promise<Map<TemplateName, string>> {
  const names: TemplateName[] = withDesignSpec
    ? ["claude", "agents", "project-status", "design-spec"]
    : ["claude", "agents", "project-status"];
  const c = client ?? new RegistryClient();
  const entries = await Promise.all(
    names.map(async (name) => [name, await c.pullTemplate(name)] as const)
  );
  return new Map(entries);
}
