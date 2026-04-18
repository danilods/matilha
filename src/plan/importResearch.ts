import { readFileSync, existsSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { basename } from "node:path";
import { MatilhaUserError } from "../ui/errorFormat";

export type ImportedResearch = {
  filename: string;
  content: string;
  sha256: string;
};

const MAX_SIZE_BYTES = 1024 * 1024; // 1 MiB

/**
 * Validate + read a deep-research markdown file.
 * Throws MatilhaUserError with actionable 5-rule messages on any validation failure.
 */
export function importResearch(filePath: string): ImportedResearch {
  if (!existsSync(filePath)) {
    throw new MatilhaUserError({
      summary: `research file not found: ${filePath}`,
      context: "matilha plan --import-research expects a deep-research markdown file",
      problem: `the path '${filePath}' does not resolve to a file.`,
      nextActions: [
        "check the path is correct (tab-complete or `ls` it)",
        "if you haven't exported research yet, run Gemini/Claude Deep Research and save the result as .md"
      ]
    });
  }
  if (!/\.(md|markdown)$/i.test(filePath)) {
    throw new MatilhaUserError({
      summary: `research file has an unexpected extension: ${filePath}`,
      context: "matilha plan --import-research only accepts markdown (.md or .markdown)",
      problem: "other extensions (.txt, .pdf, .docx) aren't embedded safely into the spec.",
      nextActions: [
        "export your deep-research output as markdown (.md)",
        "rename the file with a .md or .markdown extension if it already is markdown"
      ],
      example: "matilha plan user-auth --import-research ./research.md"
    });
  }
  const size = statSync(filePath).size;
  if (size > MAX_SIZE_BYTES) {
    throw new MatilhaUserError({
      summary: `research file too large: ${size} bytes (max ${MAX_SIZE_BYTES})`,
      context: "matilha plan embeds the research file inline into the spec's Section 1",
      problem: "files over 1 MiB bloat the spec and overflow the agent's context window.",
      nextActions: [
        "summarize the research into the key findings (target under 1 MiB)",
        "keep only the sections relevant to this feature's PRD"
      ]
    });
  }
  const content = readFileSync(filePath, "utf-8");
  if (content.trim().length === 0) {
    throw new MatilhaUserError({
      summary: `research file is empty: ${filePath}`,
      context: "matilha plan --import-research needs actual content to embed as Section 1",
      problem: "the file has no non-whitespace content.",
      nextActions: [
        "confirm the research export saved correctly (open the file to verify)",
        "re-run the deep-research tool and save the full output"
      ]
    });
  }
  const sha256 = createHash("sha256").update(content).digest("hex");
  return { filename: basename(filePath), content, sha256 };
}
