// src/hunt/planParser.ts
// NOTE: full parser implementation lands with SP1 (Task 1.2).
// This stub defines the ParsedSP type so downstream consumers
// (kickoffRenderer, huntCommand) can compile in parallel.

export type ParsedSP = {
  id: string;
  title: string;
  description: string;
  touches: string[];
  acceptance: string[];
  tests: string[];
};
