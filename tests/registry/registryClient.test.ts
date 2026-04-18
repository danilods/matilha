import { describe, it, expect, vi, beforeEach } from "vitest";
import { RegistryClient } from "../../src/registry/registryClient";

describe("RegistryClient.list", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns parsed entries from index.json", async () => {
    const mockIndex = {
      "matilha-scout": {
        slug: "matilha-scout",
        name: "Scout (Phase 00)",
        skillPath: "skills/matilha-scout/SKILL.md"
      },
      "matilha-plan": {
        slug: "matilha-plan",
        name: "Plan (Phases 10-30)",
        skillPath: "skills/matilha-plan/SKILL.md"
      }
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockIndex,
      text: async () => JSON.stringify(mockIndex)
    } as Response);

    const client = new RegistryClient();
    const entries = await client.list();

    expect(entries).toHaveLength(2);
    expect(entries[0]?.slug).toBe("matilha-scout");
    expect(entries[1]?.skillPath).toBe("skills/matilha-plan/SKILL.md");
  });

  it("throws on non-200 response", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found"
    } as Response);

    const client = new RegistryClient();
    await expect(client.list()).rejects.toThrow(/404/);
  });

  it("throws on invalid JSON shape", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ invalid: "structure" })
    } as Response);

    const client = new RegistryClient();
    await expect(client.list()).rejects.toThrow();
  });
});

describe("RegistryClient.pull", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches skill markdown by slug", async () => {
    const mockIndex = {
      "matilha-scout": {
        slug: "matilha-scout",
        name: "Scout",
        skillPath: "skills/matilha-scout/SKILL.md"
      }
    };
    const mockMarkdown = "---\nname: matilha-scout\n---\n# Content";

    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockIndex
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => mockMarkdown
      } as Response);

    const client = new RegistryClient();
    const content = await client.pull("matilha-scout");

    expect(content).toBe(mockMarkdown);
  });

  it("throws on unknown slug", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({})
    } as Response);

    const client = new RegistryClient();
    await expect(client.pull("unknown-slug")).rejects.toThrow(/not found/i);
  });

  it("rejects malformed slug", async () => {
    const client = new RegistryClient();
    await expect(client.pull("Invalid Slug!")).rejects.toThrow(/Invalid slug/i);
  });
});

describe("RegistryClient.pullRaw", () => {
  it("pullRaw fetches arbitrary file", async () => {
    const client = new RegistryClient(
      "https://raw.example.com/repo/main/index.json",
      "https://raw.example.com/repo/main",
      async (input: RequestInfo | URL) => {
        expect(String(input)).toBe("https://raw.example.com/repo/main/templates/CLAUDE.md.tmpl");
        return new Response("# {{project_name}}", { status: 200 });
      }
    );
    const result = await client.pullRaw("templates/CLAUDE.md.tmpl");
    expect(result).toContain("{{project_name}}");
  });

  it("pullTemplate maps logical name to file path", async () => {
    const client = new RegistryClient(
      "https://raw.example.com/repo/main/index.json",
      "https://raw.example.com/repo/main",
      async (input: RequestInfo | URL) => {
        expect(String(input)).toBe("https://raw.example.com/repo/main/templates/project-status.md.tmpl");
        return new Response("---\nschema_version: 1\n---", { status: 200 });
      }
    );
    const result = await client.pullTemplate("project-status");
    expect(result).toContain("schema_version");
  });

  it("pullCompanions parses and validates JSON", async () => {
    const validJson = JSON.stringify({
      impeccable: {
        slug: "impeccable",
        name: "Impeccable",
        description: "d",
        detect: { "claude-code": "~/x" },
        install: { universal: "cmd" },
        tutorial: { title: "t", body: "b" },
        optional_per_archetype: []
      }
    });
    const client = new RegistryClient(
      "https://raw.example.com/repo/main/index.json",
      "https://raw.example.com/repo/main",
      async () => new Response(validJson, { status: 200 })
    );
    const result = await client.pullCompanions();
    expect(result.impeccable.slug).toBe("impeccable");
  });
});
