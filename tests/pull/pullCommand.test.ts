import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { pullCommand } from "../../src/pull/pullCommand";
import { MatilhaUserError } from "../../src/ui/errorFormat";
import type { RegistryClient } from "../../src/registry/registryClient";

describe("pullCommand", () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>;
  let stderrSpy: ReturnType<typeof vi.spyOn>;
  let outCaptured: string[];
  let errCaptured: string[];

  beforeEach(() => {
    outCaptured = [];
    errCaptured = [];
    stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation((c: unknown) => { outCaptured.push(String(c)); return true; });
    stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation((c: unknown) => { errCaptured.push(String(c)); return true; });
  });
  afterEach(() => { stdoutSpy.mockRestore(); stderrSpy.mockRestore(); });

  const makeClient = (content: string | Error): RegistryClient => ({
    pull: vi.fn().mockImplementation(() => content instanceof Error ? Promise.reject(content) : Promise.resolve(content))
  } as unknown as RegistryClient);

  it("writes raw content to stdout on happy path", async () => {
    const client = makeClient("# Phase 40\n\nContent...");
    await pullCommand({ client, slug: "methodology/40-execucao" });
    expect(outCaptured.join("")).toContain("# Phase 40");
  });

  it("emits meta line to stderr (pipe-safe)", async () => {
    const client = makeClient("short");
    await pullCommand({ client, slug: "methodology/40-execucao" });
    const err = errCaptured.join("");
    expect(err).toContain("fetched");
    expect(err).toContain("methodology/40-execucao");
  });

  it("throws MatilhaUserError on 404-style error", async () => {
    const client = makeClient(new Error("HTTP 404"));
    await expect(pullCommand({ client, slug: "nonexistent" })).rejects.toThrow(MatilhaUserError);
  });

  it("MatilhaUserError has 5-rule shape with 'matilha list' as next step", async () => {
    const client = makeClient(new Error("HTTP 404"));
    try {
      await pullCommand({ client, slug: "nonexistent" });
    } catch (e) {
      if (!(e instanceof MatilhaUserError)) throw e;
      expect(e.matilhaError.nextActions.some((a) => a.includes("matilha list"))).toBe(true);
    }
  });

  it("throws 'invalid slug format' error when slug fails regex validation", async () => {
    const client = makeClient(new Error("Invalid slug format"));
    try {
      await pullCommand({ client, slug: "Bad/Slug" });
      throw new Error("expected throw");
    } catch (e) {
      if (!(e instanceof MatilhaUserError)) throw e;
      expect(e.matilhaError.summary).toContain("invalid slug format");
    }
  });

  it("throws 'registry unreachable' error when fetch fails with network error", async () => {
    const client = makeClient(new Error("fetch failed"));
    try {
      await pullCommand({ client, slug: "x" });
      throw new Error("expected throw");
    } catch (e) {
      if (!(e instanceof MatilhaUserError)) throw e;
      expect(e.matilhaError.summary).toContain("registry unreachable");
      expect(e.matilhaError.problem).toContain("fetch failed");
    }
  });

  it("preserves specificity: 'not found' error is distinct from unreachable", async () => {
    const client = makeClient(new Error("Slug not found in registry: x"));
    try {
      await pullCommand({ client, slug: "x" });
      throw new Error("expected throw");
    } catch (e) {
      if (!(e instanceof MatilhaUserError)) throw e;
      expect(e.matilhaError.summary).toBe("resource not found in registry");
    }
  });
});
