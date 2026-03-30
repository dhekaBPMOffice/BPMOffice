"use server";

import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { revalidatePath } from "next/cache";

const REVALIDATE = "/escritorio/estrategia/objetivos-escritorio";

export type OfficeObjectiveType = "primary" | "secondary";
export type OfficeObjectiveOrigin = "manual" | "imported" | "catalog";

export interface OfficeObjective {
  id: string;
  office_id: string;
  base_objective_id: string | null;
  parent_objective_id: string | null;
  title: string;
  description: string | null;
  type: OfficeObjectiveType;
  sort_order: number;
  origin: OfficeObjectiveOrigin;
  source_file: string | null;
  created_at: string;
  updated_at: string;
}

export interface OfficeObjectiveGoal {
  id: string;
  office_objective_id: string;
  title: string;
  description: string | null;
  sort_order: number;
  created_at: string;
}

export interface BaseOfficeObjective {
  id: string;
  title: string;
  description: string | null;
}

export async function getOfficeObjectives(): Promise<{
  data: OfficeObjective[] | null;
  error: string | null;
}> {
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile.office_id)
    return { data: null, error: "Escritório não encontrado." };

  const { data, error } = await supabase
    .from("office_objectives")
    .select("*")
    .eq("office_id", profile.office_id)
    .is("parent_objective_id", null)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) return { data: null, error: error.message };
  const list = (data ?? []) as OfficeObjective[];
  list.sort(
    (a, b) =>
      a.sort_order - b.sort_order ||
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  return { data: list, error: null };
}

export async function getBaseOfficeObjectives(): Promise<{
  data: BaseOfficeObjective[] | null;
  error: string | null;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("base_office_objectives")
    .select("id, title, description")
    .eq("is_active", true)
    .order("title");

  if (error) return { data: null, error: error.message };
  return { data: (data ?? []) as BaseOfficeObjective[], error: null };
}

export async function createOfficeObjective(
  title: string,
  options?: {
    description?: string | null;
    goals?: { title: string; description?: string | null }[];
  }
): Promise<{ data: OfficeObjective | null; error: string | null }> {
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile.office_id)
    return { data: null, error: "Escritório não encontrado." };
  if (!title?.trim()) return { data: null, error: "Título é obrigatório." };

  const { data: obj, error: objError } = await supabase
    .from("office_objectives")
    .insert({
      office_id: profile.office_id,
      base_objective_id: null,
      parent_objective_id: null,
      title: title.trim(),
      description: options?.description?.trim() || null,
      type: "primary",
      sort_order: 0,
      origin: "manual",
      source_file: null,
    })
    .select()
    .single();

  if (objError) return { data: null, error: objError.message };
  const objective = obj as OfficeObjective;

  const goals = options?.goals?.filter((g) => g.title?.trim()) ?? [];
  for (let i = 0; i < goals.length; i++) {
    await supabase.from("office_objective_goals").insert({
      office_objective_id: objective.id,
      title: goals[i].title.trim(),
      description: goals[i].description?.trim() || null,
      sort_order: i,
    });
  }

  revalidatePath(REVALIDATE);
  return { data: objective, error: null };
}

export async function addObjectiveFromCatalog(
  baseObjectiveId: string
): Promise<{ data: OfficeObjective | null; error: string | null }> {
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile.office_id)
    return { data: null, error: "Escritório não encontrado." };

  const { data: base } = await supabase
    .from("base_office_objectives")
    .select("id, title, description")
    .eq("id", baseObjectiveId)
    .eq("is_active", true)
    .single();

  if (!base) return { data: null, error: "Opção de objetivo não encontrada." };

  const { data: obj, error } = await supabase
    .from("office_objectives")
    .insert({
      office_id: profile.office_id,
      base_objective_id: base.id,
      parent_objective_id: null,
      title: base.title,
      description: base.description,
      type: "primary",
      sort_order: 0,
      origin: "catalog",
      source_file: null,
    })
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  revalidatePath(REVALIDATE);
  return { data: obj as OfficeObjective, error: null };
}

