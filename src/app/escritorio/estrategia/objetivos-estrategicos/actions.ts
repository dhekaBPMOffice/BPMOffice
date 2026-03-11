"use server";

import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

const REVALIDATE_PATH = "/escritorio/estrategia/objetivos-estrategicos";

export type ObjectiveOrigin = "manual" | "imported";

export interface OfficeStrategicObjective {
  id: string;
  office_id: string;
  plan_id: string | null;
  title: string;
  description: string | null;
  swot_item_id: string | null;
  created_at: string;
  origin?: ObjectiveOrigin | null;
  source_file?: string | null;
}

export async function getOfficeStrategicObjectives(): Promise<{
  data: OfficeStrategicObjective[] | null;
  error: string | null;
}> {
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile.office_id) return { data: null, error: "Escritório não encontrado." };

  const { data, error } = await supabase
    .from("strategic_objectives")
    .select("id, office_id, plan_id, title, description, swot_item_id, created_at, origin, source_file")
    .eq("office_id", profile.office_id)
    .order("created_at", { ascending: false });

  if (error) return { data: null, error: error.message };
  return { data: (data ?? []) as OfficeStrategicObjective[], error: null };
}

export async function createOfficeStrategicObjective(
  title: string,
  options?: {
    description?: string | null;
    origin?: ObjectiveOrigin;
    sourceFile?: string | null;
  }
): Promise<{ data: OfficeStrategicObjective | null; error: string | null }> {
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile.office_id) return { data: null, error: "Escritório não encontrado." };

  const origin = options?.origin ?? "manual";
  const payload: Record<string, unknown> = {
    office_id: profile.office_id,
    title,
    description: options?.description ?? null,
    plan_id: null,
    swot_item_id: null,
  };
  if (options?.origin) payload.origin = options.origin;
  if (options?.sourceFile !== undefined) payload.source_file = options.sourceFile;

  const { data, error } = await supabase
    .from("strategic_objectives")
    .insert(payload)
    .select()
    .single();

  if (error) return { data: null, error: error.message };

  await logAudit({
    office_id: profile.office_id,
    user_id: profile.id,
    action: "create",
    resource_type: "strategic_objective",
    resource_id: data.id,
    details: { title, origin },
  });

  revalidatePath(REVALIDATE_PATH);
  return { data: data as OfficeStrategicObjective, error: null };
}

export async function updateOfficeStrategicObjective(
  id: string,
  updates: { title?: string; description?: string | null }
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile.office_id) return { error: "Escritório não encontrado." };

  const { error } = await supabase
    .from("strategic_objectives")
    .update(updates)
    .eq("id", id)
    .eq("office_id", profile.office_id);

  if (error) return { error: error.message };
  revalidatePath(REVALIDATE_PATH);
  return { error: null };
}

export async function deleteOfficeStrategicObjective(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile.office_id) return { error: "Escritório não encontrado." };

  const { error } = await supabase
    .from("strategic_objectives")
    .delete()
    .eq("id", id)
    .eq("office_id", profile.office_id);

  if (error) return { error: error.message };

  await logAudit({
    office_id: profile.office_id,
    user_id: profile.id,
    action: "delete",
    resource_type: "strategic_objective",
    resource_id: id,
    details: {},
  });

  revalidatePath(REVALIDATE_PATH);
  return { error: null };
}
