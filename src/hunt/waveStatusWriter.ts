// src/hunt/waveStatusWriter.ts
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { stringify as yamlStringify } from "yaml";
import type { Wave } from "../domain/waveSchema";

export function writeWaveStatus(repoCwd: string, wave: Wave, featureSlug: string): string {
  const waveNum = wave.wave.replace("w", "").padStart(2, "0");
  const relPath = `docs/matilha/waves/wave-${waveNum}-status.md`;
  const absPath = join(repoCwd, relPath);

  const frontmatter = yamlStringify(wave).trim();

  const rows = Object.entries(wave.sps).map(([id, entry]) =>
    `| ${id.padEnd(4)} | ${entry.branch} | ${entry.worktree} | ${entry.status} |`
  ).join("\n");

  const body = `# Wave ${waveNum} Status — ${featureSlug}

Dispatched: ${wave.created}

## SPs

| SP   | Branch | Worktree | Status |
|------|--------|----------|--------|
${rows}

Merge order (from plan.md frontmatter): ${wave.merge_order.join(" → ")}

## Next action

Open terminals and paste the dispatch commands printed by \`matilha hunt\`.
Use \`matilha howl\` to see overall project state.
Use \`/gather\` (Wave 3b) when every SP has written SP-DONE.md.
`;

  mkdirSync(dirname(absPath), { recursive: true });
  writeFileSync(absPath, `---\n${frontmatter}\n---\n\n${body}`, "utf-8");
  return absPath;
}
