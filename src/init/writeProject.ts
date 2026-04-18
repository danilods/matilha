import { writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { InitInputs } from "./askInputs";
import type { TemplateName } from "./fetchTemplates";

export type WriteResult = {
  path: string;
  bytes: number;
  overwritten: boolean;
};

const FILE_NAME_MAP: Record<TemplateName, string> = {
  claude: "CLAUDE.md",
  agents: "AGENTS.md",
  "project-status": "project-status.md",
  "design-spec": "design-spec.md"
};

export async function writeProject(
  inputs: InitInputs,
  rendered: Map<TemplateName, string>,
  cwd: string,
  dryRun: boolean
): Promise<WriteResult[]> {
  const results: WriteResult[] = [];
  for (const [templateName, content] of rendered) {
    const fileName = FILE_NAME_MAP[templateName];
    const path = join(cwd, fileName);
    const existed = existsSync(path);

    if (!dryRun) {
      writeFileSync(path, content, "utf-8");
    }

    results.push({
      path,
      bytes: Buffer.byteLength(content, "utf-8"),
      overwritten: existed
    });
  }
  return results;
}
