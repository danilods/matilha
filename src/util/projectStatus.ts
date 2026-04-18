import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { parseFrontmatter, serializeFrontmatter, type Frontmatter } from "./frontmatter";
import { projectStatusSchema, type ProjectStatus } from "../domain/projectStatusSchema";

const FILE_NAME = "project-status.md";

export async function readProjectStatus(cwd: string): Promise<Frontmatter<ProjectStatus>> {
  const path = join(cwd, FILE_NAME);
  if (!existsSync(path)) {
    throw new Error(`Not a Matilha project: project-status.md not found at ${path}. Run \`matilha init\` first.`);
  }
  const raw = readFileSync(path, "utf-8");
  const fm = parseFrontmatter<unknown>(raw);
  const result = projectStatusSchema.safeParse(fm.data);
  if (!result.success) {
    throw new Error(`Invalid project-status.md: ${JSON.stringify(result.error.issues, null, 2)}`);
  }
  return { data: result.data, body: fm.body };
}

export async function writeProjectStatus(cwd: string, fm: Frontmatter<ProjectStatus>): Promise<void> {
  const result = projectStatusSchema.safeParse(fm.data);
  if (!result.success) {
    throw new Error(`Cannot write invalid ProjectStatus: ${JSON.stringify(result.error.issues, null, 2)}`);
  }
  writeFileSync(join(cwd, FILE_NAME), serializeFrontmatter({ data: result.data, body: fm.body }), "utf-8");
}
