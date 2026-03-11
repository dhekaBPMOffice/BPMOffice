"use server";

import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export type ValueChainCategory = "gestao" | "negocio" | "apoio";

export interface ValueChain {
  id: string;
  office_id: string;
  category: ValueChainCategory;
  name: string;
  description: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export async function getValueChains(): Promise<{ data: ValueChain[] | null; error: string | null }> {
  const supabase = await createClient();
  const profile = await getProfile();

  if (!profile.office_id) {
    return { data: null, error: "Escritório não encontrado." };
  }

  const { data, error } = await supabase
    .from("value_chains")
    .select("*")
    .eq("office_id", profile.office_id)
    .order("order_index", { ascending: true });

  if (error) return { data: null, error: error.message };
  return { data: data as ValueChain[], error: null };
}

export async function createValueChain(
  category: ValueChainCategory,
  name: string,
  description?: string
): Promise<{ data: ValueChain | null; error: string | null }> {
  const supabase = await createClient();
  const profile = await getProfile();

  if (!profile.office_id) {
    return { data: null, error: "Escritório não encontrado." };
  }

  const { count } = await supabase
    .from("value_chains")
    .select("*", { count: "exact", head: true })
    .eq("office_id", profile.office_id)
    .eq("category", category);

  const orderIndex = count ?? 0;

  const { data, error } = await supabase
    .from("value_chains")
    .insert({
      office_id: profile.office_id,
      category,
      name,
      description: description || null,
      order_index: orderIndex,
    })
    .select()
    .single();

  if (error) return { data: null, error: error.message };

  await logAudit({
    office_id: profile.office_id,
    user_id: profile.id,
    action: "create",
    resource_type: "value_chain",
    resource_id: data.id,
    details: { name, category },
  });

  revalidatePath("/escritorio/estrategia/cadeia-valor");
  return { data: data as ValueChain, error: null };
}

export async function updateValueChain(
  id: string,
  updates: { name?: string; description?: string }
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const profile = await getProfile();

  if (!profile.office_id) {
    return { error: "Escritório não encontrado." };
  }

  const { error } = await supabase
    .from("value_chains")
    .update(updates)
    .eq("id", id)
    .eq("office_id", profile.office_id);

  if (error) return { error: error.message };

  await logAudit({
    office_id: profile.office_id,
    user_id: profile.id,
    action: "update",
    resource_type: "value_chain",
    resource_id: id,
    details: updates,
  });

  revalidatePath("/escritorio/estrategia/cadeia-valor");
  return { error: null };
}

export async function deleteValueChain(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const profile = await getProfile();

  if (!profile.office_id) {
    return { error: "Escritório não encontrado." };
  }

  const { error } = await supabase
    .from("value_chains")
    .delete()
    .eq("id", id)
    .eq("office_id", profile.office_id);

  if (error) return { error: error.message };

  await logAudit({
    office_id: profile.office_id,
    user_id: profile.id,
    action: "delete",
    resource_type: "value_chain",
    resource_id: id,
    details: {},
  });

  revalidatePath("/escritorio/estrategia/cadeia-valor");
  return { error: null };
}

export async function reorderValueChains(
  category: ValueChainCategory,
  orderedIds: string[]
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const profile = await getProfile();

  if (!profile.office_id) {
    return { error: "Escritório não encontrado." };
  }

  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from("value_chains")
      .update({ order_index: i })
      .eq("id", orderedIds[i])
      .eq("office_id", profile.office_id)
      .eq("category", category);

    if (error) return { error: error.message };
  }

  revalidatePath("/escritorio/estrategia/cadeia-valor");
  return { error: null };
}
