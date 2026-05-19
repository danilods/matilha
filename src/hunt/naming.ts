// src/hunt/naming.ts
// Shared SP/wave naming helpers used by split and merge.

export function slugifySP(title: string): string {
  return title.toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export function padWave(n: number): string {
  return n.toString().padStart(2, "0");
}
