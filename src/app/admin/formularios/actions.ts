"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createForm(title: string, description: string) {
  if (!title?.trim()) return { error: "Título é obrigatório." };

  const supabase = await createServiceClient();
  const { error } = await supabase.from("forms").insert({
    title: title.trim(),
    description: description?.trim() || null,
    office_id: null,
    is_active: true,
  });

  if (error) return { error: error.message };
  revalidatePath("/admin/formularios");
  return { success: true };
}

export async function addQuestion(
  formId: string,
  label: string,
  type: "text" | "select" | "rating"
) {
  if (!label?.trim()) return { error: "Texto da pergunta é obrigatório." };

  const supabase = await createServiceClient();

  const { data: maxOrder } = await supabase
    .from("form_questions")
    .select("sort_order")
    .eq("form_id", formId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sortOrder = (maxOrder?.sort_order ?? -1) + 1;

  const { error } = await supabase.from("form_questions").insert({
    form_id: formId,
    label: label.trim(),
    type,
    sort_order: sortOrder,
  });

  if (error) return { error: error.message };
  revalidatePath("/admin/formularios");
  return { success: true };
}

export async function deleteForm(id: string) {
  const supabase = await createServiceClient();
  const { error } = await supabase.from("forms").delete().eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/admin/formularios");
  return { success: true };
}

export async function deleteQuestion(questionId: string) {
  const supabase = await createServiceClient();
  const { error } = await supabase
    .from("form_questions")
    .delete()
    .eq("id", questionId);

  if (error) return { error: error.message };
  revalidatePath("/admin/formularios");
  return { success: true };
}
