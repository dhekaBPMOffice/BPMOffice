"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createBaseObjective(title: string, description: string) {
  if (!title?.trim()) return { error: "Título é obrigatório." };

  const supabase = await createServiceClient();
  const { error } = await supabase.from("base_office_objectives").insert({
    title: title.trim(),
    description: description?.trim() || null,
    is_active: true,
  });

  if (error) return { error: error.message };
  revalidatePath("/admin/objetivos-escritorio");
  return { success: true };
}

export async function updateBaseObjective(
  id: string,
  title: string,
  description: string,
  isActive: boolean
) {
  if (!title?.trim()) return { error: "Título é obrigatório." };

  const supabase = await createServiceClient();
  const { error } = await supabase
    .from("base_office_objectives")
    .update({
      title: title.trim(),
      description: description?.trim() || null,
      is_active: isActive,
    })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/admin/objetivos-escritorio");
  return { success: true };
}

export async function deleteBaseObjective(id: string) {
  const supabase = await createServiceClient();
  const { error } = await supabase
    .from("base_office_objectives")
    .delete()
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/admin/objetivos-escritorio");
  return { success: true };
}
