import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Tool } from "./detectTools";
import type { WriteResult } from "./writeProject";

const CURSOR_RULE = `---
description: Matilha methodology and skill activation
globs:
alwaysApply: true
---

# Matilha

- Use Matilha as the project methodology when planning, coding, reviewing, or coordinating AI-assisted software work.
- Prefer project skills under \`.cursor/skills/matilha-*/SKILL.md\` when available.
- Also inspect shared skills under \`.agents/skills/matilha-*/SKILL.md\`; this is the portable location used by Codex, Gemini CLI, and other agents.
- Read \`project-status.md\` first, then \`docs/matilha/context.md\` for the source-of-record map.
- Treat \`docs/matilha/specs/\`, \`docs/matilha/plans/\`, and \`docs/matilha/waves/\` as durable context stores.
- Follow Matilha phases in order: discover, spec, design, split, merge, review, ship.
- Keep this rule compact; do not paste full methodology, specs, plans, or long summaries here.
`;

const AIDER_CONVENTIONS = `# Matilha Conventions

- Use Matilha as the project methodology when planning, coding, reviewing, or coordinating AI-assisted software work.
- Read \`project-status.md\` first, then \`docs/matilha/context.md\` for the source-of-record map.
- Treat \`docs/matilha/specs/\`, \`docs/matilha/plans/\`, and \`docs/matilha/waves/\` as durable context stores.
- Read relevant \`SKILL.md\` files under \`.agents/skills/matilha-*/\` before applying a Matilha workflow.
- Preserve Matilha phase order: discover, spec, design, split, merge, review, ship.
- Keep edits narrow, verify with the project test/build commands, and record decisions in Matilha docs when the workflow asks for it.
- Keep this file compact; do not paste full methodology, specs, plans, or long summaries here.
`;

const AIDER_CONFIG = `read: CONVENTIONS.md
`;

type BootstrapFile = {
  path: string;
  content: string;
};

function bootstrapFilesFor(tools: readonly Tool[], cwd: string): BootstrapFile[] {
  const files: BootstrapFile[] = [];
  const detected = new Set<Tool>(tools);

  if (detected.has("cursor")) {
    files.push({
      path: join(cwd, ".cursor", "rules", "matilha.mdc"),
      content: CURSOR_RULE
    });
  }

  if (detected.has("aider")) {
    files.push(
      {
        path: join(cwd, "CONVENTIONS.md"),
        content: AIDER_CONVENTIONS
      },
      {
        path: join(cwd, ".aider.conf.yml"),
        content: AIDER_CONFIG
      }
    );
  }

  return files;
}

export async function writeToolBootstraps(
  tools: readonly Tool[],
  cwd: string,
  dryRun: boolean,
  overwriteExisting = false
): Promise<WriteResult[]> {
  const files = bootstrapFilesFor(tools, cwd);

  return files.map((file) => {
    const existed = existsSync(file.path);
    const shouldWrite = !dryRun && (!existed || overwriteExisting);
    if (shouldWrite) {
      mkdirSync(dirname(file.path), { recursive: true });
      writeFileSync(file.path, file.content, "utf-8");
    }

    return {
      path: file.path,
      bytes: Buffer.byteLength(file.content, "utf-8"),
      overwritten: existed && shouldWrite
    };
  });
}
