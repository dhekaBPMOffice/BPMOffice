import { BPM_PHASE_LABELS, BPM_PHASE_SLUGS, type BpmPhaseSlug } from "@/lib/bpm-phases";
import type { ProcessItem } from "@/types/cadeia-valor";
import type { OfficeProcessBpmPhase } from "@/types/database";

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
  nivel1: string;
  nivel2: string;
  nivel3: string;
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
    nivel1: p.nivel1,
    nivel2: p.nivel2,
    nivel3: p.nivel3,
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
    nivel1: item.nivel1,
    nivel2: item.nivel2,
    nivel3: item.nivel3,
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

  return {
    id: row.id as string,
    tipo: tipoDisplay,
    macroprocesso: (row.vc_macroprocesso as string) || "",
    nivel1: (row.vc_level1 as string) || "",
    nivel2: (row.vc_level2 as string) || "",
    nivel3: (row.vc_level3 as string) || "",
    gestorProcesso: (row.vc_gestor_label as string) || "",
    prioridade: ((row.vc_priority as string) || "Média") as ValueChainProcessPayload["prioridade"],
    statusGeral: ((row.vc_general_status as string) || "Não iniciado") as ValueChainProcessPayload["statusGeral"],
    etapas,
    valueChainId: (row.value_chain_id as string | null) ?? null,
  };
}
