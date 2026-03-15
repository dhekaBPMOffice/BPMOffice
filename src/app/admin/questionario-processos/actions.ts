"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import type { ProcessQuestionType } from "@/types/database";

export async function createQuestionnaire(title: string, description: string) {
  if (!title?.trim()) {
    return { error: "Título do questionário é obrigatório." };
  }

  const supabase = await createServiceClient();

  const { data: latest } = await supabase
    .from("process_questionnaires")
    .select("version")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("process_questionnaires")
    .insert({
      title: title.trim(),
      description: description?.trim() || null,
      version: (latest?.version ?? 0) + 1,
      is_active: false,
      is_required_first_access: true,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Não foi possível criar o questionário." };
  }

  revalidatePath("/admin/questionario-processos");
  return { success: true, id: data.id };
}

export async function updateQuestionnaire(
  id: string,
  input: {
    title: string;
    description?: string;
    isRequiredFirstAccess: boolean;
  }
) {
  if (!input.title?.trim()) {
    return { error: "Título do questionário é obrigatório." };
  }

  const supabase = await createServiceClient();
  const { error } = await supabase
    .from("process_questionnaires")
    .update({
      title: input.title.trim(),
      description: input.description?.trim() || null,
      is_required_first_access: input.isRequiredFirstAccess,
    })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/questionario-processos");
  revalidatePath(`/admin/questionario-processos/${id}`);
  return { success: true };
}

export async function setActiveQuestionnaire(id: string) {
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

  revalidatePath("/admin/questionario-processos");
  revalidatePath(`/admin/questionario-processos/${id}`);
  return { success: true };
}

export async function deleteQuestionnaire(id: string) {
  const supabase = await createServiceClient();
  const { error } = await supabase
    .from("process_questionnaires")
    .delete()
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/questionario-processos");
  return { success: true };
}

export async function addQuestion(
  questionnaireId: string,
  input: {
    prompt: string;
    helperText?: string;
    questionType: ProcessQuestionType;
    isRequired: boolean;
    enableProcessLinking: boolean;
    linkedProcessIds: string[];
  }
) {
  if (!input.prompt?.trim()) {
    return { error: "O texto da pergunta é obrigatório." };
  }

  const supabase = await createServiceClient();
  const { data: latestOrder } = await supabase
    .from("process_questionnaire_questions")
    .select("sort_order")
    .eq("questionnaire_id", questionnaireId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("process_questionnaire_questions")
    .insert({
      questionnaire_id: questionnaireId,
      prompt: input.prompt.trim(),
      helper_text: input.helperText?.trim() || null,
      question_type: input.questionType,
      is_required: input.isRequired,
      enable_process_linking: input.enableProcessLinking,
      sort_order: (latestOrder?.sort_order ?? -1) + 1,
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

  revalidatePath(`/admin/questionario-processos/${questionnaireId}`);
  return { success: true, id: data.id };
}

export async function updateQuestion(
  questionId: string,
  questionnaireId: string,
  input: {
    prompt: string;
    helperText?: string;
    questionType: ProcessQuestionType;
    isRequired: boolean;
    enableProcessLinking: boolean;
    linkedProcessIds: string[];
  }
) {
  if (!input.prompt?.trim()) {
    return { error: "O texto da pergunta é obrigatório." };
  }

  const supabase = await createServiceClient();
  const { error } = await supabase
    .from("process_questionnaire_questions")
    .update({
      prompt: input.prompt.trim(),
      helper_text: input.helperText?.trim() || null,
      question_type: input.questionType,
      is_required: input.isRequired,
      enable_process_linking: input.enableProcessLinking,
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

  revalidatePath(`/admin/questionario-processos/${questionnaireId}`);
  return { success: true };
}

export async function deleteQuestion(questionId: string, questionnaireId: string) {
  const supabase = await createServiceClient();
  const { error } = await supabase
    .from("process_questionnaire_questions")
    .delete()
    .eq("id", questionId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/admin/questionario-processos/${questionnaireId}`);
  return { success: true };
}

export async function addOption(
  questionId: string,
  questionnaireId: string,
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

  revalidatePath(`/admin/questionario-processos/${questionnaireId}`);
  return { success: true };
}

export async function updateOption(
  optionId: string,
  questionnaireId: string,
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

  revalidatePath(`/admin/questionario-processos/${questionnaireId}`);
  return { success: true };
}

export async function deleteOption(optionId: string, questionnaireId: string) {
  const supabase = await createServiceClient();
  const { error } = await supabase
    .from("process_questionnaire_options")
    .delete()
    .eq("id", optionId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/admin/questionario-processos/${questionnaireId}`);
  return { success: true };
}
