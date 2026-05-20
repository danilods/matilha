import type { GovernanceMetrics } from "./metrics";
import type { GovernanceState } from "./projection";

export function renderNarrative(state: GovernanceState, metrics: GovernanceMetrics): string {
  const lines: string[] = [];

  lines.push("# Governança Matilha — Narrativa Executiva");
  lines.push("");
  lines.push(`_Gerado em ${metrics.generated_at}._`);
  lines.push("");
  lines.push("## A mudança de paradigma, em números");
  lines.push("");
  lines.push(
    `- **${metrics.issues_completed}** tasks concluídas, somando **${metrics.story_points_completed}** story points.`
  );
  lines.push(`- Tempo ativo de agente: **${metrics.worklog_active_minutes} min**.`);
  if (metrics.minutos_por_ponto !== null) {
    lines.push(`- **${metrics.minutos_por_ponto} min por story point.**`);
  }
  if (metrics.fator_compressao !== null) {
    lines.push(
      `- No paradigma tradicional (~${metrics.baseline_hours_per_point}h/ponto, ~${metrics.baseline_hours_per_point * 60} min/ponto), isso é uma **compressão de ${metrics.fator_compressao}×**.`
    );
  }
  if (metrics.velocidade_sp_por_dia !== null) {
    lines.push(`- Velocidade realizada: **${metrics.velocidade_sp_por_dia} SP/dia**.`);
  }
  lines.push("");
  lines.push("## Leitura honesta");
  lines.push("");
  if (metrics.worklog_estimated_count > 0) {
    lines.push(
      `- ${metrics.worklog_estimated_count} de ${metrics.issues_completed} conclusões tiveram worklog **estimado** (sem cronometragem início/fim) — os números acima são conservadores.`
    );
  } else {
    lines.push("- Todas as conclusões contabilizadas têm worklog medido por marcadores início/fim.");
  }
  lines.push(
    `- Métricas derivadas exclusivamente do livro-razão append-only (${Object.keys(state.issues).length} issue(s) rastreada(s)) — reproduzíveis e auditáveis.`
  );
  lines.push("");

  return lines.join("\n");
}
