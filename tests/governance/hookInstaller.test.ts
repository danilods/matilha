import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { installGovernanceHooks } from "../../src/governance/hookInstaller";

function gitRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), "matilha-hookinstall-"));
  execFileSync("git", ["init", "-q"], { cwd: dir, stdio: "pipe" });
  return dir;
}

describe("installGovernanceHooks", () => {
  it("creates both hook files, executable, with the matilha block", async () => {
    const dir = gitRepo();
    try {
      const results = await installGovernanceHooks(dir);
      expect(results.map((r) => r.action)).toEqual(["created", "created"]);

      for (const hook of ["commit-msg", "post-commit"]) {
        const path = join(dir, ".git", "hooks", hook);
        expect(existsSync(path)).toBe(true);
        const content = readFileSync(path, "utf-8");
        expect(content.startsWith("#!/bin/sh")).toBe(true);
        expect(content).toContain("# >>> matilha governance >>>");
        expect(statSync(path).mode & 0o111).not.toBe(0);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("is idempotent — re-install replaces the block without duplicating it", async () => {
    const dir = gitRepo();
    try {
      await installGovernanceHooks(dir);
      const results = await installGovernanceHooks(dir);
      expect(results.map((r) => r.action)).toEqual(["replaced", "replaced"]);

      const content = readFileSync(join(dir, ".git", "hooks", "post-commit"), "utf-8");
      // one block = exactly one start marker + one end marker
      expect((content.match(/matilha governance/g) ?? []).length).toBe(2);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("appends to a pre-existing hook, preserving its content", async () => {
    const dir = gitRepo();
    try {
      const postCommitPath = join(dir, ".git", "hooks", "post-commit");
      writeFileSync(postCommitPath, "#!/bin/sh\necho existing-hook\n", "utf-8");

      const results = await installGovernanceHooks(dir);
      const postResult = results.find((r) => r.hook === "post-commit")!;
      expect(postResult.action).toBe("appended");

      // commit-msg was absent → must have been created (heterogeneous starting state)
      const commitMsgResult = results.find((r) => r.hook === "commit-msg")!;
      expect(commitMsgResult.action).toBe("created");

      const content = readFileSync(postCommitPath, "utf-8");
      expect(content).toContain("echo existing-hook");
      expect(content).toContain("# >>> matilha governance >>>");

      // pre-existing file had default 0o644 permissions; installer must chmod it 0o755
      expect(statSync(postCommitPath).mode & 0o111).not.toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
