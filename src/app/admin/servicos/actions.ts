"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createService(
  name: string,
  description: string,
  methodology: string,
  deliverables: string
) {
  if (!name?.trim()) return { error: "Nome é obrigatório." };

  const supabase = await createServiceClient();
  const { error } = await supabase.from("base_services").insert({
    name: name.trim(),
    description: description?.trim() || null,
    methodology: methodology?.trim() || null,
    deliverables: deliverables?.trim() || null,
    is_active: true,
  });

  if (error) return { error: error.message };
  revalidatePath("/admin/servicos");
  return { success: true };
}

export async function updateService(
  id: string,
  name: string,
  description: string,
  methodology: string,
  deliverables: string,
  isActive: boolean
) {
  if (!name?.trim()) return { error: "Nome é obrigatório." };

  const supabase = await createServiceClient();
  const { error } = await supabase
    .from("base_services")
    .update({
      name: name.trim(),
      description: description?.trim() || null,
      methodology: methodology?.trim() || null,
      deliverables: deliverables?.trim() || null,
      is_active: isActive,
    })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/admin/servicos");
  return { success: true };
}

export async function deleteService(id: string) {
  const supabase = await createServiceClient();
  const { error } = await supabase
    .from("base_services")
    .delete()
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/admin/servicos");
  return { success: true };
}
