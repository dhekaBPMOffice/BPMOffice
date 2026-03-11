"use server";

import { revalidatePath } from "next/cache";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type CreateDemandInput = {
  title: string;
  description?: string;
  external_ticket_id?: string;
  priority?: string;
};

export async function createDemand(input: CreateDemandInput) {
  const profile = await getProfile();
  if (!profile.office_id) {
    return { error: "Escritório não encontrado." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("demands")
    .insert({
      office_id: profile.office_id,
      title: input.title,
      description: input.description || null,
      external_ticket_id: input.external_ticket_id || null,
      priority: input.priority || "medium",
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/escritorio/demandas");
  return { success: true, id: data.id };
}

export async function updateDemand(
  id: string,
  data: {
    title?: string;
    description?: string;
    external_ticket_id?: string;
    status?: string;
    priority?: string;
    assigned_to?: string | null;
  }
) {
  const profile = await getProfile();
  if (!profile.office_id) {
    return { error: "Escritório não encontrado." };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("demands")
    .update(data)
    .eq("id", id)
    .eq("office_id", profile.office_id);

  if (error) return { error: error.message };

  revalidatePath("/escritorio/demandas");
  revalidatePath(`/escritorio/demandas/${id}`);
  return { success: true };
}

export async function deleteDemand(id: string) {
  const profile = await getProfile();
  if (!profile.office_id) {
    return { error: "Escritório não encontrado." };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("demands")
    .delete()
    .eq("id", id)
    .eq("office_id", profile.office_id);

  if (error) return { error: error.message };

  revalidatePath("/escritorio/demandas");
  return { success: true };
}

export async function getDemands() {
  const profile = await getProfile();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("demands")
    .select(`
      id,
      title,
      status,
      priority,
      assigned_to,
      created_at,
      assigned_profile:assigned_to (full_name)
    `)
    .eq("office_id", profile.office_id ?? "")
    .order("created_at", { ascending: false });

  if (error) return { data: [], error: error.message };
  return { data: data ?? [] };
}
