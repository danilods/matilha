// src/hunt/planParser.ts
import { parse as parseYaml } from "yaml";
import { MatilhaUserError } from "../ui/errorFormat";

export type ParsedSP = {
  id: string;
  title: string;
  description: string;
  touches: string[];
  acceptance: string[];
  tests: string[];
};

export type ParsedWave = {
  id: string;
  sps: ParsedSP[];
};

export type ParsedPlan = {
  name: string;
  spec: string;
  created: string;
  waves: ParsedWave[];
  warnings: string[];
};

const SP_HEADING_CANONICAL_RE = /^### (SP\d+)\s*—\s*(.+?)$/;
const SP_HEADING_COLON_RE = /^### (SP\d+)\s*:\s*(.+?)$/;
const SP_HEADING_HYPHEN_RE = /^### (SP\d+)\s+-\s+(.+?)$/;
const WAVE_HEADING_RE = /^## Wave (\d+)/;

function matchSPHeading(line: string, warnings: string[], lineNum: number): { id: string; title: string } | null {
  let m = line.match(SP_HEADING_CANONICAL_RE);
  if (m) return { id: m[1]!, title: m[2]!.trim() };
  m = line.match(SP_HEADING_COLON_RE);
  if (m) {
    warnings.push(`line ${lineNum}: SP heading uses colon separator "${line}" — canonical form uses em-dash (—). Accepted, but template shows em-dash.`);
    return { id: m[1]!, title: m[2]!.trim() };
  }
  m = line.match(SP_HEADING_HYPHEN_RE);
  if (m) {
    warnings.push(`line ${lineNum}: SP heading uses single hyphen "${line}" — canonical form uses em-dash (—). Accepted.`);
    return { id: m[1]!, title: m[2]!.trim() };
  }
  return null;
}

function extractBlock(lines: string[], startIdx: number, endIdx: number, marker: string): string[] {
  const body = lines.slice(startIdx, endIdx).join("\n");
  const markerRe = new RegExp(`\\*\\*${marker}\\*\\*\\s*\\n([\\s\\S]*?)(?=\\n\\*\\*|\\n### |\\n## |$)`);
  const m = body.match(markerRe);
  if (!m) return [];
  return m[1]!.split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("- "))
    .map((l) => l.replace(/^-\s*(?:\[\s*[x ]?\s*\])?\s*/, "").trim())
    .filter(Boolean);
}

