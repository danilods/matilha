import { readFileSync, existsSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { basename } from "node:path";

export type ImportedResearch = {
  filename: string;
  content: string;
  sha256: string;
};

const MAX_SIZE_BYTES = 1024 * 1024; // 1 MiB

/**
 * Validate + read a deep-research markdown file.
 * Throws with actionable messages on any validation failure.
 */
export function importResearch(filePath: string): ImportedResearch {
  if (!existsSync(filePath)) {
    throw new Error(
      `File not found: ${filePath}. Expected a markdown deep-research export.`
    );
  }
  if (!/\.(md|markdown)$/i.test(filePath)) {
    throw new Error(
      `Unexpected extension on ${filePath}. Expected .md or .markdown.`
    );
  }
  const size = statSync(filePath).size;
  if (size > MAX_SIZE_BYTES) {
    throw new Error(
      `Research file too large: ${size} bytes (max ${MAX_SIZE_BYTES}). Consider summarizing first.`
    );
  }
  const content = readFileSync(filePath, "utf-8");
  if (content.trim().length === 0) {
    throw new Error(`Research file is empty: ${filePath}.`);
  }
  const sha256 = createHash("sha256").update(content).digest("hex");
  return { filename: basename(filePath), content, sha256 };
}
