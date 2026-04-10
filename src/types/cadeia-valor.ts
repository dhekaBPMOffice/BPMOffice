export type ProcessType = "Primário" | "Apoio" | "Gerencial";
export type Priority = "Alta" | "Média" | "Baixa";
export type GeneralStatus = "Não iniciado" | "Em andamento" | "Concluído" | "Em acompanhamento";
export type StageStatus = "Não iniciado" | "Em andamento" | "Concluído";

export const BPM_STAGES = [
  "Levantamento",
  "Modelagem",
  "Validação",
  "Descritivo",
  "Proposição de melhorias",
  "Implantação",
  "Acompanhamento",
] as const;

export type BPMStage = (typeof BPM_STAGES)[number];

export interface ProcessItem {
  id: string;
  /** Categoria livre (ex.: importação de planilha); valores canónicos incluem Primário, Apoio, Gerencial. */
  tipo: string;
  macroprocesso: string;
  /** Hierarquia de níveis (ordem: macro → detalhe). */
  niveis: string[];
  /** Nome do processo no escritório (BD); usado na árvore quando `niveis` está vazio. */
  nomeEscritorio?: string | null;
  /** Texto livre em `office_processes.description`. */
  description?: string | null;
  /** Origem em `office_processes`; controla sync automático (catálogo não é regravado em debounce). */
  creationSource?: "from_catalog" | "created_in_value_chain" | null;
  gestorProcesso: string;
  ultimaAtualizacao: string;
  responsavelAtualizacao: string;
  prioridade: Priority;
  statusGeral: GeneralStatus;
  etapas: Record<BPMStage, StageStatus>;
}
