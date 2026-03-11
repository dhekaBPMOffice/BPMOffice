"use server";

import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export interface TrainingPlan {
  id: string;
  office_id: string;
  role_target: string;
  title: string;
  description: string | null;
  content: string | null;
  is_platform_content: boolean;
  created_by: string | null;
  created_at: string;
}

export interface TrainingRecord {
  id: string;
  office_id: string;
  user_id: string;
  plan_id: string;
  status: "pending" | "in_progress" | "completed";
  completed_at: string | null;
  notes: string | null;
  created_at: string;
}

export async function getTrainingPlans(): Promise<{
  data: TrainingPlan[] | null;
  error: string | null;
}> {
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile.office_id) return { data: null, error: "Escritório não encontrado." };

  const { data, error } = await supabase
    .from("training_plans")
    .select("*")
    .eq("office_id", profile.office_id)
    .order("created_at", { ascending: false });

  if (error) return { data: null, error: error.message };
  return { data: (data ?? []) as TrainingPlan[], error: null };
}

export async function createTrainingPlan(input: {
  role_target: string;
  title: string;
  description?: string;
  content?: string;
  is_platform_content?: boolean;
}): Promise<{ data: TrainingPlan | null; error: string | null }> {
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile.office_id) return { data: null, error: "Escritório não encontrado." };

  const { data, error } = await supabase
    .from("training_plans")
    .insert({
      office_id: profile.office_id,
      role_target: input.role_target,
      title: input.title,
      description: input.description || null,
      content: input.content || null,
      is_platform_content: input.is_platform_content ?? false,
      created_by: profile.id,
    })
    .select()
    .single();

  if (error) return { data: null, error: error.message };

  await logAudit({
    office_id: profile.office_id,
    user_id: profile.id,
    action: "create",
    resource_type: "training_plan",
    resource_id: data.id,
    details: { title: input.title },
  });

  revalidatePath("/escritorio/capacitacao");
  return { data: data as TrainingPlan, error: null };
}

export async function updateTrainingPlan(
  id: string,
  input: {
    role_target?: string;
    title?: string;
    description?: string;
    content?: string;
    is_platform_content?: boolean;
  }
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile.office_id) return { error: "Escritório não encontrado." };

  const { error } = await supabase
    .from("training_plans")
    .update(input)
    .eq("id", id)
    .eq("office_id", profile.office_id);

  if (error) return { error: error.message };

  revalidatePath("/escritorio/capacitacao");
  return { error: null };
}

export async function getUserTrainingRecords(userId?: string): Promise<{
  data: (TrainingRecord & { plan?: TrainingPlan; user?: { full_name: string } })[] | null;
  error: string | null;
}> {
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile.office_id) return { data: null, error: "Escritório não encontrado." };

  let query = supabase
    .from("training_records")
    .select(`
      *,
      plan:training_plans(*)
    `)
    .eq("office_id", profile.office_id)
    .order("created_at", { ascending: false });

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;

  if (error) return { data: null, error: error.message };
  return {
    data: (data ?? []) as (TrainingRecord & { plan?: TrainingPlan })[],
    error: null,
  };
}

export async function createTrainingRecord(input: {
  user_id: string;
  plan_id: string;
  status?: "pending" | "in_progress" | "completed";
  notes?: string;
}): Promise<{ data: TrainingRecord | null; error: string | null }> {
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile.office_id) return { data: null, error: "Escritório não encontrado." };

  const { data, error } = await supabase
    .from("training_records")
    .insert({
      office_id: profile.office_id,
      user_id: input.user_id,
      plan_id: input.plan_id,
      status: input.status ?? "pending",
      notes: input.notes || null,
    })
    .select()
    .single();

  if (error) return { data: null, error: error.message };

  revalidatePath("/escritorio/capacitacao");
  return { data: data as TrainingRecord, error: null };
}

export async function updateTrainingRecord(
  id: string,
  input: {
    status?: "pending" | "in_progress" | "completed";
    completed_at?: string | null;
    notes?: string | null;
  }
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile.office_id) return { error: "Escritório não encontrado." };

  const updates: Record<string, unknown> = { ...input };
  if (input.status === "completed" && !input.completed_at) {
    updates.completed_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("training_records")
    .update(updates)
    .eq("id", id)
    .eq("office_id", profile.office_id);

  if (error) return { error: error.message };

  revalidatePath("/escritorio/capacitacao");
  return { error: null };
}
