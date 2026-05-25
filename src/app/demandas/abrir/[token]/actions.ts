"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { uploadFormAnswerFile } from "@/lib/form-answer-files";
import type { FormAnswerFile } from "@/types/database";

export async function submitPublicDemand(
  token: string,
  formData: FormData
) {
  const supabase = await createServiceClient();

  const { data: form, error: formError } = await supabase
    .from("office_demand_forms")
    .select("id, office_id, title, is_active")
    .eq("public_token", token)
    .eq("is_active", true)
    .maybeSingle();

  if (formError) return { error: formError.message };
  if (!form) return { error: "Formulário indisponível." };

  const { data: questions, error: questionsError } = await supabase
    .from("office_demand_form_questions")
    .select(`
      id,
      prompt,
      question_type,
      is_required,
      demand_field_key,
      office_demand_form_options (
        id,
        label,
        value,
        is_active
      )
    `)
    .eq("office_demand_form_id", form.id);

  if (questionsError) return { error: questionsError.message };

  const valueByFieldKey = new Map<string, string>();
  const uploadedFilesByQuestion = new Map<string, FormAnswerFile[]>();

  for (const question of questions ?? []) {
    if (question.question_type !== "file_upload") continue;

    const files = formData
      .getAll(`question_${question.id}`)
      .filter((value): value is File => value instanceof File && value.size > 0);

    const uploadedFiles = [];
    for (const file of files) {
      const uploaded = await uploadFormAnswerFile(
        supabase,
        file,
        `public-demand/${form.id}/${question.id}/${Date.now()}`
      );
      if ("error" in uploaded) return { error: uploaded.error };
      uploadedFiles.push(uploaded);
    }
    uploadedFilesByQuestion.set(question.id, uploadedFiles);
  }

  for (const question of questions ?? []) {
    const options = (question.office_demand_form_options ?? []) as {
      id: string;
      label: string;
      value: string | null;
      is_active: boolean;
    }[];
    const fieldName = `question_${question.id}`;
    const selectedIds =
      question.question_type === "multi_select"
        ? formData.getAll(fieldName).map(String)
        : question.question_type === "single_select"
          ? [formData.get(fieldName)].filter(Boolean).map(String)
          : [];
    const selectedOption = options.find((option) => selectedIds.includes(option.id));
    const answerText =
      question.question_type === "short_text" ||
      question.question_type === "long_text" ||
      question.question_type === "date"
        ? String(formData.get(fieldName) ?? "")
        : "";
    const uploadedFiles = uploadedFilesByQuestion.get(question.id) ?? [];
    const value =
      answerText.trim() ||
      selectedOption?.value?.trim() ||
      selectedOption?.label?.trim() ||
      "";

    if (question.demand_field_key && value) {
      valueByFieldKey.set(question.demand_field_key, value);
    }

    if (!question.is_required) continue;
    const hasText = Boolean(answerText.trim());
    const hasOptions = selectedIds.length > 0;
    const hasFiles = uploadedFiles.length > 0;
    if (!hasText && !hasOptions && !hasFiles) {
      return { error: `Responda a pergunta obrigatória: ${question.prompt}` };
    }
  }

  const requesterName = valueByFieldKey.get("requester_name") ?? "";
  const requesterEmail = valueByFieldKey.get("requester_email") ?? "";
  const requesterArea = valueByFieldKey.get("requester_area") ?? "";
  const title = valueByFieldKey.get("demand_title") ?? "";
  const description = valueByFieldKey.get("demand_description") ?? "";
  const rawPriority = valueByFieldKey.get("priority") || "medium";
  const priority = ["low", "medium", "high", "urgent"].includes(rawPriority)
    ? rawPriority
    : "medium";

  if (!requesterName || !requesterEmail || !title) {
    return {
      error:
        "O formulário precisa ter respostas para Nome, E-mail e Título da demanda. Verifique o modelo configurado pelo escritório.",
    };
  }

  const publicCode = `DEM-${Date.now().toString(36).toUpperCase()}`;
  const { data: demand, error: demandError } = await supabase
    .from("demands")
    .insert({
      office_id: form.office_id,
      title,
      description: description || null,
      priority,
      external_ticket_id: publicCode,
      created_by: null,
    })
    .select("id")
    .single();

  if (demandError || !demand) {
    return { error: demandError?.message ?? "Não foi possível abrir a demanda." };
  }

  const { data: submission, error: submissionError } = await supabase
    .from("demand_form_submissions")
    .insert({
      demand_id: demand.id,
      office_demand_form_id: form.id,
      office_id: form.office_id,
      requester_name: requesterName,
      requester_email: requesterEmail,
      requester_area: requesterArea || null,
    })
    .select("id")
    .single();

  if (submissionError || !submission) {
    await supabase.from("demands").delete().eq("id", demand.id);
    return { error: submissionError?.message ?? "Não foi possível registrar a solicitação." };
  }

  const answerRows = (questions ?? []).map((question) => {
    const fieldName = `question_${question.id}`;
    const selectedIds =
      question.question_type === "multi_select"
        ? formData.getAll(fieldName).map(String)
        : question.question_type === "single_select"
          ? [formData.get(fieldName)].filter(Boolean).map(String)
          : [];
    const options = (question.office_demand_form_options ?? []) as {
      id: string;
      label: string;
      value: string | null;
      is_active: boolean;
    }[];
    const selectedLabels = options
      .filter((option) => selectedIds.includes(option.id))
      .map((option) => option.label);

    return {
      submission_id: submission.id,
      question_id: question.id,
      question_prompt: question.prompt,
      answer_text:
        question.question_type === "short_text" ||
        question.question_type === "long_text" ||
        question.question_type === "date"
          ? String(formData.get(fieldName) ?? "").trim() || null
          : null,
      selected_option_ids: selectedIds,
      selected_option_labels: selectedLabels,
      uploaded_files: uploadedFilesByQuestion.get(question.id) ?? [],
    };
  });

  if (answerRows.length > 0) {
    const { error: answersError } = await supabase.from("demand_form_answers").insert(answerRows);
    if (answersError) return { error: answersError.message };
  }

  return { success: true, code: publicCode };
}
