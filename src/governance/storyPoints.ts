export const DEFAULT_MINUTES_PER_STORY_POINT = 60;
export const MIN_STORY_POINTS = 0.05;

/**
 * Resolve a conversão minutos→story point a partir do ambiente.
 * Convenção institucional: 1 SP = 1 hora = 60 minutos (default).
 */
export function resolveMinutesPerStoryPoint(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env.MINUTES_PER_STORY_POINT;
  if (!raw) return DEFAULT_MINUTES_PER_STORY_POINT;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_MINUTES_PER_STORY_POINT;
}

/**
 * Converte tempo ativo de agente (minutos) em story points.
 * Regra: trunca em 1 casa decimal; piso MIN_STORY_POINTS para qualquer
 * task concluída. A divisão é feita como (minutos * 10) / taxa para evitar
 * o intermediário fracionário. O termo +1e-9 é uma defesa preventiva: para
 * taxas configuradas arbitrárias (minutesPerPoint não-convenientes), o erro
 * de ponto flutuante poderia fazer um valor exato cair por baixo no floor.
 */
export function minutesToStoryPoints(
  activeMinutes: number,
  minutesPerPoint: number = DEFAULT_MINUTES_PER_STORY_POINT
): number {
  const tenths = Math.floor((Math.max(0, activeMinutes) * 10) / minutesPerPoint + 1e-9);
  return Math.max(tenths / 10, MIN_STORY_POINTS);
}
