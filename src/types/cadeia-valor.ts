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
  nivel1: string;
  nivel2: string;
  nivel3: string;
  gestorProcesso: string;
  ultimaAtualizacao: string;
  responsavelAtualizacao: string;
  prioridade: Priority;
  statusGeral: GeneralStatus;
  etapas: Record<BPMStage, StageStatus>;
}
