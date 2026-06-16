/**
 * Campos exportáveis da Consolidação do Levantamento (PDF/DOCX e pré-visualização admin).
 * Ao alterar rótulos, atualize também `CONSOLIDATION_FIELDS` no client profissional
 * e `document-preview.tsx`.
 */

export type ConsolidationExportFieldKey =
  | "current_execution"
  | "process_start"
  | "process_end"
  | "identified_steps"
  | "systems_used"
  | "documents_used"
  | "process_inputs"
  | "process_outputs"
  | "involved_areas"
  | "pending_questions"
  | "survey_observations";

export const CONSOLIDATION_EXPORT_FIELD_DEFS: {
  key: ConsolidationExportFieldKey;
  label: string;
}[] = [
  { key: "current_execution", label: "Forma atual de execução do processo" },
  { key: "process_start", label: "Início do processo" },
  { key: "process_end", label: "Fim do processo" },
  { key: "identified_steps", label: "Principais etapas identificadas" },
  { key: "systems_used", label: "Sistemas utilizados" },
  { key: "documents_used", label: "Documentos utilizados" },
  { key: "process_inputs", label: "Entradas do processo" },
  { key: "process_outputs", label: "Saídas do processo" },
  { key: "involved_areas", label: "Áreas envolvidas" },
  { key: "pending_questions", label: "Dúvidas pendentes" },
  { key: "survey_observations", label: "Observações do levantamento" },
];

export type ConsolidationExportData = {
  processName: string;
  fields: Record<ConsolidationExportFieldKey, string>;
};

export function formatConsolidationScalar(value: string | null | undefined): string {
  const v = (value ?? "").trim();
  return v === "" ? "—" : v;
}

export function getConsolidationFieldRows(
  fields: Partial<Record<ConsolidationExportFieldKey, string>>
): { label: string; value: string }[] {
  return CONSOLIDATION_EXPORT_FIELD_DEFS.map(({ key, label }) => ({
    label,
    value: formatConsolidationScalar(fields[key]),
  }));
}

export function normalizeConsolidationExportData(input: unknown): ConsolidationExportData {
  const o = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const rawFields =
    o.fields && typeof o.fields === "object" && !Array.isArray(o.fields)
      ? (o.fields as Record<string, unknown>)
      : {};

  const fields = {} as Record<ConsolidationExportFieldKey, string>;
  for (const { key } of CONSOLIDATION_EXPORT_FIELD_DEFS) {
    const value = rawFields[key];
    fields[key] = typeof value === "string" ? value : "";
  }

  return {
    processName: typeof o.processName === "string" ? o.processName : "—",
    fields,
  };
}

export function isConsolidationExportData(data: unknown): data is ConsolidationExportData {
  if (!data || typeof data !== "object") return false;
  const o = data as ConsolidationExportData;
  return typeof o.processName === "string" && o.fields != null && typeof o.fields === "object";
}

export const SAMPLE_CONSOLIDATION_EXPORT_DATA: ConsolidationExportData = {
  processName: "Processo de Exemplo",
  fields: {
    current_execution:
      "O processo é executado manualmente com apoio de planilhas e e-mail entre as áreas envolvidas.",
    process_start: "Solicitação registrada pelo cliente ou área demandante.",
    process_end: "Entrega concluída e comunicada ao solicitante.",
    identified_steps:
      "1. Recebimento\n2. Análise\n3. Execução\n4. Validação\n5. Encerramento",
    systems_used: "ERP, planilha compartilhada, e-mail corporativo.",
    documents_used: "Formulário de solicitação, checklist de validação.",
    process_inputs: "Solicitação formal, dados cadastrais, anexos do cliente.",
    process_outputs: "Serviço entregue, registro no sistema, comunicação ao cliente.",
    involved_areas: "Comercial, Operações, Financeiro.",
    pending_questions: "Confirmar SLA acordado com áreas satélites.",
    survey_observations: "Há retrabalho frequente na etapa de validação.",
  },
};
