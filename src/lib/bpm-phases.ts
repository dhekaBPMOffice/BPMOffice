/** Chaves estáveis no banco (office_process_bpm_phases.phase) */
export const BPM_PHASE_SLUGS = [
  "levantamento",
  "modelagem",
  "validacao",
  "descritivo",
  "proposicao_melhorias",
  "implantacao",
  "acompanhamento",
] as const;

export type BpmPhaseSlug = (typeof BPM_PHASE_SLUGS)[number];

/** Rótulos em PT-BR (alinhados à UI da cadeia de valor) */
export const BPM_PHASE_LABELS: Record<BpmPhaseSlug, string> = {
  levantamento: "Levantamento",
  modelagem: "Modelagem",
  validacao: "Validação",
  descritivo: "Descritivo",
  proposicao_melhorias: "Proposição de melhorias",
  implantacao: "Implantação",
  acompanhamento: "Acompanhamento",
};

export type BpmStageStatusDb = "not_started" | "in_progress" | "completed";

const STATUS_DB_TO_LABEL: Record<BpmStageStatusDb, string> = {
  not_started: "Não iniciado",
  in_progress: "Em andamento",
  completed: "Concluído",
};

const STATUS_LABEL_TO_DB: Record<string, BpmStageStatusDb> = {
  "Não iniciado": "not_started",
  "Em andamento": "in_progress",
  Concluído: "completed",
};

const SLUG_TO_LABEL = BPM_PHASE_LABELS;

const LABEL_TO_SLUG: Record<string, BpmPhaseSlug> = Object.fromEntries(
  (Object.entries(BPM_PHASE_LABELS) as [BpmPhaseSlug, string][]).map(([k, v]) => [v, k])
) as Record<string, BpmPhaseSlug>;

export function labelToBpmPhaseSlug(label: string): BpmPhaseSlug | null {
  return LABEL_TO_SLUG[label] ?? null;
}

export function bpmStageStatusToLabel(status: BpmStageStatusDb): string {
  return STATUS_DB_TO_LABEL[status];
}

export function bpmStageLabelToDb(label: string): BpmStageStatusDb {
  return STATUS_LABEL_TO_DB[label] ?? "not_started";
}

/** Primeira fase não concluída; se todas concluídas, última fase. */
export function computeCurrentBpmPhaseSlug(
  rows: Array<{ phase: string; stage_status: string }>
): BpmPhaseSlug | null {
  const byPhase = new Map(rows.map((r) => [r.phase, r.stage_status as BpmStageStatusDb]));
  for (const slug of BPM_PHASE_SLUGS) {
    const st = byPhase.get(slug);
    if (st !== "completed") return slug;
  }
  return "acompanhamento";
}

export function formatCurrentBpmPhaseLabel(
  rows: Array<{ phase: string; stage_status: string }>
): string {
  const slug = computeCurrentBpmPhaseSlug(rows);
  if (!slug) return "—";
  return BPM_PHASE_LABELS[slug];
}
