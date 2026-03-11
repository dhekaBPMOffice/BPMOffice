"use server";

import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export type SwotType = "strength" | "weakness" | "opportunity" | "threat";
export type SwotSource = "empresa" | "escritorio";

export interface SwotItem {
  id: string;
  office_id: string;
  plan_id: string | null;
  type: SwotType;
  content: string;
  source: SwotSource;
  created_at: string;
}

export interface StrategicObjective {
  id: string;
  office_id: string;
  plan_id: string | null;
  title: string;
  description: string | null;
  swot_item_id: string | null;
  created_at: string;
}

export interface TacticalPlan {
  id: string;
  office_id: string;
  objective_id: string;
  action: string;
  responsible: string | null;
  deadline: string | null;
  reminder_date: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface StrategicPlan {
  id: string;
  office_id: string;
  name: string;
  year: number;
  mission: string | null;
  vision: string | null;
  values_text: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface PlanSnapshot {
  id: string;
  plan_id: string;
  office_id: string;
  version_number: number;
  snapshot_data: Record<string, unknown>;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

const REVALIDATE_PATH = "/escritorio/estrategia/swot";

// ── Strategic Plans CRUD ──

export async function getStrategicPlans(): Promise<{
  data: StrategicPlan[] | null;
  error: string | null;
}> {
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile.office_id) return { data: null, error: "Escritório não encontrado." };

  const { data, error } = await supabase
    .from("strategic_plans")
    .select("*")
    .eq("office_id", profile.office_id)
    .order("created_at", { ascending: false });

  if (error) return { data: null, error: error.message };
  return { data: (data ?? []) as StrategicPlan[], error: null };
}

export async function getStrategicPlan(planId: string): Promise<{
  data: StrategicPlan | null;
  error: string | null;
}> {
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile.office_id) return { data: null, error: "Escritório não encontrado." };

  const { data, error } = await supabase
    .from("strategic_plans")
    .select("*")
    .eq("id", planId)
    .eq("office_id", profile.office_id)
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as StrategicPlan, error: null };
}

export async function createStrategicPlan(
  name: string,
  year: number
): Promise<{ data: StrategicPlan | null; error: string | null }> {
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile.office_id) return { data: null, error: "Escritório não encontrado." };

  const { data, error } = await supabase
    .from("strategic_plans")
    .insert({ office_id: profile.office_id, name, year })
    .select()
    .single();

  if (error) return { data: null, error: error.message };

  await logAudit({
    office_id: profile.office_id,
    user_id: profile.id,
    action: "create",
    resource_type: "strategic_plan",
    resource_id: data.id,
    details: { name, year },
  });

  revalidatePath(REVALIDATE_PATH);
  return { data: data as StrategicPlan, error: null };
}

export async function updateStrategicPlan(
  id: string,
  updates: {
    name?: string;
    year?: number;
    mission?: string | null;
    vision?: string | null;
    values_text?: string | null;
    status?: string;
  }
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile.office_id) return { error: "Escritório não encontrado." };

  const { error } = await supabase
    .from("strategic_plans")
    .update(updates)
    .eq("id", id)
    .eq("office_id", profile.office_id);

  if (error) return { error: error.message };

  revalidatePath(REVALIDATE_PATH);
  return { error: null };
}

export async function deleteStrategicPlan(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile.office_id) return { error: "Escritório não encontrado." };

  const { error } = await supabase
    .from("strategic_plans")
    .delete()
    .eq("id", id)
    .eq("office_id", profile.office_id);

  if (error) return { error: error.message };

  await logAudit({
    office_id: profile.office_id,
    user_id: profile.id,
    action: "delete",
    resource_type: "strategic_plan",
    resource_id: id,
    details: {},
  });

  revalidatePath(REVALIDATE_PATH);
  return { error: null };
}

// ── Snapshots ──

export async function saveSnapshot(
  planId: string,
  notes?: string
): Promise<{ data: PlanSnapshot | null; error: string | null }> {
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile.office_id) return { data: null, error: "Escritório não encontrado." };

  const planRes = await getStrategicPlan(planId);
  if (planRes.error || !planRes.data) return { data: null, error: planRes.error ?? "Plano não encontrado." };

  const swotRes = await getSwotItems(planId);
  const objRes = await getStrategicObjectives(planId);
  const tactRes = await getTacticalPlans(planId);

  const snapshotData = {
    plan: planRes.data,
    swotItems: swotRes.data ?? [],
    objectives: objRes.data ?? [],
    tacticalPlans: tactRes.data ?? [],
  };

  const { data: lastVersion } = await supabase
    .from("strategic_plan_snapshots")
    .select("version_number")
    .eq("plan_id", planId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersion = (lastVersion?.version_number ?? 0) + 1;

  const { data, error } = await supabase
    .from("strategic_plan_snapshots")
    .insert({
      plan_id: planId,
      office_id: profile.office_id,
      version_number: nextVersion,
      snapshot_data: snapshotData,
      notes: notes || null,
      created_by: profile.id,
    })
    .select()
    .single();

  if (error) return { data: null, error: error.message };

  revalidatePath(REVALIDATE_PATH);
  return { data: data as PlanSnapshot, error: null };
}

