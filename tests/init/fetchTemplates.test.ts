import { describe, it, expect } from "vitest";
import { fetchTemplate } from "../../src/init/fetchTemplates";
import { RegistryClient } from "../../src/registry/registryClient";

describe("fetchTemplate", () => {
  it("delegates to RegistryClient.pullTemplate", async () => {
    const client = new RegistryClient(
      "https://raw.example.com/repo/main/index.json",
      "https://raw.example.com/repo/main",
      async (input) => {
        expect(String(input)).toContain("templates/CLAUDE.md.tmpl");
        return new Response("# {{project_name}} CLAUDE.md", { status: 200 });
      }
    );
    const result = await fetchTemplate("claude", client);
    expect(result).toContain("{{project_name}}");
  });

  it("propagates fetch errors", async () => {
    const client = new RegistryClient(
      "https://raw.example.com/repo/main/index.json",
      "https://raw.example.com/repo/main",
      async () => new Response("", { status: 404 })
    );
    await expect(fetchTemplate("claude", client)).rejects.toThrow();
  });
});