export function parsePlan(markdown: string): ParsedPlan {
  const fmMatch = markdown.match(/^---\n([\s\S]*?)\n---\n/);
  if (!fmMatch) {
    throw new MatilhaUserError({
      summary: "plan file has no frontmatter",
      context: "matilha hunt was reading the plan file",
      problem: "the file does not start with a `---` frontmatter block.",
      nextActions: [
        "open the plan and add a frontmatter block (name, spec, created, waves)",
        "see templates/plan.md.tmpl in the registry for the expected shape"
      ]
    });
  }
  const frontmatter = parseYaml(fmMatch[1]!) as {
    name: string;
    spec: string;
    created: string;
    waves: Record<string, string[]>;
  };

  const body = markdown.slice(fmMatch[0]!.length);
  const lines = body.split("\n");
  const warnings: string[] = [];

  const spsByBody: Record<string, { title: string; startLine: number; wave: number }> = {};
  let currentWave = 0;

  for (let i = 0; i < lines.length; i++) {
    const waveMatch = lines[i]!.match(WAVE_HEADING_RE);
    if (waveMatch) {
      currentWave = parseInt(waveMatch[1]!, 10);
      continue;
    }

    const trimmed = lines[i]!.trim();
    if (!trimmed.startsWith("### ")) continue;

    const spMatch = matchSPHeading(trimmed, warnings, i + 1);
    if (spMatch) {
      spsByBody[spMatch.id] = { title: spMatch.title, startLine: i, wave: currentWave };
    } else if (trimmed.startsWith("### SP")) {
      throw new MatilhaUserError({
        summary: `malformed SP heading at line ${i + 1}`,
        context: "matilha hunt was parsing the plan body",
        problem: `line "${trimmed}" does not match any accepted SP heading format.`,
        nextActions: [
          `rename the heading to use the canonical form`,
          `accepted variants: em-dash (—), colon (:), or single hyphen (-)`
        ],
        example: "### SP1 — Database schema for users"
      });
    }
  }

  const waves: ParsedWave[] = [];
  for (const [waveKey, spIds] of Object.entries(frontmatter.waves)) {
    const waveSPs: ParsedSP[] = [];
    for (const spId of spIds) {
      const bodyEntry = spsByBody[spId];
      if (!bodyEntry) {
        throw new MatilhaUserError({
          summary: `SP ${spId} in frontmatter but missing in body`,
          context: "matilha hunt was matching frontmatter SPs to body headings",
          problem: `frontmatter declares ${spId} under ${waveKey} but no "### ${spId} —" heading was found.`,
          nextActions: [
            `add a body section "### ${spId} — <title>" with Acceptance/Touches/Tests blocks`,
            `or remove ${spId} from frontmatter waves`
          ]
        });
      }

      const nextHeadingIdx = lines.findIndex((l, idx) =>
        idx > bodyEntry.startLine && (l.startsWith("### SP") || l.startsWith("## "))
      );
      const endLine = nextHeadingIdx === -1 ? lines.length : nextHeadingIdx;

      const description = (lines.slice(bodyEntry.startLine + 1, endLine)
        .join("\n")
        .split(/\n\*\*/)[0] ?? "")
        .trim();

      const touches = extractBlock(lines, bodyEntry.startLine, endLine, "Touches");
      const acceptance = extractBlock(lines, bodyEntry.startLine, endLine, "Acceptance");
      const tests = extractBlock(lines, bodyEntry.startLine, endLine, "Tests");

      if (touches.length === 0) {
        throw new MatilhaUserError({
          summary: `SP ${spId} has no Touches block or it's empty`,
          context: `matilha hunt was extracting file list for ${spId}`,
          problem: `the Touches block is required and must list at least one file.`,
          nextActions: [
            `add "**Touches**" followed by a bullet list of files ${spId} will modify`,
            `disjunction validation needs this to ensure intra-wave SPs don't collide`
          ],
          example: "**Touches**\n- src/path/file.ts\n- tests/path/file.test.ts"
        });
      }

      if (acceptance.length === 0) {
        throw new MatilhaUserError({
          summary: `SP ${spId} has no Acceptance block or it's empty`,
          context: `matilha hunt was extracting acceptance criteria for ${spId}`,
          problem: `the Acceptance block is required with at least one checkbox.`,
          nextActions: [`add "**Acceptance**" followed by checkbox bullets`]
        });
      }

      waveSPs.push({
        id: spId,
        title: bodyEntry.title,
        description,
        touches,
        acceptance,
        tests
      });
    }
    waves.push({ id: waveKey, sps: waveSPs });
  }

  const frontmatterIds = new Set(Object.values(frontmatter.waves).flat());
  for (const [bodyId] of Object.entries(spsByBody)) {
    if (!frontmatterIds.has(bodyId)) {
      throw new MatilhaUserError({
        summary: `SP ${bodyId} found in body but not declared in frontmatter`,
        context: "matilha hunt was reconciling body headings with frontmatter",
        problem: `the body has "### ${bodyId} — ..." but frontmatter waves does not list ${bodyId}.`,
        nextActions: [
          `add ${bodyId} to the appropriate wave in frontmatter`,
          `or remove the body heading if ${bodyId} shouldn't be dispatched`
        ]
      });
    }
  }

  return {
    name: frontmatter.name,
    spec: frontmatter.spec,
    created: frontmatter.created,
    waves,
    warnings
  };
}
