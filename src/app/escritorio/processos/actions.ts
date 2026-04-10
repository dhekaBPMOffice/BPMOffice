"use server";

import { revalidatePath } from "next/cache";
import { getProfile } from "@/lib/auth";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import {
  buildOfficeProcessSnapshot,
  collectProcessIdsFromAnswers,
  normalizeChecklist,
  OFFICE_PROCESS_STATUS_META,
  type QuestionnaireQuestionWithOptions,
} from "@/lib/processes";
import type {
  BaseProcess,
  OfficeProcessStatus,
  OfficeProcessAttachmentType,
  ProcessFlowchartFile,
  ProcessTemplateFile,
  Profile,
} from "@/types/database";
import { BPM_PHASE_LABELS, bpmStageStatusToLabel, type BpmPhaseSlug } from "@/lib/bpm-phases";
import { uploadProcessFile } from "@/lib/process-file-upload";
import {
  compactLevelsForPersist,
  levelsFromRow,
  mirrorFirstThreeLegacyColumns,
} from "@/lib/office-process-levels";

type LeaderProfile = Profile & {
  role: "leader";
  office_id: string;
};

function isSelectableQuestion(value: string) {
  return value === "single_select" || value === "multi_select";
}

async function recordOfficeProcessHistory(input: {
  officeProcessId: string;
  officeId: string;
  actorProfileId: string | null;
  eventType: string;
  description: string;
  metadata?: Record<string, unknown>;
}) {
  const supabase = await createServiceClient();
  await supabase.from("office_process_history").insert({
    office_process_id: input.officeProcessId,
    office_id: input.officeId,
    actor_profile_id: input.actorProfileId,
    event_type: input.eventType,
    description: input.description,
    metadata: input.metadata ?? {},
  });
}

async function createChecklistItemsForProcess(
  officeProcessId: string,
  profileId: string,
  checklist: unknown
) {
  const items = normalizeChecklist(checklist);
  if (items.length === 0) return;

  const supabase = await createServiceClient();
  await supabase.from("office_process_checklist_items").insert(
    items.map((title, index) => ({
      office_process_id: officeProcessId,
      title,
      sort_order: index,
      created_by_profile_id: profileId,
    }))
  );
}

async function assertLeaderProfile(): Promise<
  | { profile: LeaderProfile }
  | { error: string }
> {
  const profile = await getProfile();
  if (profile.role !== "leader") {
    return { error: "Apenas líderes podem executar esta ação." as const };
  }
  if (!profile.office_id) {
    return { error: "Escritório não encontrado." as const };
  }
  return { profile: profile as LeaderProfile };
}

async function getOfficeProcessOrError(
  officeProcessId: string
): Promise<
  | { profile: LeaderProfile; officeProcess: any }
  | { error: string }
> {
  const access = await assertLeaderProfile();
  if ("error" in access) return access;

  const supabase = await createServiceClient();
  const { data: officeProcess, error } = await supabase
    .from("office_processes")
    .select("*")
    .eq("id", officeProcessId)
    .eq("office_id", access.profile.office_id)
    .single();

  if (error || !officeProcess) {
    return { error: "Processo do escritório não encontrado." as const };
  }

  return { profile: access.profile, officeProcess };
}

