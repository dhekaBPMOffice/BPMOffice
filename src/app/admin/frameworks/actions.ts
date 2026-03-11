"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createFramework(
  name: string,
  description: string,
  category: string
) {
  if (!name?.trim()) return { error: "Nome é obrigatório." };

  const supabase = await createServiceClient();
  const { error } = await supabase.from("process_frameworks").insert({
    name: name.trim(),
    description: description?.trim() || null,
    category: category?.trim() || null,
    is_active: true,
  });

  if (error) return { error: error.message };
  revalidatePath("/admin/frameworks");
  return { success: true };
}

export async function updateFramework(
  id: string,
  name: string,
  description: string,
  category: string,
  isActive: boolean
) {
  if (!name?.trim()) return { error: "Nome é obrigatório." };

  const supabase = await createServiceClient();
  const { error } = await supabase
    .from("process_frameworks")
    .update({
      name: name.trim(),
      description: description?.trim() || null,
      category: category?.trim() || null,
      is_active: isActive,
    })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/admin/frameworks");
  return { success: true };
}

export async function deleteFramework(id: string) {
  const supabase = await createServiceClient();
  const { error } = await supabase
    .from("process_frameworks")
    .delete()
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/admin/frameworks");
  return { success: true };
}
