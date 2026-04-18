import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { importResearch } from "../../src/plan/importResearch";

describe("importResearch", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "matilha-ir-"));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it("happy path: returns filename + content + sha256", () => {
    const path = join(tmp, "research.md");
    writeFileSync(path, "# Research\nBody");
    const result = importResearch(path);
    expect(result.filename).toBe("research.md");
    expect(result.content).toBe("# Research\nBody");
    expect(result.sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("accepts .markdown extension", () => {
    const path = join(tmp, "r.markdown");
    writeFileSync(path, "content");
    const result = importResearch(path);
    expect(result.filename).toBe("r.markdown");
  });

  it("throws on missing file", () => {
    expect(() => importResearch(join(tmp, "nope.md"))).toThrow(/not found/i);
  });

  it("throws on wrong extension", () => {
    const path = join(tmp, "r.txt");
    writeFileSync(path, "content");
    expect(() => importResearch(path)).toThrow(/extension/i);
  });

  it("throws on empty file (after trim)", () => {
    const path = join(tmp, "r.md");
    writeFileSync(path, "   \n  ");
    expect(() => importResearch(path)).toThrow(/empty/i);
  });
});