export async function getSnapshots(planId: string): Promise<{
  data: PlanSnapshot[] | null;
  error: string | null;
}> {
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile.office_id) return { data: null, error: "Escritório não encontrado." };

  const { data, error } = await supabase
    .from("strategic_plan_snapshots")
    .select("*")
    .eq("plan_id", planId)
    .eq("office_id", profile.office_id)
    .order("version_number", { ascending: false });

  if (error) return { data: null, error: error.message };
  return { data: data as PlanSnapshot[], error: null };
}

export async function getSnapshot(snapshotId: string): Promise<{
  data: PlanSnapshot | null;
  error: string | null;
}> {
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile.office_id) return { data: null, error: "Escritório não encontrado." };

  const { data, error } = await supabase
    .from("strategic_plan_snapshots")
    .select("*")
    .eq("id", snapshotId)
    .eq("office_id", profile.office_id)
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as PlanSnapshot, error: null };
}

// ── SWOT Items ──

export async function getSwotItems(planId?: string): Promise<{
  data: SwotItem[] | null;
  error: string | null;
}> {
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile.office_id) return { data: null, error: "Escritório não encontrado." };

  let query = supabase
    .from("swot_items")
    .select("*")
    .eq("office_id", profile.office_id)
    .order("created_at", { ascending: true });

  if (planId) {
    query = query.eq("plan_id", planId);
  }

  const { data, error } = await query;
  if (error) return { data: null, error: error.message };
  return { data: data as SwotItem[], error: null };
}

export async function createSwotItem(
  type: SwotType,
  content: string,
  source: SwotSource,
  planId?: string
): Promise<{ data: SwotItem | null; error: string | null }> {
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile.office_id) return { data: null, error: "Escritório não encontrado." };

  const { data, error } = await supabase
    .from("swot_items")
    .insert({
      office_id: profile.office_id,
      type,
      content,
      source,
      plan_id: planId || null,
    })
    .select()
    .single();

  if (error) return { data: null, error: error.message };

  await logAudit({
    office_id: profile.office_id,
    user_id: profile.id,
    action: "create",
    resource_type: "swot_item",
    resource_id: data.id,
    details: { type, source, plan_id: planId },
  });

  revalidatePath(REVALIDATE_PATH);
  return { data: data as SwotItem, error: null };
}

export async function deleteSwotItem(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile.office_id) return { error: "Escritório não encontrado." };

  const { error } = await supabase
    .from("swot_items")
    .delete()
    .eq("id", id)
    .eq("office_id", profile.office_id);

  if (error) return { error: error.message };

  await logAudit({
    office_id: profile.office_id,
    user_id: profile.id,
    action: "delete",
    resource_type: "swot_item",
    resource_id: id,
    details: {},
  });

  revalidatePath(REVALIDATE_PATH);
  return { error: null };
}

export async function updateSwotItem(
  id: string,
  updates: { type?: SwotType; content?: string }
): Promise<{ data: SwotItem | null; error: string | null }> {
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile.office_id) return { data: null, error: "Escritório não encontrado." };

  const { data, error } = await supabase
    .from("swot_items")
    .update(updates)
    .eq("id", id)
    .eq("office_id", profile.office_id)
    .select()
    .single();

  if (error) return { data: null, error: error.message };

  await logAudit({
    office_id: profile.office_id,
    user_id: profile.id,
    action: "update",
    resource_type: "swot_item",
    resource_id: id,
    details: updates,
  });

  revalidatePath(REVALIDATE_PATH);
  return { data: data as SwotItem, error: null };
}

// ── Strategic Objectives ──

export async function getStrategicObjectives(planId?: string): Promise<{
  data: StrategicObjective[] | null;
  error: string | null;
}> {
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile.office_id) return { data: null, error: "Escritório não encontrado." };

  let query = supabase
    .from("strategic_objectives")
    .select("*")
    .eq("office_id", profile.office_id)
    .order("created_at", { ascending: true });

  if (planId) {
    query = query.eq("plan_id", planId);
  }

  const { data, error } = await query;
  if (error) return { data: null, error: error.message };
  return { data: data as StrategicObjective[], error: null };
}

