"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import type { FormQuestionType } from "@/types/database";

type SupabaseService = Awaited<ReturnType<typeof createServiceClient>>;

type SourceQuestion = {
  id: string;
  section_id: string;
  prompt: string;
  helper_text: string | null;
  question_type: string;
  is_required: boolean;
  sort_order: number;
  demand_field_key: string | null;
};

function normalizeQuestionType(type: string): FormQuestionType {
  if (type === "text" || type === "short_text") return "short_text";
  if (
    type === "long_text" ||
    type === "single_select" ||
    type === "multi_select" ||
    type === "date" ||
    type === "file_upload"
  ) {
    return type;
  }
  return "short_text";
}

function demandFormPaths(formId?: string) {
  revalidatePath("/escritorio/demandas");
  revalidatePath("/escritorio/demandas/formulario");
  if (formId) revalidatePath(`/demandas/abrir/${formId}`);
}

async function getOfficeId() {
  const profile = await requireRole(["leader", "user"]);
  if (!profile.office_id) {
    throw new Error("Escritório não encontrado.");
  }
  return profile.office_id;
}

async function ensureOfficeForm(supabase: SupabaseService, officeId: string) {
  const { data: existing, error: existingError } = await supabase
    .from("office_demand_forms")
    .select("*")
    .eq("office_id", officeId)
    .maybeSingle();

  if (existingError) {
    return { error: existingError.message };
  }

  if (existing) {
    return { data: existing };
  }

  const { data: template, error: templateError } = await supabase
    .from("process_questionnaires")
    .select("id, title, description, uses_sections")
    .eq("is_demand_intake_template", true)
    .maybeSingle();

  if (templateError) {
    return { error: templateError.message };
  }

  if (!template) {
    return {
      error:
        "Nenhum formulário padrão de abertura de demandas foi configurado pelo admin master.",
    };
  }

  const { data: form, error: formError } = await supabase
    .from("office_demand_forms")
    .insert({
      office_id: officeId,
      source_questionnaire_id: template.id,
      title: template.title,
      description: template.description,
      is_active: true,
      uses_sections: template.uses_sections ?? true,
      public_token: randomUUID().replaceAll("-", ""),
    })
    .select("*")
    .single();

  if (formError || !form) {
    return { error: formError?.message ?? "Não foi possível criar o formulário do escritório." };
  }

  const { data: sourceSections, error: sectionsError } = await supabase
    .from("process_questionnaire_sections")
    .select("id, title, subtitle, description, sort_order")
    .eq("questionnaire_id", template.id)
    .order("sort_order", { ascending: true });

  if (sectionsError) return { error: sectionsError.message };

  const sectionIdMap = new Map<string, string>();
  for (const section of sourceSections ?? []) {
    const { data: newSection, error } = await supabase
      .from("office_demand_form_sections")
      .insert({
        office_demand_form_id: form.id,
        title: section.title,
        subtitle: section.subtitle,
        description: section.description,
        sort_order: section.sort_order,
      })
      .select("id")
      .single();
    if (error || !newSection) return { error: error?.message ?? "Erro ao copiar etapa." };
    sectionIdMap.set(section.id, newSection.id);
  }

  const { data: sourceQuestions, error: questionsError } = await supabase
    .from("process_questionnaire_questions")
    .select("id, section_id, prompt, helper_text, question_type, is_required, sort_order, demand_field_key")
    .eq("questionnaire_id", template.id)
    .order("sort_order", { ascending: true });

  if (questionsError) return { error: questionsError.message };

  const questionIdMap = new Map<string, string>();
  for (const question of (sourceQuestions ?? []) as SourceQuestion[]) {
    const sectionId = sectionIdMap.get(question.section_id);
    if (!sectionId) continue;
    const { data: newQuestion, error } = await supabase
      .from("office_demand_form_questions")
      .insert({
        office_demand_form_id: form.id,
        section_id: sectionId,
        prompt: question.prompt,
        helper_text: question.helper_text,
        question_type: normalizeQuestionType(question.question_type),
        is_required: question.is_required,
        sort_order: question.sort_order,
        demand_field_key: question.demand_field_key,
      })
      .select("id")
      .single();
    if (error || !newQuestion) return { error: error?.message ?? "Erro ao copiar pergunta." };
    questionIdMap.set(question.id, newQuestion.id);
  }

  const { data: sourceOptions, error: optionsError } = await supabase
    .from("process_questionnaire_options")
    .select("id, question_id, label, value, helper_text, sort_order, is_active")
    .in("question_id", (sourceQuestions ?? []).map((question) => question.id))
    .order("sort_order", { ascending: true });

  if (optionsError) return { error: optionsError.message };

  const optionRows = (sourceOptions ?? [])
    .map((option) => {
      const questionId = questionIdMap.get(option.question_id);
      if (!questionId) return null;
      return {
        question_id: questionId,
        label: option.label,
        value: option.value,
        helper_text: option.helper_text,
        sort_order: option.sort_order,
        is_active: option.is_active,
      };
    })
    .filter(Boolean);

  if (optionRows.length > 0) {
    const { error } = await supabase.from("office_demand_form_options").insert(optionRows);
    if (error) return { error: error.message };
  }

  return { data: form };
}

