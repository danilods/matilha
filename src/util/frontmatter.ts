import YAML from "yaml";

export type Frontmatter<T = unknown> = {
  data: T;
  body: string;
};

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

export function parseFrontmatter<T = unknown>(markdown: string): Frontmatter<T> {
  const match = FRONTMATTER_RE.exec(markdown);
  if (!match) {
    throw new Error("Invalid frontmatter: expected --- delimited YAML block at start");
  }
  const [, yamlBlock = "", body] = match;
  const data = YAML.parse(yamlBlock) as T;
  return { data, body: body ?? "" };
}

export function serializeFrontmatter<T>(fm: Frontmatter<T>): string {
  const yaml = YAML.stringify(fm.data).trimEnd();
  const body = fm.body.startsWith("\n") ? fm.body : `\n${fm.body}`;
  return `---\n${yaml}\n---\n${body}`;
}
