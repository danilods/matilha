/**
 * Port-methodology transformer: converts Obsidian vault pages to portable markdown
 * for publication to the matilha-skills registry repo.
 *
 * Used as a CLI:
 *   node dist/scripts/port-methodology.js <vault-page> <output-file>
 */

const CONCEPTS_GITHUB_BASE = "https://github.com/danilods/matilha-skills/tree/main/concepts";

function transformLine(line: string): string {
  // Obsidian highlight syntax → bold (not in code)
  let transformed = line.replace(/==([^=]+)==/g, "**$1**");

  // Wikilinks: [[target]] or [[target|label]]
  transformed = transformed.replace(
    /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,
    (_match, target: string, label: string | undefined) => {
      const labelOrTarget = label ?? target;

      // raw/ paths are brain-dumps, PDFs etc. - not included in registry; strip link
      if (target.startsWith("raw/")) {
        const fileName = target.split("/").pop() ?? target;
        return label ?? fileName;
      }

      // wiki/concepts/* → GitHub URL (concepts likely won't be in methodology/)
      if (target.startsWith("wiki/concepts/")) {
        return `[${labelOrTarget}](${CONCEPTS_GITHUB_BASE})`;
      }

      // wiki/methodology/foo → relative ./foo.md
      if (target.startsWith("wiki/methodology/")) {
        const slug = target.slice("wiki/methodology/".length);
        return `[${labelOrTarget}](./${slug}.md)`;
      }

      // Bare methodology slug (e.g. 10-prd, 00-mapeamento-problema)
      // Heuristic: 2-digit prefix or contains hyphen and no slash
      if (!target.includes("/")) {
        return `[${labelOrTarget}](./${target}.md)`;
      }

      // Fallback: keep label, drop link
      return labelOrTarget;
    }
  );

  return transformed;
}

export function transformWikilinks(content: string): string {
  const lines = content.split("\n");
  const out: string[] = [];

  let inFencedCode = false;

  for (const line of lines) {
    // Toggle fenced code block state
    if (line.trim().startsWith("```")) {
      inFencedCode = !inFencedCode;
      out.push(line);
      continue;
    }

    if (inFencedCode) {
      out.push(line);
      continue;
    }

    // Protect inline code: don't transform content inside backticks
    // Split line into tokens, transform only non-code tokens
    const transformed = line.replace(
      /(`[^`]*`)|([^`]+)/g,
      (match, code: string | undefined, text: string | undefined) => {
        if (code !== undefined) return code;
        if (text !== undefined) return transformLine(text);
        return match;
      }
    );

    out.push(transformed);
  }

  return out.join("\n");
}

// CLI entry (runs when called directly)
if (import.meta.url === `file://${process.argv[1]}`) {
  const [, , inputPath, outputPath] = process.argv;
  if (!inputPath || !outputPath) {
    console.error("Usage: node port-methodology.js <input.md> <output.md>");
    process.exit(1);
  }

  const { readFileSync, writeFileSync, mkdirSync } = await import("node:fs");
  const { dirname } = await import("node:path");

  const input = readFileSync(inputPath, "utf-8");
  const output = transformWikilinks(input);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, output);
  console.log(`Transformed: ${inputPath} → ${outputPath}`);
}