export async function getOfficeDemandFormData() {
  const officeId = await getOfficeId();
  const supabase = await createServiceClient();
  const ensured = await ensureOfficeForm(supabase, officeId);
  if ("error" in ensured && ensured.error) return ensured;

  const form = ensured.data;
  const [
    { data: sections, error: sectionsError },
    { data: questions, error: questionsError },
  ] = await Promise.all([
    supabase
      .from("office_demand_form_sections")
      .select("id, title, subtitle, description, sort_order")
      .eq("office_demand_form_id", form.id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("office_demand_form_questions")
      .select(`
        id,
        office_demand_form_id,
        section_id,
        prompt,
        helper_text,
        question_type,
        is_required,
        sort_order,
        demand_field_key,
        office_demand_form_options (
          id,
          label,
          value,
          helper_text,
          sort_order,
          is_active
        )
      `)
      .eq("office_demand_form_id", form.id)
      .order("sort_order", { ascending: true }),
  ]);

  if (sectionsError || questionsError) {
    return { error: sectionsError?.message ?? questionsError?.message ?? "Erro ao carregar formulário." };
  }

  return { data: { form, sections: sections ?? [], questions: questions ?? [] } };
}

export async function updateOfficeDemandForm(input: {
  title: string;
  description?: string;
  isActive: boolean;
  usesSections?: boolean;
}) {
  const officeId = await getOfficeId();
  const supabase = await createServiceClient();
  const { data: form, error: formError } = await supabase
    .from("office_demand_forms")
    .select("id")
    .eq("office_id", officeId)
    .single();
  if (formError || !form) return { error: formError?.message ?? "Formulário não encontrado." };

  const { error } = await supabase
    .from("office_demand_forms")
    .update({
      title: input.title.trim(),
      description: input.description?.trim() || null,
      is_active: input.isActive,
      ...(typeof input.usesSections === "boolean" ? { uses_sections: input.usesSections } : {}),
    })
    .eq("id", form.id)
    .eq("office_id", officeId);

  if (error) return { error: error.message };
  demandFormPaths();
  return { success: true };
}

export async function regenerateOfficeDemandFormToken() {
  const officeId = await getOfficeId();
  const supabase = await createServiceClient();
  const { error } = await supabase
    .from("office_demand_forms")
    .update({ public_token: randomUUID().replaceAll("-", "") })
    .eq("office_id", officeId);
  if (error) return { error: error.message };
  demandFormPaths();
  return { success: true };
}

async function getLatestOrder(
  supabase: SupabaseService,
  table: "office_demand_form_sections" | "office_demand_form_questions" | "office_demand_form_options",
  column: string,
  id: string
) {
  const { data } = await supabase
    .from(table)
    .select("sort_order")
    .eq(column, id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.sort_order ?? -1) + 1;
}

export async function addOfficeDemandFormSection(input: { title: string }) {
  const officeId = await getOfficeId();
  const supabase = await createServiceClient();
  const ensured = await ensureOfficeForm(supabase, officeId);
  if ("error" in ensured && ensured.error) return ensured;
  const form = ensured.data;
  const sortOrder = await getLatestOrder(supabase, "office_demand_form_sections", "office_demand_form_id", form.id);

  const { error } = await supabase.from("office_demand_form_sections").insert({
    office_demand_form_id: form.id,
    title: input.title.trim(),
    sort_order: sortOrder,
  });
  if (error) return { error: error.message };
  demandFormPaths();
  return { success: true };
}

export async function updateOfficeDemandFormSection(
  sectionId: string,
  input: { title: string; subtitle?: string; description?: string }
) {
  await getOfficeId();
  const supabase = await createServiceClient();
  const { error } = await supabase
    .from("office_demand_form_sections")
    .update({
      title: input.title.trim(),
      subtitle: input.subtitle?.trim() || null,
      description: input.description?.trim() || null,
    })
    .eq("id", sectionId);
  if (error) return { error: error.message };
  demandFormPaths();
  return { success: true };
}

export async function deleteOfficeDemandFormSection(sectionId: string) {
  await getOfficeId();
  const supabase = await createServiceClient();
  const { error } = await supabase.from("office_demand_form_sections").delete().eq("id", sectionId);
  if (error) return { error: error.message };
  demandFormPaths();
  return { success: true };
}

export async function reorderOfficeDemandFormSections(sectionIds: string[]) {
  await getOfficeId();
  const supabase = await createServiceClient();
  for (let index = 0; index < sectionIds.length; index += 1) {
    const { error } = await supabase
      .from("office_demand_form_sections")
      .update({ sort_order: index })
      .eq("id", sectionIds[index]);
    if (error) return { error: error.message };
  }
  demandFormPaths();
  return { success: true };
}

export async function addOfficeDemandFormQuestion(
  sectionId: string,
  input: { prompt: string; questionType: FormQuestionType; isRequired: boolean }
) {
  const officeId = await getOfficeId();
  const supabase = await createServiceClient();
  const ensured = await ensureOfficeForm(supabase, officeId);
  if ("error" in ensured && ensured.error) return ensured;
  const form = ensured.data;
  const sortOrder = await getLatestOrder(supabase, "office_demand_form_questions", "section_id", sectionId);
  const { error } = await supabase.from("office_demand_form_questions").insert({
    office_demand_form_id: form.id,
    section_id: sectionId,
    prompt: input.prompt.trim(),
    question_type: input.questionType,
    is_required: input.isRequired,
    sort_order: sortOrder,
  });
  if (error) return { error: error.message };
  demandFormPaths();
  return { success: true };
}

export async function updateOfficeDemandFormQuestion(
  questionId: string,
  input: {
    prompt: string;
    helperText?: string;
    questionType: FormQuestionType;
    isRequired: boolean;
  }
) {
  await getOfficeId();
  const supabase = await createServiceClient();
  const { error } = await supabase
    .from("office_demand_form_questions")
    .update({
      prompt: input.prompt.trim(),
      helper_text: input.helperText?.trim() || null,
      question_type: input.questionType,
      is_required: input.isRequired,
    })
    .eq("id", questionId);
  if (error) return { error: error.message };
  demandFormPaths();
  return { success: true };
}

export async function deleteOfficeDemandFormQuestion(questionId: string) {
  await getOfficeId();
  const supabase = await createServiceClient();
  const { error } = await supabase.from("office_demand_form_questions").delete().eq("id", questionId);
  if (error) return { error: error.message };
  demandFormPaths();
  return { success: true };
}

export async function reorderOfficeDemandFormQuestions(sectionId: string, questionIds: string[]) {
  await getOfficeId();
  const supabase = await createServiceClient();
  for (let index = 0; index < questionIds.length; index += 1) {
    const { error } = await supabase
      .from("office_demand_form_questions")
      .update({ sort_order: index, section_id: sectionId })
      .eq("id", questionIds[index]);
    if (error) return { error: error.message };
  }
  demandFormPaths();
  return { success: true };
}

export async function addOfficeDemandFormOption(
  questionId: string,
  input: { label: string; value?: string; helperText?: string; isActive?: boolean }
) {
  await getOfficeId();
  const supabase = await createServiceClient();
  const sortOrder = await getLatestOrder(supabase, "office_demand_form_options", "question_id", questionId);
  const { error } = await supabase.from("office_demand_form_options").insert({
    question_id: questionId,
    label: input.label.trim(),
    value: input.value?.trim() || input.label.trim(),
    helper_text: input.helperText?.trim() || null,
    sort_order: sortOrder,
    is_active: input.isActive ?? true,
  });
  if (error) return { error: error.message };
  demandFormPaths();
  return { success: true };
}

export async function updateOfficeDemandFormOption(
  optionId: string,
  input: { label: string; value?: string; helperText?: string; isActive: boolean }
) {
  await getOfficeId();
  const supabase = await createServiceClient();
  const { error } = await supabase
    .from("office_demand_form_options")
    .update({
      label: input.label.trim(),
      value: input.value?.trim() || input.label.trim(),
      helper_text: input.helperText?.trim() || null,
      is_active: input.isActive,
    })
    .eq("id", optionId);
  if (error) return { error: error.message };
  demandFormPaths();
  return { success: true };
}

export async function deleteOfficeDemandFormOption(optionId: string) {
  await getOfficeId();
  const supabase = await createServiceClient();
  const { error } = await supabase.from("office_demand_form_options").delete().eq("id", optionId);
  if (error) return { error: error.message };
  demandFormPaths();
  return { success: true };
}
