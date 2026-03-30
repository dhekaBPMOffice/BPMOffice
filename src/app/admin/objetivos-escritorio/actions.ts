"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const ADMIN_PATH = "/admin/objetivos-escritorio";

export async function createCentralTheme(name: string) {
  const trimmed = name?.trim();
  if (!trimmed) return { error: "Nome do tema é obrigatório." };

  const supabase = await createServiceClient();
  const { error } = await supabase.from("central_themes").insert({
    name: trimmed,
  });

  if (error) {
    if (error.code === "23505")
      return { error: "Já existe um tema com este nome." };
    return { error: error.message };
  }
  revalidatePath(ADMIN_PATH);
  return { success: true };
}

export async function deleteCentralTheme(id: string) {
  const supabase = await createServiceClient();
  const { error } = await supabase.from("central_themes").delete().eq("id", id);

  if (error) {
    if (error.code === "23503")
      return {
        error:
          "Não é possível excluir: este tema está em uso por um ou mais objetivos.",
      };
    return { error: error.message };
  }
  revalidatePath(ADMIN_PATH);
  return { success: true };
}

export async function createBaseObjective(
  title: string,
  centralThemeId: string,
  isActive: boolean
) {
  if (!title?.trim()) return { error: "Título é obrigatório." };
  if (!centralThemeId?.trim())
    return { error: "Selecione um tema central." };

  const supabase = await createServiceClient();
  const { error } = await supabase.from("base_office_objectives").insert({
    title: title.trim(),
    central_theme_id: centralThemeId.trim(),
    is_active: isActive,
  });

  if (error) return { error: error.message };
  revalidatePath(ADMIN_PATH);
  return { success: true };
}

export async function updateBaseObjective(
  id: string,
  title: string,
  centralThemeId: string,
  isActive: boolean
) {
  if (!title?.trim()) return { error: "Título é obrigatório." };
  if (!centralThemeId?.trim())
    return { error: "Selecione um tema central." };

  const supabase = await createServiceClient();
  const { error } = await supabase
    .from("base_office_objectives")
    .update({
      title: title.trim(),
      central_theme_id: centralThemeId.trim(),
      is_active: isActive,
    })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath(ADMIN_PATH);
  return { success: true };
}

export async function deleteBaseObjective(id: string) {
  const supabase = await createServiceClient();
  const { error } = await supabase
    .from("base_office_objectives")
    .delete()
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath(ADMIN_PATH);
  return { success: true };
}
