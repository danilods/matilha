import pc from "picocolors";

/**
 * Returns a colorizer that respects NO_COLOR and MATILHA_ASCII env vars
 * at CALL TIME (not at module import). Use inside formatters/writers that
 * need to produce output respecting runtime env changes (e.g. tests).
 */
export function colors(): typeof pc {
  if (process.env.NO_COLOR || process.env.MATILHA_ASCII) {
    return pc.createColors(false) as typeof pc;
  }
  return pc;
}
