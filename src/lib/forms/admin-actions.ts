"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import type { FormQuestionType, ProcessQuestionType } from "@/types/database";

type AnyQuestionType = ProcessQuestionType | FormQuestionType;

function normalizeQuestionType(type: AnyQuestionType): string {
  if (type === "text") return "short_text";
  return type;
}

function revalidateFormPaths(formId?: string) {
  revalidatePath("/admin/formularios");
  revalidatePath("/admin/questionario-processos");
  revalidatePath("/escritorio/onboarding/processos");

  if (!formId) return;

  revalidatePath(`/admin/formularios/${formId}`);
  revalidatePath(`/admin/questionario-processos/${formId}`);
}

async function getLatestSectionOrder(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  formId: string
) {
  const { data } = await supabase
    .from("process_questionnaire_sections")
    .select("sort_order")
    .eq("questionnaire_id", formId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data?.sort_order ?? -1) + 1;
}

async function getLatestQuestionOrder(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  sectionId: string
) {
  const { data } = await supabase
    .from("process_questionnaire_questions")
    .select("sort_order")
    .eq("section_id", sectionId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data?.sort_order ?? -1) + 1;
}

export type CreateFormInput = {
  title: string;
  description?: string;
  enableProcessLinking: boolean;
  isProcessActivationForm: boolean;
  isRequiredFirstAccess?: boolean;
};