export async function updateOfficeObjective(
  id: string,
  updates: {
    title?: string;
    description?: string | null;
    type?: OfficeObjectiveType;
  }
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile.office_id) return { error: "Escritório não encontrado." };

  const { data: existing } = await supabase
    .from("office_objectives")
    .select("id")
    .eq("id", id)
    .eq("office_id", profile.office_id)
    .single();

  if (!existing) return { error: "Objetivo não encontrado." };

  const { error } = await supabase
    .from("office_objectives")
    .update({
      ...(updates.title !== undefined && { title: updates.title.trim() }),
      ...(updates.description !== undefined && { description: updates.description?.trim() || null }),
      ...(updates.type !== undefined && { type: updates.type }),
    })
    .eq("id", id)
    .eq("office_id", profile.office_id);

  if (error) return { error: error.message };
  revalidatePath(REVALIDATE);
  return { error: null };
}

export async function deleteOfficeObjective(
  id: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile.office_id) return { error: "Escritório não encontrado." };

  const { error } = await supabase
    .from("office_objectives")
    .delete()
    .eq("id", id)
    .eq("office_id", profile.office_id);

  if (error) return { error: error.message };
  revalidatePath(REVALIDATE);
  return { error: null };
}

export async function getGoalsByObjectiveId(
  officeObjectiveId: string
): Promise<{ data: OfficeObjectiveGoal[] | null; error: string | null }> {
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile.office_id)
    return { data: null, error: "Escritório não encontrado." };

  const { data: obj } = await supabase
    .from("office_objectives")
    .select("id")
    .eq("id", officeObjectiveId)
    .eq("office_id", profile.office_id)
    .single();

  if (!obj) return { data: null, error: "Objetivo não encontrado." };

  const { data, error } = await supabase
    .from("office_objective_goals")
    .select("*")
    .eq("office_objective_id", officeObjectiveId)
    .order("sort_order")
    .order("created_at");

  if (error) return { data: null, error: error.message };
  return { data: (data ?? []) as OfficeObjectiveGoal[], error: null };
}

export async function createGoal(
  officeObjectiveId: string,
  title: string,
  description?: string | null
): Promise<{ data: OfficeObjectiveGoal | null; error: string | null }> {
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile.office_id)
    return { data: null, error: "Escritório não encontrado." };

  const { data: obj } = await supabase
    .from("office_objectives")
    .select("id")
    .eq("id", officeObjectiveId)
    .eq("office_id", profile.office_id)
    .single();

  if (!obj) return { data: null, error: "Objetivo não encontrado." };
  if (!title?.trim()) return { data: null, error: "Título da meta é obrigatório." };

  const { data, error } = await supabase
    .from("office_objective_goals")
    .insert({
      office_objective_id: officeObjectiveId,
      title: title.trim(),
      description: description?.trim() || null,
      sort_order: 0,
    })
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  revalidatePath(REVALIDATE);
  return { data: data as OfficeObjectiveGoal, error: null };
}

export async function updateGoal(
  id: string,
  officeObjectiveId: string,
  updates: { title?: string; description?: string | null }
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile.office_id) return { error: "Escritório não encontrado." };

  const { data: obj } = await supabase
    .from("office_objectives")
    .select("id")
    .eq("id", officeObjectiveId)
    .eq("office_id", profile.office_id)
    .single();

  if (!obj) return { error: "Objetivo não encontrado." };

  const { error } = await supabase
    .from("office_objective_goals")
    .update({
      ...(updates.title !== undefined && { title: updates.title.trim() }),
      ...(updates.description !== undefined && { description: updates.description?.trim() || null }),
    })
    .eq("id", id)
    .eq("office_objective_id", officeObjectiveId);

  if (error) return { error: error.message };
  revalidatePath(REVALIDATE);
  return { error: null };
}

export async function deleteGoal(
  id: string,
  officeObjectiveId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile.office_id) return { error: "Escritório não encontrado." };

  const { data: obj } = await supabase
    .from("office_objectives")
    .select("id")
    .eq("id", officeObjectiveId)
    .eq("office_id", profile.office_id)
    .single();

  if (!obj) return { error: "Objetivo não encontrado." };

  const { error } = await supabase
    .from("office_objective_goals")
    .delete()
    .eq("id", id)
    .eq("office_objective_id", officeObjectiveId);

  if (error) return { error: error.message };
  revalidatePath(REVALIDATE);
  return { error: null };
}
