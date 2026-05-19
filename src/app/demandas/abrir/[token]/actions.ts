"use server";

import { createServiceClient } from "@/lib/supabase/server";

type PublicDemandAnswer = {
  questionId: string;
  answerText?: string;
  selectedOptionIds?: string[];
};

export async function submitPublicDemand(
  token: string,
  input: {
    answers: PublicDemandAnswer[];
  }
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

  const answersByQuestion = new Map(input.answers.map((answer) => [answer.questionId, answer]));
  const valueByFieldKey = new Map<string, string>();

  for (const question of questions ?? []) {
    const answer = answersByQuestion.get(question.id);
    const options = (question.office_demand_form_options ?? []) as {
      id: string;
      label: string;
      value: string | null;
      is_active: boolean;
    }[];
    const selectedIds = answer?.selectedOptionIds ?? [];
    const selectedOption = options.find((option) => selectedIds.includes(option.id));
    const value =
      answer?.answerText?.trim() ||
      selectedOption?.value?.trim() ||
      selectedOption?.label?.trim() ||
      "";

    if (question.demand_field_key && value) {
      valueByFieldKey.set(question.demand_field_key, value);
    }

    if (!question.is_required) continue;
    const hasText = Boolean(answer?.answerText?.trim());
    const hasOptions = (answer?.selectedOptionIds ?? []).length > 0;
    if (!hasText && !hasOptions) {
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
    const answer = answersByQuestion.get(question.id);
    const selectedIds = answer?.selectedOptionIds ?? [];
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
      answer_text: answer?.answerText?.trim() || null,
      selected_option_ids: selectedIds,
      selected_option_labels: selectedLabels,
    };
  });

  if (answerRows.length > 0) {
    const { error: answersError } = await supabase.from("demand_form_answers").insert(answerRows);
    if (answersError) return { error: answersError.message };
  }

  return { success: true, code: publicCode };
}