export async function submitProcessOnboarding(
  answers: Record<string, string | string[]>
) {
  const access = await assertLeaderProfile();
  if ("error" in access) return { error: access.error };

  const { profile } = access;
  const supabase = await createServiceClient();

  const { data: questionnaire } = await supabase
    .from("process_questionnaires")
    .select("id, is_required_first_access")
    .eq("is_process_activation_form", true)
    .single();

  if (!questionnaire) {
    return { error: "Nenhum questionário ativo foi encontrado." };
  }

  const { data: questionData, error: questionError } = await supabase
    .from("process_questionnaire_questions")
    .select(`
      id,
      prompt,
      helper_text,
      question_type,
      is_required,
      enable_process_linking,
      sort_order,
      process_questionnaire_question_processes (
        base_process_id
      ),
      process_questionnaire_options (
        id,
        label,
        value,
        helper_text,
        sort_order,
        is_active,
        enable_process_linking,
        process_questionnaire_option_processes (
          base_process_id
        )
      )
    `)
    .eq("questionnaire_id", questionnaire.id)
    .order("sort_order", { ascending: true });

  if (questionError) {
    return { error: questionError.message };
  }

  const questions = (questionData ?? []) as QuestionnaireQuestionWithOptions[];

  for (const question of questions) {
    const rawAnswer = answers[question.id];
    const hasAnswer = Array.isArray(rawAnswer)
      ? rawAnswer.length > 0
      : typeof rawAnswer === "string" && rawAnswer.trim().length > 0;

    if (question.is_required && !hasAnswer) {
      return { error: `Responda a pergunta: ${question.prompt}` };
    }
  }

  const processIds = collectProcessIdsFromAnswers(questions, answers);

  const { data: submission, error: submissionError } = await supabase
    .from("office_questionnaire_submissions")
    .insert({
      questionnaire_id: questionnaire.id,
      office_id: profile.office_id,
      leader_profile_id: profile.id,
      generated_process_ids: processIds,
    })
    .select("id")
    .single();

  if (submissionError || !submission) {
    return { error: submissionError?.message ?? "Não foi possível salvar a submissão." };
  }

  const answerRows = questions.map((question) => {
    const rawAnswer = answers[question.id];
    const selectedOptionIds =
      isSelectableQuestion(question.question_type) && Array.isArray(rawAnswer)
        ? rawAnswer
        : isSelectableQuestion(question.question_type) && typeof rawAnswer === "string" && rawAnswer
          ? [rawAnswer]
          : [];

    const isTextQuestion = ["text", "short_text", "long_text"].includes(
      question.question_type
    );
    const answerText =
      isTextQuestion && typeof rawAnswer === "string"
        ? rawAnswer.trim()
        : null;

    return {
      submission_id: submission.id,
      question_id: question.id,
      answer_text: answerText,
      selected_option_ids: selectedOptionIds,
    };
  });

  if (answerRows.length > 0) {
    const { error: answersError } = await supabase
      .from("office_questionnaire_answers")
      .insert(answerRows);

    if (answersError) {
      return { error: answersError.message };
    }
  }

  if (processIds.length > 0) {
    const [{ data: existingOfficeProcesses }, { data: baseProcesses, error: baseProcessError }] =
      await Promise.all([
        supabase
          .from("office_processes")
          .select("id, base_process_id")
          .eq("office_id", profile.office_id),
        supabase
          .from("base_processes")
          .select("*")
          .in("id", processIds),
      ]);

    if (baseProcessError) {
      return { error: baseProcessError.message };
    }

    const existingBaseProcessIds = new Set(
      (existingOfficeProcesses ?? []).map((item) => item.base_process_id)
    );

    const processesToInsert = ((baseProcesses ?? []) as BaseProcess[]).filter(
      (process) => !existingBaseProcessIds.has(process.id)
    );

    if (processesToInsert.length > 0) {
      const { data: insertedProcesses, error: insertProcessError } = await supabase
        .from("office_processes")
        .insert(
          processesToInsert.map((baseProcess) => ({
            office_id: profile.office_id,
            ...buildOfficeProcessSnapshot(baseProcess),
            origin: "questionnaire",
            creation_source: "from_catalog",
            status: "not_started",
            added_by_profile_id: profile.id,
          }))
        )
        .select("id, base_process_id");

      if (insertProcessError) {
        return { error: insertProcessError.message };
      }

      for (const insertedProcess of insertedProcesses ?? []) {
        const baseProcess = processesToInsert.find(
          (item) => item.id === insertedProcess.base_process_id
        );

        await createChecklistItemsForProcess(
          insertedProcess.id,
          profile.id,
          baseProcess?.management_checklist
        );

        await recordOfficeProcessHistory({
          officeProcessId: insertedProcess.id,
          officeId: profile.office_id,
          actorProfileId: profile.id,
          eventType: "created_from_questionnaire",
          description: "Processo incluído automaticamente pelo questionário inicial.",
          metadata: {
            questionnaire_id: questionnaire.id,
            base_process_id: insertedProcess.base_process_id,
          },
        });
      }
    }
  }

  await supabase
    .from("offices")
    .update({ processes_initialized_at: new Date().toISOString() })
    .eq("id", profile.office_id);

  revalidatePath("/escritorio/onboarding/processos");
  revalidatePath("/escritorio/processos");
  revalidatePath("/escritorio/dashboard");
  return { success: true, generatedCount: processIds.length };
}