export async function createStrategicObjective(
  title: string,
  description?: string,
  swotItemId?: string,
  planId?: string
): Promise<{ data: StrategicObjective | null; error: string | null }> {
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile.office_id) return { data: null, error: "Escritório não encontrado." };

  const { data, error } = await supabase
    .from("strategic_objectives")
    .insert({
      office_id: profile.office_id,
      title,
      description: description || null,
      swot_item_id: swotItemId || null,
      plan_id: planId || null,
    })
    .select()
    .single();

  if (error) return { data: null, error: error.message };

  await logAudit({
    office_id: profile.office_id,
    user_id: profile.id,
    action: "create",
    resource_type: "strategic_objective",
    resource_id: data.id,
    details: { title, plan_id: planId },
  });

  revalidatePath(REVALIDATE_PATH);
  return { data: data as StrategicObjective, error: null };
}

export async function updateStrategicObjective(
  id: string,
  updates: { title?: string; description?: string; swot_item_id?: string | null }
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

export async function deleteStrategicObjective(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile.office_id) return { error: "Escritório não encontrado." };

  const { error } = await supabase
    .from("strategic_objectives")
    .delete()
    .eq("id", id)
    .eq("office_id", profile.office_id);

  if (error) return { error: error.message };

  revalidatePath(REVALIDATE_PATH);
  return { error: null };
}

// ── Tactical Plans ──

export async function getTacticalPlans(planId?: string): Promise<{
  data: TacticalPlan[] | null;
  error: string | null;
}> {
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile.office_id) return { data: null, error: "Escritório não encontrado." };

  if (planId) {
    const objRes = await getStrategicObjectives(planId);
    const objIds = (objRes.data ?? []).map((o) => o.id);
    if (objIds.length === 0) return { data: [], error: null };

    const { data, error } = await supabase
      .from("tactical_plans")
      .select("*")
      .eq("office_id", profile.office_id)
      .in("objective_id", objIds)
      .order("deadline", { ascending: true });

    if (error) return { data: null, error: error.message };
    return { data: data as TacticalPlan[], error: null };
  }

  const { data, error } = await supabase
    .from("tactical_plans")
    .select("*")
    .eq("office_id", profile.office_id)
    .order("deadline", { ascending: true });

  if (error) return { data: null, error: error.message };
  return { data: data as TacticalPlan[], error: null };
}

export async function createTacticalPlan(
  objectiveId: string,
  action: string,
  responsible?: string,
  deadline?: string,
  reminderDate?: string,
  notes?: string
): Promise<{ data: TacticalPlan | null; error: string | null }> {
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile.office_id) return { data: null, error: "Escritório não encontrado." };

  const { data, error } = await supabase
    .from("tactical_plans")
    .insert({
      office_id: profile.office_id,
      objective_id: objectiveId,
      action,
      responsible: responsible || null,
      deadline: deadline || null,
      reminder_date: reminderDate || null,
      notes: notes || null,
    })
    .select()
    .single();

  if (error) return { data: null, error: error.message };

  revalidatePath(REVALIDATE_PATH);
  return { data: data as TacticalPlan, error: null };
}

export async function updateTacticalPlan(
  id: string,
  updates: {
    action?: string;
    responsible?: string | null;
    deadline?: string | null;
    reminder_date?: string | null;
    status?: string;
    notes?: string | null;
  }
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile.office_id) return { error: "Escritório não encontrado." };

  const { error } = await supabase
    .from("tactical_plans")
    .update(updates)
    .eq("id", id)
    .eq("office_id", profile.office_id);

  if (error) return { error: error.message };

  revalidatePath(REVALIDATE_PATH);
  return { error: null };
}

export async function deleteTacticalPlan(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile.office_id) return { error: "Escritório não encontrado." };

  const { error } = await supabase
    .from("tactical_plans")
    .delete()
    .eq("id", id)
    .eq("office_id", profile.office_id);

  if (error) return { error: error.message };

  revalidatePath(REVALIDATE_PATH);
  return { error: null };
}

// ── Full plan data loader ──

export async function getFullPlanData(planId: string): Promise<{
  plan: StrategicPlan | null;
  swotItems: SwotItem[];
  objectives: StrategicObjective[];
  tacticalPlans: TacticalPlan[];
  error: string | null;
}> {
  const planRes = await getStrategicPlan(planId);
  if (planRes.error || !planRes.data) {
    return {
      plan: null,
      swotItems: [],
      objectives: [],
      tacticalPlans: [],
      error: planRes.error ?? "Plano não encontrado.",
    };
  }

  const [swotRes, objRes, tactRes] = await Promise.all([
    getSwotItems(planId),
    getStrategicObjectives(planId),
    getTacticalPlans(planId),
  ]);

  return {
    plan: planRes.data,
    swotItems: swotRes.data ?? [],
    objectives: objRes.data ?? [],
    tacticalPlans: tactRes.data ?? [],
    error: null,
  };
}
