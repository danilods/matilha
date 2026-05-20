import type { GovernanceMetrics } from "./metrics";
import type { GovernanceState } from "./projection";

export function renderNarrative(state: GovernanceState, metrics: GovernanceMetrics): string {
  const lines: string[] = [];

  lines.push("# Governança Matilha — Narrativa Executiva");
  lines.push("");
  lines.push(`_Gerado em ${metrics.generated_at}._`);
  lines.push("");
  lines.push("## Os números finais");
  lines.push("");

  if (metrics.tasks_concluidas === 0) {
    lines.push("- Nenhuma task concluída registrada ainda.");
    lines.push("");
    return lines.join("\n");
  }

  lines.push(`- **${metrics.tasks_concluidas}** tasks concluídas.`);
  lines.push(`- Tempo ativo de agente: **${metrics.tempo_ativo_total} min**.`);
  lines.push(
    `- **${metrics.story_points_total} story points** entregues (1 SP = ${metrics.minutes_per_story_point} min de trabalho).`
  );
  if (metrics.duracao_calendario_dias !== null) {
    lines.push(`- Entregue em **${metrics.duracao_calendario_dias} dia(s)** de calendário.`);
  }
  lines.push("");
  lines.push("## Leitura honesta");
  lines.push("");
  if (metrics.worklog_estimated_count > 0) {
    lines.push(
      `- ${metrics.worklog_estimated_count} de ${metrics.tasks_concluidas} conclusões tiveram worklog **estimado** (sem cronometragem início/fim) — o story point derivado dele herda essa marca.`
    );
  } else {
    lines.push("- Todas as conclusões têm worklog medido por marcadores início/fim.");
  }
  lines.push(
    "- Story points calculados na conclusão a partir do tempo ativo medido — não estimados."
  );
  lines.push(
    `- Métricas derivadas exclusivamente do livro-razão append-only (${Object.keys(state.issues).length} issue(s) rastreada(s)) — reproduzíveis e auditáveis.`
  );
  lines.push("");

  return lines.join("\n");
}