export async function addManualOfficeProcess(baseProcessId: string) {
  const access = await assertLeaderProfile();
  if ("error" in access) return { error: access.error };

  const { profile } = access;
  const supabase = await createServiceClient();

  const [{ data: baseProcess, error: processError }, { data: existing }] = await Promise.all([
    supabase.from("base_processes").select("*").eq("id", baseProcessId).single(),
    supabase
      .from("office_processes")
      .select("id")
      .eq("office_id", profile.office_id)
      .eq("base_process_id", baseProcessId)
      .maybeSingle(),
  ]);

  if (processError || !baseProcess) {
    return { error: "Processo base não encontrado." };
  }

  if (existing) {
    return { error: "Este processo já faz parte da lista do escritório." };
  }

  const { data: officeProcess, error } = await supabase
    .from("office_processes")
    .insert({
      office_id: profile.office_id,
      ...buildOfficeProcessSnapshot(baseProcess as BaseProcess),
      origin: "manual",
      creation_source: "from_catalog",
      status: "not_started",
      added_by_profile_id: profile.id,
    })
    .select("id")
    .single();

  if (error || !officeProcess) {
    return { error: error?.message ?? "Não foi possível adicionar o processo." };
  }

  await createChecklistItemsForProcess(
    officeProcess.id,
    profile.id,
    (baseProcess as BaseProcess).management_checklist
  );

  await recordOfficeProcessHistory({
    officeProcessId: officeProcess.id,
    officeId: profile.office_id,
    actorProfileId: profile.id,
    eventType: "created_manual",
    description: "Processo adicionado manualmente pelo líder.",
    metadata: { base_process_id: baseProcessId },
  });

  revalidatePath("/escritorio/processos");
  revalidatePath("/escritorio/processos/catalogo");
  revalidatePath("/escritorio/estrategia/cadeia-valor");
  revalidatePath("/escritorio/estrategia/processos-escritorio");
  return { success: true };
}

