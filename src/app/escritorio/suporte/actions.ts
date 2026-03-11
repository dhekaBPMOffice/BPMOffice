"use server";

import { revalidatePath } from "next/cache";
import { getProfile } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function createTicket(title: string, description: string, priority: string) {
  const profile = await getProfile();
  if (!profile.office_id) {
    return { error: "Escritório não encontrado." };
  }

  const supabase = await createServiceClient();

  const { error } = await supabase.from("support_tickets").insert({
    title,
    description: description || null,
    priority: priority || "medium",
    office_id: profile.office_id,
    created_by: profile.id,
    status: "open",
  });

  if (error) return { error: error.message };

  revalidatePath("/escritorio/suporte");
  return { success: true };
}

export async function getTickets() {
  const profile = await getProfile();
  if (!profile.office_id) {
    return { data: [], error: "Escritório não encontrado." };
  }

  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from("support_tickets")
    .select("*")
    .eq("office_id", profile.office_id)
    .order("created_at", { ascending: false });

  if (error) return { data: [], error: error.message };

  return { data: data ?? [], error: null };
}
