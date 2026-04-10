import { BPM_PHASE_LABELS, BPM_PHASE_SLUGS, type BpmPhaseSlug } from "@/lib/bpm-phases";
import type { ProcessItem } from "@/types/cadeia-valor";
import type { OfficeProcessBpmPhase } from "@/types/database";
import { levelsFromRow, type OfficeProcessLevelRow } from "@/lib/office-process-levels";

type ProcessTypePt = "Primário" | "Apoio" | "Gerencial";
type BPMStagePt =
  | "Levantamento"
  | "Modelagem"
  | "Validação"
  | "Descritivo"
  | "Proposição de melhorias"
  | "Implantação"
  | "Acompanhamento";
type StageStatusPt = "Não iniciado" | "Em andamento" | "Concluído";

export type ValueChainProcessPayload = {
  id?: string;
  /** Texto livre; valores canónicos "Primário" | "Apoio" | "Gerencial" preenchem também vc_process_type. */
  tipo: string;
  macroprocesso: string;
  /** Hierarquia de níveis (variável). Opcional em import legado — normalizar antes de gravar. */
  niveis?: string[];
  /** `office_processes.description`. */
  description?: string | null;
  gestorProcesso: string;
  prioridade: "Alta" | "Média" | "Baixa";
  statusGeral: "Não iniciado" | "Em andamento" | "Concluído" | "Em acompanhamento";
  etapas: Record<BPMStagePt, StageStatusPt>;
  valueChainId?: string | null;
};

export function mapTipoToDb(t: ProcessTypePt): "primario" | "apoio" | "gerencial" {
  if (t === "Primário") return "primario";
  if (t === "Gerencial") return "gerencial";
  return "apoio";
}

/** Só quando o rótulo é exatamente um dos três canónicos (persistência legada em vc_process_type). */
export function deriveVcProcessTypeFromLabel(label: string): "primario" | "apoio" | "gerencial" | null {
  const s = label.trim();
  if (s === "Primário") return "primario";
  if (s === "Gerencial") return "gerencial";
  if (s === "Apoio") return "apoio";
  return null;
}

function mapTipoFromDb(t: string | null | undefined): ProcessTypePt {
  if (t === "primario") return "Primário";
  if (t === "gerencial") return "Gerencial";
  return "Apoio";
}

export function assertStage(stage: string): stage is BPMStagePt {
  return [
    "Levantamento",
    "Modelagem",
    "Validação",
    "Descritivo",
    "Proposição de melhorias",
    "Implantação",
    "Acompanhamento",
  ].includes(stage);
}

export function dbRowToProcessItem(
  row: Record<string, unknown>,
  phases: OfficeProcessBpmPhase[]
): ProcessItem {
  const p = mapOfficeProcessToValueChainPayload(row, phases);
  return {
    id: row.id as string,
    tipo: p.tipo,
    macroprocesso: p.macroprocesso,
    niveis: p.niveis ?? [],
    description: p.description ?? null,
    nomeEscritorio: (row.name as string | undefined) ?? null,
    creationSource: (row.creation_source as ProcessItem["creationSource"]) ?? null,
    gestorProcesso: p.gestorProcesso,
    prioridade: p.prioridade,
    statusGeral: p.statusGeral,
    etapas: p.etapas,
    ultimaAtualizacao: new Date((row.updated_at as string) || Date.now()).toLocaleDateString("pt-BR"),
    responsavelAtualizacao: "",
  };
}

export function processItemToPayload(
  item: ProcessItem,
  valueChainId?: string | null
): ValueChainProcessPayload {
  return {
    id: item.id,
    tipo: item.tipo,
    macroprocesso: item.macroprocesso,
    niveis: item.niveis ?? [],
    description: item.description?.trim() || null,
    gestorProcesso: item.gestorProcesso,
    prioridade: item.prioridade,
    statusGeral: item.statusGeral,
    etapas: item.etapas,
    valueChainId: valueChainId ?? null,
  };
}

export function mapOfficeProcessToValueChainPayload(
  row: Record<string, unknown>,
  phases: OfficeProcessBpmPhase[]
): ValueChainProcessPayload {
  const etapas = {} as Record<BPMStagePt, StageStatusPt>;
  for (const slug of BPM_PHASE_SLUGS) {
    const rowPh = phases.find((p) => p.phase === slug);
    const st = (rowPh?.stage_status as string) || "not_started";
    const label: StageStatusPt =
      st === "completed"
        ? "Concluído"
        : st === "in_progress"
          ? "Em andamento"
          : "Não iniciado";
    const ptLabel = BPM_PHASE_LABELS[slug as BpmPhaseSlug] as BPMStagePt;
    etapas[ptLabel] = label;
  }

  const label = String((row as { vc_tipo_label?: string | null }).vc_tipo_label ?? "").trim();
  const tipoDisplay =
    label.length > 0 ? label : mapTipoFromDb(row.vc_process_type as string | null);

  const lr = row as OfficeProcessLevelRow;
  const niveis = levelsFromRow(lr);

  return {
    id: row.id as string,
    tipo: tipoDisplay,
    macroprocesso: (row.vc_macroprocesso as string) || "",
    niveis: niveis.length ? niveis : [],
    description: (row.description as string | null | undefined) ?? null,
    gestorProcesso: (row.vc_gestor_label as string) || "",
    prioridade: ((row.vc_priority as string) || "Média") as ValueChainProcessPayload["prioridade"],
    statusGeral: ((row.vc_general_status as string) || "Não iniciado") as ValueChainProcessPayload["statusGeral"],
    etapas,
    valueChainId: (row.value_chain_id as string | null) ?? null,
  };
}
