import type {
  BaseProcess,
  OfficeProcessStatus,
  ProcessQuestionnaireOption,
  ProcessQuestionnaireQuestion,
} from "@/types/database";

export const OFFICE_PROCESS_STATUS_META: Record<
  OfficeProcessStatus,
  { label: string; variant: "outline" | "success" | "warning" | "secondary" }
> = {
  not_started: { label: "Não iniciado", variant: "outline" },
  in_progress: { label: "Em andamento", variant: "warning" },
  completed: { label: "Concluído", variant: "success" },
  archived: { label: "Arquivado", variant: "secondary" },
};

export function slugifyProcessName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizeChecklist(
  checklist: unknown
): string[] {
  if (!Array.isArray(checklist)) return [];

  return checklist
    .map((item) => String(item ?? "").trim())
    .filter(Boolean);
}

export function parseChecklistInput(value: string) {
  return normalizeChecklist(
    value
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean)
  );
}

export function buildChecklistInput(checklist: unknown) {
  return normalizeChecklist(checklist).join("\n");
}

export type QuestionnaireQuestionWithOptions = ProcessQuestionnaireQuestion & {
  process_questionnaire_question_processes?: {
    base_process_id: string;
  }[];
  process_questionnaire_options?: (ProcessQuestionnaireOption & {
    process_questionnaire_option_processes?: {
      base_process_id: string;
    }[];
  })[];
};

export function collectProcessIdsFromAnswers(
  questions: QuestionnaireQuestionWithOptions[],
  answers: Record<string, string | string[]>
) {
  const linkedProcessIds = new Set<string>();

  for (const question of questions) {
    const rawAnswer = answers[question.id];
    const hasAnswer = Array.isArray(rawAnswer)
      ? rawAnswer.length > 0
      : typeof rawAnswer === "string" && rawAnswer.trim().length > 0;
    const selectedIds = Array.isArray(rawAnswer)
      ? rawAnswer
      : typeof rawAnswer === "string" && rawAnswer
        ? [rawAnswer]
        : [];

    if (!hasAnswer) continue;

    if (question.enable_process_linking) {
      for (const link of question.process_questionnaire_question_processes ?? []) {
        linkedProcessIds.add(link.base_process_id);
      }
    }

    for (const option of question.process_questionnaire_options ?? []) {
      if (!selectedIds.includes(option.id)) continue;
      if (!option.enable_process_linking) continue;

      for (const link of option.process_questionnaire_option_processes ?? []) {
        linkedProcessIds.add(link.base_process_id);
      }
    }
  }

  return [...linkedProcessIds];
}

export function buildOfficeProcessSnapshot(baseProcess: BaseProcess) {
  return {
    base_process_id: baseProcess.id,
    name: baseProcess.name,
    description: baseProcess.description,
    category: baseProcess.category,
    // Mantém compatibilidade com dados legados enquanto migração de anexos não for total.
    template_url: baseProcess.template_url ?? null,
    template_label: baseProcess.template_label ?? null,
    flowchart_image_url: baseProcess.flowchart_image_url ?? null,
    // Copia por valor para evitar qualquer partilha acidental entre snapshots.
    template_files: Array.isArray(baseProcess.template_files)
      ? baseProcess.template_files.map((file) => ({
          url: file.url,
          ...(file.label ? { label: file.label } : {}),
        }))
      : [],
    flowchart_files: Array.isArray(baseProcess.flowchart_files)
      ? baseProcess.flowchart_files.map((file) => ({
          url: file.url,
        }))
      : [],
    vc_macroprocesso: baseProcess.vc_macroprocesso ?? null,
    vc_levels: Array.isArray(baseProcess.vc_levels) ? [...baseProcess.vc_levels] : [],
  };
}