export async function createForm(input: CreateFormInput) {
  if (!input.title?.trim()) {
    return { error: "Título do formulário é obrigatório." };
  }

  const supabase = await createServiceClient();

  if (input.isProcessActivationForm) {
    const { data: existing } = await supabase
      .from("process_questionnaires")
      .select("id")
      .eq("is_process_activation_form", true)
      .maybeSingle();
    if (existing) {
      return { error: "Já existe um formulário de ativação. Desative-o antes de criar outro." };
    }
  }

  const { data: latest } = await supabase
    .from("process_questionnaires")
    .select("version")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("process_questionnaires")
    .insert({
      title: input.title.trim(),
      description: input.description?.trim() || null,
      version: (latest?.version ?? 0) + 1,
      is_active: false,
      is_required_first_access:
        input.isRequiredFirstAccess ?? input.isProcessActivationForm,
      enable_process_linking: input.enableProcessLinking,
      is_process_activation_form: input.isProcessActivationForm,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Não foi possível criar o formulário." };
  }

  const { error: sectionError } = await supabase
    .from("process_questionnaire_sections")
    .insert({
      questionnaire_id: data.id,
      title: "Etapa 1",
      description: "Apresente as perguntas iniciais desta etapa.",
      sort_order: 0,
    });

  if (sectionError) {
    await supabase.from("process_questionnaires").delete().eq("id", data.id);
    return { error: sectionError.message };
  }

  revalidateFormPaths(data.id);
  return { success: true, id: data.id };
}

export async function updateForm(
  id: string,
  input: {
    title: string;
    description?: string;
    isRequiredFirstAccess: boolean;
    enableProcessLinking: boolean;
    isProcessActivationForm: boolean;
  }
) {
  if (!input.title?.trim()) {
    return { error: "Título do formulário é obrigatório." };
  }

  const supabase = await createServiceClient();

  if (input.isProcessActivationForm) {
    const { data: existing } = await supabase
      .from("process_questionnaires")
      .select("id")
      .eq("is_process_activation_form", true)
      .neq("id", id)
      .maybeSingle();
    if (existing) {
      return { error: "Já existe um formulário de ativação. Desative-o antes." };
    }
  }

  const { error } = await supabase
    .from("process_questionnaires")
    .update({
      title: input.title.trim(),
      description: input.description?.trim() || null,
      is_required_first_access: input.isRequiredFirstAccess,
      enable_process_linking: input.enableProcessLinking,
      is_process_activation_form: input.isProcessActivationForm,
    })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidateFormPaths(id);
  return { success: true };
}

export async function setActiveForm(id: string) {
  const supabase = await createServiceClient();

  const { error: deactivateError } = await supabase
    .from("process_questionnaires")
    .update({ is_active: false })
    .neq("id", id);

  if (deactivateError) {
    return { error: deactivateError.message };
  }

  const { error } = await supabase
    .from("process_questionnaires")
    .update({ is_active: true })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidateFormPaths(id);
  return { success: true };
}

export async function deleteForm(id: string) {
  const supabase = await createServiceClient();
  const { error } = await supabase
    .from("process_questionnaires")
    .delete()
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidateFormPaths();
  return { success: true };
}

export async function addSection(
  formId: string,
  input: {
    title: string;
    subtitle?: string;
    description?: string;
  }
) {
  if (!input.title?.trim()) {
    return { error: "O título da etapa é obrigatório." };
  }

  const supabase = await createServiceClient();
  const sortOrder = await getLatestSectionOrder(supabase, formId);

  const { data, error } = await supabase
    .from("process_questionnaire_sections")
    .insert({
      questionnaire_id: formId,
      title: input.title.trim(),
      subtitle: input.subtitle?.trim() || null,
      description: input.description?.trim() || null,
      sort_order: sortOrder,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Não foi possível criar a etapa." };
  }

  revalidateFormPaths(formId);
  return { success: true, id: data.id };
}

export async function updateSection(
  sectionId: string,
  formId: string,
  input: {
    title: string;
    subtitle?: string;
    description?: string;
  }
) {
  if (!input.title?.trim()) {
    return { error: "O título da etapa é obrigatório." };
  }

  const supabase = await createServiceClient();
  const { error } = await supabase
    .from("process_questionnaire_sections")
    .update({
      title: input.title.trim(),
      subtitle: input.subtitle?.trim() || null,
      description: input.description?.trim() || null,
    })
    .eq("id", sectionId);

  if (error) {
    return { error: error.message };
  }

  revalidateFormPaths(formId);
  return { success: true };
}

export async function deleteSection(sectionId: string, formId: string) {
  const supabase = await createServiceClient();
  const { count, error: countError } = await supabase
    .from("process_questionnaire_questions")
    .select("id", { count: "exact", head: true })
    .eq("section_id", sectionId);

  if (countError) {
    return { error: countError.message };
  }

  if ((count ?? 0) > 0) {
    return { error: "Remova ou mova as perguntas da etapa antes de excluí-la." };
  }

  const { error } = await supabase
    .from("process_questionnaire_sections")
    .delete()
    .eq("id", sectionId);

  if (error) {
    return { error: error.message };
  }

  revalidateFormPaths(formId);
  return { success: true };
}

export async function reorderSections(formId: string, sectionIds: string[]) {
  const supabase = await createServiceClient();

  for (let index = 0; index < sectionIds.length; index += 1) {
    const { error } = await supabase
      .from("process_questionnaire_sections")
      .update({ sort_order: index })
      .eq("id", sectionIds[index])
      .eq("questionnaire_id", formId);

    if (error) {
      return { error: error.message };
    }
  }

  revalidateFormPaths(formId);
  return { success: true };
}

export async function addQuestion(
  formId: string,
  input: {
    sectionId: string;
    prompt: string;
    helperText?: string;
    questionType: FormQuestionType;
    isRequired: boolean;
    enableProcessLinking: boolean;
    linkedProcessIds: string[];
  }
) {
  if (!input.prompt?.trim()) {
    return { error: "O texto da pergunta é obrigatório." };
  }

  const supabase = await createServiceClient();
  const sortOrder = await getLatestQuestionOrder(supabase, input.sectionId);
  const qType = normalizeQuestionType(input.questionType);

  const { data, error } = await supabase
    .from("process_questionnaire_questions")
    .insert({
      questionnaire_id: formId,
      section_id: input.sectionId,
      prompt: input.prompt.trim(),
      helper_text: input.helperText?.trim() || null,
      question_type: qType,
      is_required: input.isRequired,
      enable_process_linking: input.enableProcessLinking,
      sort_order: sortOrder,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Não foi possível criar a pergunta." };
  }

  if (input.enableProcessLinking && input.linkedProcessIds.length > 0) {
    const { error: linkError } = await supabase
      .from("process_questionnaire_question_processes")
      .insert(
        input.linkedProcessIds.map((baseProcessId) => ({
          question_id: data.id,
          base_process_id: baseProcessId,
        }))
      );

    if (linkError) {
      return { error: linkError.message };
    }
  }

  revalidateFormPaths(formId);
  return { success: true, id: data.id };
}

export async function updateQuestion(
  questionId: string,
  formId: string,
  input: {
    sectionId: string;
    prompt: string;
    helperText?: string;
    questionType: FormQuestionType;
    isRequired: boolean;
    enableProcessLinking: boolean;
    linkedProcessIds: string[];
  }
) {
  if (!input.prompt?.trim()) {
    return { error: "O texto da pergunta é obrigatório." };
  }

  const supabase = await createServiceClient();
  const qType = normalizeQuestionType(input.questionType);
  const { data: currentQuestion, error: currentQuestionError } = await supabase
    .from("process_questionnaire_questions")
    .select("section_id")
    .eq("id", questionId)
    .single();

  if (currentQuestionError || !currentQuestion) {
    return { error: currentQuestionError?.message ?? "Pergunta não encontrada." };
  }

  const nextSortOrder =
    currentQuestion.section_id === input.sectionId
      ? undefined
      : await getLatestQuestionOrder(supabase, input.sectionId);

  const { error } = await supabase
    .from("process_questionnaire_questions")
    .update({
      section_id: input.sectionId,
      prompt: input.prompt.trim(),
      helper_text: input.helperText?.trim() || null,
      question_type: qType,
      is_required: input.isRequired,
      enable_process_linking: input.enableProcessLinking,
      ...(typeof nextSortOrder === "number" ? { sort_order: nextSortOrder } : {}),
    })
    .eq("id", questionId);

  if (error) {
    return { error: error.message };
  }

  await supabase
    .from("process_questionnaire_question_processes")
    .delete()
    .eq("question_id", questionId);

  if (input.enableProcessLinking && input.linkedProcessIds.length > 0) {
    const { error: linkError } = await supabase
      .from("process_questionnaire_question_processes")
      .insert(
        input.linkedProcessIds.map((baseProcessId) => ({
          question_id: questionId,
          base_process_id: baseProcessId,
        }))
      );

    if (linkError) {
      return { error: linkError.message };
    }
  }

  revalidateFormPaths(formId);
  return { success: true };
}

export async function deleteQuestion(questionId: string, formId: string) {
  const supabase = await createServiceClient();
  const { error } = await supabase
    .from("process_questionnaire_questions")
    .delete()
    .eq("id", questionId);

  if (error) {
    return { error: error.message };
  }

  revalidateFormPaths(formId);
  return { success: true };
}

export async function reorderQuestions(
  formId: string,
  sectionId: string,
  questionIds: string[]
) {
  const supabase = await createServiceClient();

  for (let index = 0; index < questionIds.length; index += 1) {
    const { error } = await supabase
      .from("process_questionnaire_questions")
      .update({ sort_order: index })
      .eq("id", questionIds[index])
      .eq("questionnaire_id", formId)
      .eq("section_id", sectionId);

    if (error) {
      return { error: error.message };
    }
  }

  revalidateFormPaths(formId);
  return { success: true };
}

export async function duplicateQuestion(questionId: string, formId: string) {
  const supabase = await createServiceClient();

  const { data: question, error: qError } = await supabase
    .from("process_questionnaire_questions")
    .select(
      "section_id, prompt, helper_text, question_type, is_required, enable_process_linking"
    )
    .eq("id", questionId)
    .single();

  if (qError || !question) {
    return { error: qError?.message ?? "Pergunta não encontrada." };
  }

  const { data: links } = await supabase
    .from("process_questionnaire_question_processes")
    .select("base_process_id")
    .eq("question_id", questionId);

  const sortOrder = await getLatestQuestionOrder(supabase, question.section_id);

  const { data: newQuestion, error: insertError } = await supabase
    .from("process_questionnaire_questions")
    .insert({
      questionnaire_id: formId,
      section_id: question.section_id,
      prompt: `${question.prompt} (cópia)`,
      helper_text: question.helper_text,
      question_type: question.question_type,
      is_required: question.is_required,
      enable_process_linking: question.enable_process_linking,
      sort_order: sortOrder,
    })
    .select("id")
    .single();

  if (insertError || !newQuestion) {
    return { error: insertError?.message ?? "Não foi possível duplicar." };
  }

  if (question.enable_process_linking && (links?.length ?? 0) > 0) {
    await supabase.from("process_questionnaire_question_processes").insert(
      (links ?? []).map((link) => ({
        question_id: newQuestion.id,
        base_process_id: link.base_process_id,
      }))
    );
  }

  const { data: options } = await supabase
    .from("process_questionnaire_options")
    .select("id, label, value, helper_text, sort_order, is_active, enable_process_linking")
    .eq("question_id", questionId)
    .order("sort_order", { ascending: true });

  if (options?.length) {
    for (const option of options) {
      const { data: newOption } = await supabase
        .from("process_questionnaire_options")
        .insert({
          question_id: newQuestion.id,
          label: option.label,
          value: option.value || option.label,
          helper_text: option.helper_text,
          sort_order: option.sort_order,
          is_active: option.is_active,
          enable_process_linking: option.enable_process_linking,
        })
        .select("id")
        .single();

      if (newOption && option.enable_process_linking) {
        const { data: optionLinks } = await supabase
          .from("process_questionnaire_option_processes")
          .select("base_process_id")
          .eq("option_id", option.id);

        if (optionLinks?.length) {
          await supabase.from("process_questionnaire_option_processes").insert(
            optionLinks.map((link) => ({
              option_id: newOption.id,
              base_process_id: link.base_process_id,
            }))
          );
        }
      }
    }
  }

  revalidateFormPaths(formId);
  return { success: true, id: newQuestion.id };
}

export async function addOption(
  questionId: string,
  formId: string,
  input: {
    label: string;
    value?: string;
    helperText?: string;
    enableProcessLinking: boolean;
    linkedProcessIds: string[];
  }
) {
  if (!input.label?.trim()) {
    return { error: "O texto da alternativa é obrigatório." };
  }

  const supabase = await createServiceClient();
  const { data: latestOrder } = await supabase
    .from("process_questionnaire_options")
    .select("sort_order")
    .eq("question_id", questionId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("process_questionnaire_options")
    .insert({
      question_id: questionId,
      label: input.label.trim(),
      value: input.value?.trim() || input.label.trim(),
      helper_text: input.helperText?.trim() || null,
      sort_order: (latestOrder?.sort_order ?? -1) + 1,
      is_active: true,
      enable_process_linking: input.enableProcessLinking,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Não foi possível criar a alternativa." };
  }

  if (input.enableProcessLinking && input.linkedProcessIds.length > 0) {
    const { error: linkError } = await supabase
      .from("process_questionnaire_option_processes")
      .insert(
        input.linkedProcessIds.map((baseProcessId) => ({
          option_id: data.id,
          base_process_id: baseProcessId,
        }))
      );

    if (linkError) {
      return { error: linkError.message };
    }
  }

  revalidateFormPaths(formId);
  return { success: true, id: data.id };
}

export async function updateOption(
  optionId: string,
  formId: string,
  input: {
    label: string;
    value?: string;
    helperText?: string;
    enableProcessLinking: boolean;
    linkedProcessIds: string[];
    isActive: boolean;
  }
) {
  if (!input.label?.trim()) {
    return { error: "O texto da alternativa é obrigatório." };
  }

  const supabase = await createServiceClient();
  const { error } = await supabase
    .from("process_questionnaire_options")
    .update({
      label: input.label.trim(),
      value: input.value?.trim() || input.label.trim(),
      helper_text: input.helperText?.trim() || null,
      is_active: input.isActive,
      enable_process_linking: input.enableProcessLinking,
    })
    .eq("id", optionId);

  if (error) {
    return { error: error.message };
  }

  await supabase
    .from("process_questionnaire_option_processes")
    .delete()
    .eq("option_id", optionId);

  if (input.enableProcessLinking && input.linkedProcessIds.length > 0) {
    const { error: linkError } = await supabase
      .from("process_questionnaire_option_processes")
      .insert(
        input.linkedProcessIds.map((baseProcessId) => ({
          option_id: optionId,
          base_process_id: baseProcessId,
        }))
      );

    if (linkError) {
      return { error: linkError.message };
    }
  }

  revalidateFormPaths(formId);
  return { success: true };
}

export async function deleteOption(optionId: string, formId: string) {
  const supabase = await createServiceClient();
  const { error } = await supabase
    .from("process_questionnaire_options")
    .delete()
    .eq("id", optionId);

  if (error) {
    return { error: error.message };
  }

  revalidateFormPaths(formId);
  return { success: true };
}
