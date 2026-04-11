import type { BpmPhaseSlug } from "@/lib/bpm-phases";

export type WorkspaceTabWithPhases = {
  id: string;
  phases: readonly BpmPhaseSlug[];
};

/** Todas as fases BPM mapeadas na aba estão concluídas. Abas sem fases nunca contam como "concluídas" para checks. */
export function isWorkspaceTabBpmComplete(
  phases: readonly BpmPhaseSlug[],
  bpmPhaseRows: Array<{ phase: string; stage_status: string }>
): boolean {
  if (phases.length === 0) return false;
  const byPhase = new Map(bpmPhaseRows.map((r) => [r.phase, r.stage_status]));
  return phases.every((p) => byPhase.get(p) === "completed");
}

/** Progresso 0–100 das fases BPM da aba (apenas abas com fases). */
export function activeTabPhaseProgress(
  phases: readonly BpmPhaseSlug[],
  bpmPhaseRows: Array<{ phase: string; stage_status: string }>
): { percent: number; completed: number; total: number } | null {
  if (phases.length === 0) return null;
  const byPhase = new Map(bpmPhaseRows.map((r) => [r.phase, r.stage_status]));
  let completed = 0;
  for (const p of phases) {
    if (byPhase.get(p) === "completed") completed += 1;
  }
  const total = phases.length;
  const percent = Math.round((completed / total) * 100);
  return { percent, completed, total };
}

/**
 * Destaque secundário: onde o processo pede atenção (BPM) vs aba aberta.
 * Regra: se o utilizador está noutra aba que a sugerida pelo BPM → BPM tab.
 * Senão → primeira aba "de trabalho" à frente ainda incompleta (ignora abas sem fases).
 */
export function computeSecondaryHighlightTabId(
  tabs: readonly WorkspaceTabWithPhases[],
  activeTab: string,
  currentWorkspaceTab: string,
  bpmPhaseRows: Array<{ phase: string; stage_status: string }>
): string | null {
  if (currentWorkspaceTab !== activeTab) {
    return currentWorkspaceTab;
  }
  const idx = tabs.findIndex((t) => t.id === activeTab);
  if (idx < 0) return null;
  for (let j = idx + 1; j < tabs.length; j += 1) {
    const t = tabs[j];
    if (t.phases.length === 0) continue;
    if (!isWorkspaceTabBpmComplete(t.phases, bpmPhaseRows)) {
      return t.id;
    }
  }
  return null;
}

/** Ritmo a partir da última data de evento (ISO). */
export function computeRhythmFromLastEventAt(lastEventAtIso: string | null): {
  label: string;
  tone: "fresh" | "idle" | "empty";
  idleRoughLabel?: string;
} {
  if (!lastEventAtIso) {
    return {
      label: "Sem registo de atividade",
      tone: "empty",
    };
  }
  const date = new Date(lastEventAtIso);
  if (Number.isNaN(date.getTime())) {
    return { label: "Sem registo de atividade", tone: "empty" };
  }
  const diffMs = Date.now() - date.getTime();
  const diffHours = diffMs / 3600000;
  const diffDays = diffMs / 86400000;

  if (diffHours <= 48) {
    return { label: "Ativo recentemente", tone: "fresh" };
  }
  if (diffDays < 7) {
    return {
      label: "Ritmo moderado",
      tone: "idle",
      idleRoughLabel: `Sem movimento há vários dias`,
    };
  }
  return {
    label: "Processo parado",
    tone: "idle",
    idleRoughLabel: `Sem movimento há mais de uma semana`,
  };
}

export type WorkspaceInsightInput = {
  checklistCompleted: number;
  checklistTotal: number;
  completedBpmCount: number;
  totalBpmPhases: number;
  lastEventAtIso: string | null;
};

/** Até 3 sugestões curtas, heurísticas (sem LLM). */
export function computeWorkspaceInsightHints(input: WorkspaceInsightInput): string[] {
  const out: string[] = [];

  if (input.checklistTotal > 0 && input.checklistCompleted < input.checklistTotal) {
    out.push(
      `Complete o checklist (${input.checklistCompleted}/${input.checklistTotal} itens).`
    );
  }

  if (input.completedBpmCount < input.totalBpmPhases) {
    out.push("Avance a fase BPM pendente antes de fechar o ciclo.");
  }

  if (input.lastEventAtIso) {
    const d = new Date(input.lastEventAtIso);
    if (!Number.isNaN(d.getTime())) {
      const diffDays = (Date.now() - d.getTime()) / 86400000;
      if (diffDays >= 14) {
        out.push("Registe uma atualização para manter o histórico útil para a equipa.");
      }
    }
  } else {
    out.push("O primeiro registo no histórico ajuda a rastrear a evolução do processo.");
  }

  return Array.from(new Set(out)).slice(0, 3);
}
