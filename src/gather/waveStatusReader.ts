// src/gather/waveStatusReader.ts
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import { waveSchema, type Wave } from "../domain/waveSchema";
import { MatilhaUserError } from "../ui/errorFormat";

export type WaveStatusReadResult = {
  wave: Wave;
  absPath: string;
};

function padWaveNum(n: number): string {
  return n.toString().padStart(2, "0");
}

export function readWaveStatus(cwd: string, waveNum: number): WaveStatusReadResult {
  const relPath = `docs/matilha/waves/wave-${padWaveNum(waveNum)}-status.md`;
  const absPath = join(cwd, relPath);

  if (!existsSync(absPath)) {
    throw new MatilhaUserError({
      summary: `wave-${padWaveNum(waveNum)}-status.md not found`,
      context: `matilha gather was looking for the wave status file at ${relPath}`,
      problem: `no wave-status file exists for wave ${waveNum}; /gather needs one to know which SPs to merge.`,
      nextActions: [
        `run 'matilha hunt <slug> --wave ${waveNum}' to dispatch the wave first`,
        `or pass --wave N to pick a wave that has been dispatched`
      ],
      example: `matilha hunt <slug> --wave ${waveNum}`
    });
  }

  const raw = readFileSync(absPath, "utf-8");
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) {
    throw new MatilhaUserError({
      summary: `wave-${padWaveNum(waveNum)}-status.md has no frontmatter`,
      context: `matilha gather was parsing wave-status`,
      problem: `the file ${relPath} lacks a YAML frontmatter block between '---' fences.`,
      nextActions: [
        `inspect the file and restore the frontmatter`,
        `or re-run 'matilha hunt <slug> --wave ${waveNum} --force' to regenerate it`
      ]
    });
  }

  const parsed = parseYaml(fmMatch[1]!);
  const result = waveSchema.safeParse(parsed);
  if (!result.success) {
    throw new MatilhaUserError({
      summary: `wave-${padWaveNum(waveNum)}-status.md has invalid frontmatter`,
      context: `matilha gather was validating wave-status against waveSchema`,
      problem: `schema violation: ${result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`,
      nextActions: [
        `fix the file manually`,
        `or re-run 'matilha hunt <slug> --wave ${waveNum} --force' to regenerate`
      ]
    });
  }

  return { wave: result.data, absPath };
}