export async function addManualOfficeProcessesBulk(baseProcessIds: string[]) {
  const access = await assertLeaderProfile();
  if ("error" in access) return { error: access.error };

  const uniqueIds = [...new Set(baseProcessIds.filter(Boolean))];
  if (uniqueIds.length === 0) {
    return { success: true as const, added: 0 };
  }

  const { profile } = access;
  const supabase = await createServiceClient();

  const [{ data: baseRows, error: bpError }, { data: existingRows }] = await Promise.all([
    supabase.from("base_processes").select("*").in("id", uniqueIds),
    supabase
      .from("office_processes")
      .select("base_process_id")
      .eq("office_id", profile.office_id)
      .in("base_process_id", uniqueIds),
  ]);

  if (bpError) {
    return { error: bpError.message };
  }

  const existingSet = new Set(
    (existingRows ?? []).map((r) => r.base_process_id).filter((id): id is string => id != null)
  );
  const baseById = new Map((baseRows ?? []).map((bp) => [bp.id, bp as BaseProcess]));

  const toInsert = uniqueIds
    .filter((id) => baseById.has(id) && !existingSet.has(id))
    .map((id) => {
      const baseProcess = baseById.get(id)!;
      return {
        office_id: profile.office_id,
        ...buildOfficeProcessSnapshot(baseProcess),
        origin: "manual" as const,
        creation_source: "from_catalog",
        status: "not_started" as const,
        added_by_profile_id: profile.id,
      };
    });

  if (toInsert.length === 0) {
    return { success: true as const, added: 0 };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("office_processes")
    .insert(toInsert)
    .select("id, base_process_id");

  if (insertError || !inserted?.length) {
    return { error: insertError?.message ?? "Não foi possível adicionar os processos." };
  }

  for (const row of inserted) {
    const baseProcess = baseById.get(row.base_process_id as string);
    if (!baseProcess) continue;
    await createChecklistItemsForProcess(
      row.id,
      profile.id,
      baseProcess.management_checklist
    );
    await recordOfficeProcessHistory({
      officeProcessId: row.id,
      officeId: profile.office_id,
      actorProfileId: profile.id,
      eventType: "created_manual",
      description: "Processo adicionado manualmente pelo líder.",
      metadata: { base_process_id: row.base_process_id },
    });
  }

  revalidatePath("/escritorio/processos");
  revalidatePath("/escritorio/processos/catalogo");
  revalidatePath("/escritorio/estrategia/cadeia-valor");
  revalidatePath("/escritorio/estrategia/processos-escritorio");
  return { success: true as const, added: inserted.length };
}

export async function updateOfficeProcessDetails(input: {
  officeProcessId: string;
  /** Legado: preferir derivar `name` a partir de macroprocesso + níveis. */
  name?: string;
  description?: string | null;
  category?: string | null;
  templateFiles?: ProcessTemplateFile[];
  flowchartFiles?: ProcessFlowchartFile[];
  status: OfficeProcessStatus;
  ownerProfileId?: string | null;
  notes?: string;
  /** Macroprocesso na cadeia de valor (coluna `vc_macroprocesso`). */
  vcMacroprocesso?: string | null;
  /** Tipo na cadeia (canónico); `null` limpa tipo e rótulo livre. */
  vcProcessType?: "primario" | "apoio" | "gerencial" | null;
  /** Lista de níveis (ordem hierárquica). */
  vcLevels?: string[];
}) {
  const processAccess = await getOfficeProcessOrError(input.officeProcessId);
  if ("error" in processAccess) return { error: processAccess.error };

  const { profile, officeProcess } = processAccess;
  const supabase = await createServiceClient();
  const now = new Date().toISOString();

  const normalizedName = input.name?.trim();

  const normalizedTemplateFiles = input.templateFiles?.filter(
    (file) => typeof file.url === "string" && file.url.trim().length > 0
  );
  const normalizedFlowchartFiles = input.flowchartFiles?.filter(
    (file) => typeof file.url === "string" && file.url.trim().length > 0
  );

  const payload: Record<string, unknown> = {
    status: input.status,
    owner_profile_id: input.ownerProfileId || null,
    notes: input.notes?.trim() || null,
  };

  if (typeof input.vcMacroprocesso !== "undefined") {
    payload.vc_macroprocesso = input.vcMacroprocesso?.trim() || null;
  }

  if (typeof input.vcMacroprocesso !== "undefined" || typeof input.vcLevels !== "undefined") {
    const macro =
      typeof input.vcMacroprocesso !== "undefined"
        ? (input.vcMacroprocesso?.trim() ?? "")
        : String(officeProcess.vc_macroprocesso ?? "").trim();
    const levels =
      typeof input.vcLevels !== "undefined"
        ? compactLevelsForPersist(input.vcLevels)
        : levelsFromRow(officeProcess);
    const derived = (macro || levels[0] || "Processo").trim() || "Processo";
    payload.name = derived;
  } else if (typeof input.name === "string") {
    if (!normalizedName) {
      return { error: "Identificação do processo é obrigatória (macroprocesso e/ou níveis)." };
    }
    payload.name = normalizedName;
  }
  if (typeof input.description !== "undefined") {
    payload.description = input.description?.trim() || null;
  }
  if (typeof input.category !== "undefined") {
    payload.category = input.category?.trim() || null;
  }
  if (typeof input.templateFiles !== "undefined") {
    payload.template_files = normalizedTemplateFiles ?? [];
    payload.template_url = normalizedTemplateFiles?.[0]?.url?.trim() || null;
    payload.template_label = normalizedTemplateFiles?.[0]?.label?.trim() || null;
  }
  if (typeof input.flowchartFiles !== "undefined") {
    payload.flowchart_files = normalizedFlowchartFiles ?? [];
    payload.flowchart_image_url = normalizedFlowchartFiles?.[0]?.url?.trim() || null;
  }

  if (input.status === "in_progress" && !officeProcess.started_at) {
    payload.started_at = now;
  }
  if (input.status === "completed") {
    payload.completed_at = now;
    if (!officeProcess.started_at) payload.started_at = now;
  }
  if (input.status !== "completed" && officeProcess.completed_at) {
    payload.completed_at = null;
  }

  if (typeof input.vcProcessType !== "undefined") {
    payload.vc_process_type = input.vcProcessType;
    payload.vc_tipo_label = null;
  }
  if (typeof input.vcLevels !== "undefined") {
    const compacted = compactLevelsForPersist(input.vcLevels);
    payload.vc_levels = compacted;
    const legacy = mirrorFirstThreeLegacyColumns(compacted);
    payload.vc_level1 = legacy.vc_level1;
    payload.vc_level2 = legacy.vc_level2;
    payload.vc_level3 = legacy.vc_level3;
  }

  const { error } = await supabase
    .from("office_processes")
    .update(payload)
    .eq("id", officeProcess.id);

  if (error) {
    return { error: error.message };
  }

  const changes: string[] = [];
  if (officeProcess.status !== input.status) {
    changes.push(`status alterado para ${OFFICE_PROCESS_STATUS_META[input.status].label}`);
  }
  if ((officeProcess.owner_profile_id ?? null) !== (input.ownerProfileId ?? null)) {
    changes.push("responsável atualizado");
  }
  if ((officeProcess.notes ?? "") !== (input.notes?.trim() ?? "")) {
    changes.push("anotações atualizadas");
  }
  if (typeof payload.name === "string" && officeProcess.name !== payload.name) {
    changes.push("nome do processo atualizado");
  }
  if (typeof input.vcMacroprocesso !== "undefined") {
    const prev = String(officeProcess.vc_macroprocesso ?? "").trim();
    const next = (input.vcMacroprocesso?.trim() ?? "") || "";
    if (prev !== next) {
      changes.push("macroprocesso atualizado");
    }
  }
  if (
    typeof input.description !== "undefined" &&
    (officeProcess.description ?? "") !== (input.description?.trim() ?? "")
  ) {
    changes.push("descrição atualizada");
  }
  if (
    typeof input.category !== "undefined" &&
    (officeProcess.category ?? "") !== (input.category?.trim() ?? "")
  ) {
    changes.push("categoria atualizada");
  }
  if (typeof input.templateFiles !== "undefined") {
    changes.push("templates atualizados");
  }
  if (typeof input.flowchartFiles !== "undefined") {
    changes.push("fluxogramas atualizados");
  }
  if (typeof input.vcProcessType !== "undefined") {
    const prev = (officeProcess.vc_process_type as string | null) ?? null;
    const next = input.vcProcessType;
    if (prev !== next) {
      changes.push("tipo (cadeia de valor) atualizado");
    }
  }
  if (typeof input.vcLevels !== "undefined") {
    const prev = levelsFromRow(officeProcess as Parameters<typeof levelsFromRow>[0]);
    const next = compactLevelsForPersist(input.vcLevels);
    if (JSON.stringify(prev) !== JSON.stringify(next)) {
      changes.push("níveis (cadeia de valor) atualizados");
    }
  }

  if (changes.length > 0) {
    await recordOfficeProcessHistory({
      officeProcessId: officeProcess.id,
      officeId: profile.office_id!,
      actorProfileId: profile.id,
      eventType: "updated",
      description: `Processo atualizado: ${changes.join(", ")}.`,
    });
  }

  revalidatePath(`/escritorio/processos/${officeProcess.id}`);
  revalidatePath("/escritorio/processos");
  revalidatePath("/escritorio/estrategia/cadeia-valor");
  revalidatePath("/escritorio/estrategia/processos-escritorio");
  return { success: true };
}

export async function updateOfficeProcessBpmPhase(input: {
  officeProcessId: string;
  phase: BpmPhaseSlug;
  stageStatus: "not_started" | "in_progress" | "completed";
}) {
  const processAccess = await getOfficeProcessOrError(input.officeProcessId);
  if ("error" in processAccess) return { error: processAccess.error };

  const { profile, officeProcess } = processAccess;
  const supabase = await createServiceClient();
  const now = new Date().toISOString();

  const payload: Record<string, unknown> = {
    stage_status: input.stageStatus,
    updated_at: now,
  };
  if (input.stageStatus === "completed") {
    payload.completed_at = now;
  } else {
    payload.completed_at = null;
  }

  const { error } = await supabase
    .from("office_process_bpm_phases")
    .update(payload)
    .eq("office_process_id", officeProcess.id)
    .eq("phase", input.phase);

  if (error) {
    return { error: error.message };
  }

  await recordOfficeProcessHistory({
    officeProcessId: officeProcess.id,
    officeId: profile.office_id!,
    actorProfileId: profile.id,
    eventType: "bpm_phase_updated",
    description: `Fase BPM atualizada: ${BPM_PHASE_LABELS[input.phase]} → ${bpmStageStatusToLabel(input.stageStatus)}.`,
    metadata: { phase: input.phase, stage_status: input.stageStatus },
  });

  revalidatePath(`/escritorio/processos/${officeProcess.id}`);
  revalidatePath("/escritorio/processos");
  revalidatePath("/escritorio/processos/visao-geral");
  revalidatePath("/escritorio/estrategia/cadeia-valor");
  return { success: true };
}

export async function addOfficeProcessChecklistItem(
  officeProcessId: string,
  title: string,
  description: string
) {
  const processAccess = await getOfficeProcessOrError(officeProcessId);
  if ("error" in processAccess) return { error: processAccess.error };

  if (!title?.trim()) {
    return { error: "Título do item é obrigatório." };
  }

  const { profile, officeProcess } = processAccess;
  const supabase = await createServiceClient();
  const { data: latest } = await supabase
    .from("office_process_checklist_items")
    .select("sort_order")
    .eq("office_process_id", officeProcessId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase
    .from("office_process_checklist_items")
    .insert({
      office_process_id: officeProcessId,
      title: title.trim(),
      description: description.trim() || null,
      sort_order: (latest?.sort_order ?? -1) + 1,
      created_by_profile_id: profile.id,
    });

  if (error) {
    return { error: error.message };
  }

  await recordOfficeProcessHistory({
    officeProcessId,
    officeId: officeProcess.office_id,
    actorProfileId: profile.id,
    eventType: "checklist_item_added",
    description: `Item de checklist adicionado: ${title.trim()}.`,
  });

  revalidatePath(`/escritorio/processos/${officeProcessId}`);
  return { success: true };
}

export async function toggleOfficeProcessChecklistItem(
  itemId: string,
  isCompleted: boolean
) {
  const access = await assertLeaderProfile();
  if ("error" in access) return { error: access.error };

  const supabase = await createServiceClient();
  const { data: item, error: itemError } = await supabase
    .from("office_process_checklist_items")
    .select("id, office_process_id, title")
    .eq("id", itemId)
    .single();

  if (itemError || !item) {
    return { error: "Item de checklist não encontrado." };
  }

  const processAccess = await getOfficeProcessOrError(item.office_process_id);
  if ("error" in processAccess) return { error: processAccess.error };

  const { profile, officeProcess } = processAccess;
  const { error } = await supabase
    .from("office_process_checklist_items")
    .update({
      is_completed: isCompleted,
      completed_at: isCompleted ? new Date().toISOString() : null,
    })
    .eq("id", itemId);

  if (error) {
    return { error: error.message };
  }

  await recordOfficeProcessHistory({
    officeProcessId: officeProcess.id,
    officeId: officeProcess.office_id,
    actorProfileId: profile.id,
    eventType: "checklist_item_updated",
    description: `Item de checklist ${isCompleted ? "concluído" : "reaberto"}: ${item.title}.`,
  });

  revalidatePath(`/escritorio/processos/${officeProcess.id}`);
  return { success: true };
}

export async function uploadOfficeAttachmentFile(formData: FormData) {
  const processAccess = await getOfficeProcessOrError(
    formData.get("officeProcessId") as string
  );
  if ("error" in processAccess) return { error: processAccess.error };

  const file = formData.get("file") as File | null;
  if (!file?.size) return { error: "Selecione um ou mais arquivos." };

  const supabase = await createServiceClient();
  const result = await uploadProcessFile(supabase, file, {
    type: "office_attachment",
    officeProcessId: processAccess.officeProcess.id,
  }, "attachment");

  if ("error" in result) return result;
  return { success: true, url: result.url, filename: result.filename };
}

/** Upload para templates/fluxogramas do processo do escritório (validação por tipo). */
export async function uploadOfficeProcessMaterialFile(formData: FormData) {
  const processAccess = await getOfficeProcessOrError(
    formData.get("officeProcessId") as string
  );
  if ("error" in processAccess) return { error: processAccess.error };

  const kindRaw = formData.get("kind");
  const kind = kindRaw === "flowchart" ? "flowchart" : kindRaw === "template" ? "template" : null;
  if (!kind) {
    return { error: "Tipo de ficheiro inválido (template ou flowchart)." };
  }

  const file = formData.get("file") as File | null;
  if (!file?.size) return { error: "Selecione um ficheiro." };

  const supabase = await createServiceClient();
  const result = await uploadProcessFile(
    supabase,
    file,
    {
      type: "office_attachment",
      officeProcessId: processAccess.officeProcess.id,
    },
    kind
  );

  if ("error" in result) return result;
  return { success: true as const, url: result.url, filename: result.filename };
}

export async function addOfficeProcessAttachment(input: {
  officeProcessId: string;
  title: string;
  attachmentUrl: string;
  attachmentType: OfficeProcessAttachmentType;
}) {
  const processAccess = await getOfficeProcessOrError(input.officeProcessId);
  if ("error" in processAccess) return { error: processAccess.error };

  if (!input.title?.trim() || !input.attachmentUrl?.trim()) {
    return { error: "Título e URL do anexo são obrigatórios." };
  }

  const { profile, officeProcess } = processAccess;
  const supabase = await createServiceClient();
  const { error } = await supabase
    .from("office_process_attachments")
    .insert({
      office_process_id: officeProcess.id,
      title: input.title.trim(),
      attachment_url: input.attachmentUrl.trim(),
      attachment_type: input.attachmentType,
      created_by_profile_id: profile.id,
    });

  if (error) {
    return { error: error.message };
  }

  await recordOfficeProcessHistory({
    officeProcessId: officeProcess.id,
    officeId: officeProcess.office_id,
    actorProfileId: profile.id,
    eventType: "attachment_added",
    description: `Anexo adicionado ao processo: ${input.title.trim()}.`,
  });

  revalidatePath(`/escritorio/processos/${officeProcess.id}`);
  return { success: true };
}

export async function deleteOfficeProcessAttachment(attachmentId: string) {
  const access = await assertLeaderProfile();
  if ("error" in access) return { error: access.error };

  const supabase = await createServiceClient();
  const { data: attachment, error: attachmentError } = await supabase
    .from("office_process_attachments")
    .select("id, office_process_id, title")
    .eq("id", attachmentId)
    .single();

  if (attachmentError || !attachment) {
    return { error: "Anexo não encontrado." };
  }

  const processAccess = await getOfficeProcessOrError(attachment.office_process_id);
  if ("error" in processAccess) return { error: processAccess.error };

  const { profile, officeProcess } = processAccess;
  const { error } = await supabase
    .from("office_process_attachments")
    .delete()
    .eq("id", attachmentId);

  if (error) {
    return { error: error.message };
  }

  await recordOfficeProcessHistory({
    officeProcessId: officeProcess.id,
    officeId: officeProcess.office_id,
    actorProfileId: profile.id,
    eventType: "attachment_removed",
    description: `Anexo removido do processo: ${attachment.title}.`,
  });

  revalidatePath(`/escritorio/processos/${officeProcess.id}`);
  return { success: true };
}

export async function deleteOfficeProcessesBulk(officeProcessIds: string[]) {
  try {
    const access = await assertLeaderProfile();
    if ("error" in access) return { error: access.error };

    const { profile } = access;
    const officeId = profile.office_id;
    const uniqueIds = [...new Set(officeProcessIds.map((id) => String(id).trim()).filter(Boolean))];
    if (uniqueIds.length === 0) {
      return { error: "Nenhum processo selecionado." };
    }

    const runDelete = async () => {
      try {
        const supabase = await createServiceClient();
        return supabase
          .from("office_processes")
          .delete()
          .eq("office_id", officeId)
          .in("id", uniqueIds)
          .select("id");
      } catch {
        const supabase = await createClient();
        return supabase
          .from("office_processes")
          .delete()
          .eq("office_id", officeId)
          .in("id", uniqueIds)
          .select("id");
      }
    };

    const { data: deletedRows, error } = await runDelete();

    if (error) {
      return { error: error.message };
    }

    const n = deletedRows?.length ?? 0;
    if (n === 0) {
      return {
        error:
          "Nenhum processo foi eliminado. Confirme que os processos pertencem ao seu escritório ou tente novamente.",
      };
    }

    revalidatePath("/escritorio/processos");
    revalidatePath("/escritorio/processos/visao-geral");
    revalidatePath("/escritorio/estrategia/cadeia-valor");
    return { success: true as const, deleted: n };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao eliminar processos.";
    return { error: message };
  }
}
