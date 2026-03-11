"use server";

import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

const REVALIDATE_PATH = "/escritorio/estrategia/plano-tatico";

// ── Types ──

export type TacticalDocumentStatus = "draft" | "active" | "completed" | "cancelled";
export type TacticalHorizon = "trimestral" | "semestral" | "anual";
export type TacticalPriority = "alta" | "media" | "baixa";
export type TacticalCategory = "processos" | "pessoas" | "tecnologia" | "governanca" | "capacitacao" | "outro";

export interface TacticalPlanDocument {
  id: string;
  office_id: string;
  title: string;
  period_start: string | null;
  period_end: string | null;
  horizon: TacticalHorizon;
  status: TacticalDocumentStatus;
  ai_context: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface TacticalAction {
  id: string;
  office_id: string;
  document_id: string | null;
  objective_id: string;
  office_objective_id: string | null;
  action: string;
  description: string | null;
  responsible: string | null;
  deadline: string | null;
  reminder_date: string | null;
  priority: TacticalPriority | null;
  kpi: string | null;
  category: TacticalCategory | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TacticalDocumentWithStats extends TacticalPlanDocument {
  total_actions: number;
  completed_actions: number;
}

// ── Helpers ──

async function getOfficeId(): Promise<{ officeId: string; userId: string } | { error: string }> {
  const profile = await getProfile();
  if (!profile.office_id) return { error: "Escritório não encontrado." };
  return { officeId: profile.office_id, userId: profile.id };
}

// ── Document CRUD ──

export async function getTacticalPlanDocuments(): Promise<{
  data: TacticalDocumentWithStats[] | null;
  error: string | null;
}> {
  const supabase = await createClient();
  const auth = await getOfficeId();
  if ("error" in auth) return { data: null, error: auth.error };

  const { data: docs, error } = await supabase
    .from("tactical_plan_documents")
    .select("*")
    .eq("office_id", auth.officeId)
    .order("created_at", { ascending: false });

  if (error) return { data: null, error: error.message };

  const docIds = (docs ?? []).map((d: { id: string }) => d.id);

  if (docIds.length === 0) return { data: [], error: null };

  const { data: actions } = await supabase
    .from("tactical_plans")
    .select("id, document_id, status")
    .eq("office_id", auth.officeId)
    .in("document_id", docIds);

  const statsMap = new Map<string, { total: number; completed: number }>();
  for (const a of actions ?? []) {
    const docId = a.document_id as string;
    const entry = statsMap.get(docId) ?? { total: 0, completed: 0 };
    entry.total++;
    if (a.status === "completed") entry.completed++;
    statsMap.set(docId, entry);
  }

  const result: TacticalDocumentWithStats[] = (docs ?? []).map((d: TacticalPlanDocument) => ({
    ...d,
    total_actions: statsMap.get(d.id)?.total ?? 0,
    completed_actions: statsMap.get(d.id)?.completed ?? 0,
  }));

  return { data: result, error: null };
}

export async function getTacticalPlanDocument(id: string): Promise<{
  data: TacticalPlanDocument | null;
  error: string | null;
}> {
  const supabase = await createClient();
  const auth = await getOfficeId();
  if ("error" in auth) return { data: null, error: auth.error };

  const { data, error } = await supabase
    .from("tactical_plan_documents")
    .select("*")
    .eq("id", id)
    .eq("office_id", auth.officeId)
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as TacticalPlanDocument, error: null };
}

export async function createTacticalPlanDocument(input: {
  title: string;
  period_start?: string;
  period_end?: string;
  horizon?: TacticalHorizon;
}): Promise<{ data: TacticalPlanDocument | null; error: string | null }> {
  const supabase = await createClient();
  const auth = await getOfficeId();
  if ("error" in auth) return { data: null, error: auth.error };

  const { data, error } = await supabase
    .from("tactical_plan_documents")
    .insert({
      office_id: auth.officeId,
      title: input.title.trim(),
      period_start: input.period_start || null,
      period_end: input.period_end || null,
      horizon: input.horizon ?? "trimestral",
      status: "draft",
    })
    .select()
    .single();

  if (error) return { data: null, error: error.message };

  await logAudit({
    office_id: auth.officeId,
    user_id: auth.userId,
    action: "create",
    resource_type: "tactical_plan_document",
    resource_id: data.id,
    details: { title: input.title },
  });

  revalidatePath(REVALIDATE_PATH);
  return { data: data as TacticalPlanDocument, error: null };
}

export async function updateTacticalPlanDocument(
  id: string,
  updates: {
    title?: string;
    period_start?: string | null;
    period_end?: string | null;
    horizon?: TacticalHorizon;
    status?: TacticalDocumentStatus;
    ai_context?: Record<string, unknown> | null;
  }
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const auth = await getOfficeId();
  if ("error" in auth) return { error: auth.error };

  const { error } = await supabase
    .from("tactical_plan_documents")
    .update(updates)
    .eq("id", id)
    .eq("office_id", auth.officeId);

  if (error) return { error: error.message };
  revalidatePath(REVALIDATE_PATH);
  return { error: null };
}

export async function deleteTacticalPlanDocument(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const auth = await getOfficeId();
  if ("error" in auth) return { error: auth.error };

  const { error } = await supabase
    .from("tactical_plan_documents")
    .delete()
    .eq("id", id)
    .eq("office_id", auth.officeId);

  if (error) return { error: error.message };

  await logAudit({
    office_id: auth.officeId,
    user_id: auth.userId,
    action: "delete",
    resource_type: "tactical_plan_document",
    resource_id: id,
    details: {},
  });

  revalidatePath(REVALIDATE_PATH);
  return { error: null };
}

// ── Tactical Actions CRUD (extended tactical_plans) ──

export async function getDocumentActions(documentId: string): Promise<{
  data: TacticalAction[] | null;
  error: string | null;
}> {
  const supabase = await createClient();
  const auth = await getOfficeId();
  if ("error" in auth) return { data: null, error: auth.error };

  const { data, error } = await supabase
    .from("tactical_plans")
    .select("*")
    .eq("office_id", auth.officeId)
    .eq("document_id", documentId)
    .order("priority", { ascending: true })
    .order("deadline", { ascending: true });

  if (error) return { data: null, error: error.message };
  return { data: (data ?? []) as TacticalAction[], error: null };
}

export async function createDocumentAction(input: {
  document_id: string;
  objective_id: string;
  office_objective_id?: string | null;
  action: string;
  description?: string;
  responsible?: string;
  deadline?: string;
  priority?: TacticalPriority;
  kpi?: string;
  category?: TacticalCategory;
  notes?: string;
}): Promise<{ data: TacticalAction | null; error: string | null }> {
  const supabase = await createClient();
  const auth = await getOfficeId();
  if ("error" in auth) return { data: null, error: auth.error };

  const { data, error } = await supabase
    .from("tactical_plans")
    .insert({
      office_id: auth.officeId,
      document_id: input.document_id,
      objective_id: input.objective_id,
      office_objective_id: input.office_objective_id ?? null,
      action: input.action.trim(),
      description: input.description?.trim() || null,
      responsible: input.responsible?.trim() || null,
      deadline: input.deadline || null,
      priority: input.priority ?? "media",
      kpi: input.kpi?.trim() || null,
      category: input.category ?? null,
      notes: input.notes?.trim() || null,
    })
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  revalidatePath(REVALIDATE_PATH);
  return { data: data as TacticalAction, error: null };
}

export async function updateDocumentAction(
  id: string,
  updates: {
    action?: string;
    description?: string | null;
    responsible?: string | null;
    deadline?: string | null;
    priority?: TacticalPriority | null;
    kpi?: string | null;
    category?: TacticalCategory | null;
    status?: string;
    notes?: string | null;
    objective_id?: string;
    office_objective_id?: string | null;
  }
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const auth = await getOfficeId();
  if ("error" in auth) return { error: auth.error };

  const { error } = await supabase
    .from("tactical_plans")
    .update(updates)
    .eq("id", id)
    .eq("office_id", auth.officeId);

  if (error) return { error: error.message };
  revalidatePath(REVALIDATE_PATH);
  return { error: null };
}

export async function deleteDocumentAction(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const auth = await getOfficeId();
  if ("error" in auth) return { error: auth.error };

  const { error } = await supabase
    .from("tactical_plans")
    .delete()
    .eq("id", id)
    .eq("office_id", auth.officeId);

  if (error) return { error: error.message };
  revalidatePath(REVALIDATE_PATH);
  return { error: null };
}

// ── Strategic Data Loader (for AI context) ──

export interface StrategicDataBundle {
  swotItems: { type: string; content: string }[];
  strategicObjectives: { id: string; title: string; description: string | null }[];
  officeObjectives: { id: string; title: string; description: string | null; type: string }[];
  portfolioServices: { name: string; description: string | null; demand_level: string | null; capacity_level: string | null }[];
}

export async function getAllStrategicData(): Promise<{
  data: StrategicDataBundle | null;
  error: string | null;
}> {
  const supabase = await createClient();
  const auth = await getOfficeId();
  if ("error" in auth) return { data: null, error: auth.error };

  const [swotRes, objRes, offObjRes, portfolioRes] = await Promise.all([
    supabase
      .from("swot_items")
      .select("type, content")
      .eq("office_id", auth.officeId)
      .order("created_at", { ascending: true }),
    supabase
      .from("strategic_objectives")
      .select("id, title, description")
      .eq("office_id", auth.officeId)
      .order("created_at", { ascending: true }),
    supabase
      .from("office_objectives")
      .select("id, title, description, type")
      .eq("office_id", auth.officeId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("service_portfolio")
      .select("name, description, demand_level, capacity_level")
      .eq("office_id", auth.officeId)
      .order("created_at", { ascending: false }),
  ]);

  return {
    data: {
      swotItems: (swotRes.data ?? []) as StrategicDataBundle["swotItems"],
      strategicObjectives: (objRes.data ?? []) as StrategicDataBundle["strategicObjectives"],
      officeObjectives: (offObjRes.data ?? []) as StrategicDataBundle["officeObjectives"],
      portfolioServices: (portfolioRes.data ?? []) as StrategicDataBundle["portfolioServices"],
    },
    error: null,
  };
}

// ── Bulk create actions (for AI-generated plans) ──

export async function bulkCreateDocumentActions(
  documentId: string,
  actions: {
    objective_id: string;
    office_objective_id?: string | null;
    action: string;
    description?: string;
    responsible?: string;
    deadline?: string;
    priority?: TacticalPriority;
    kpi?: string;
    category?: TacticalCategory;
  }[]
): Promise<{ count: number; error: string | null }> {
  const supabase = await createClient();
  const auth = await getOfficeId();
  if ("error" in auth) return { count: 0, error: auth.error };

  const rows = actions.map((a) => ({
    office_id: auth.officeId,
    document_id: documentId,
    objective_id: a.objective_id,
    office_objective_id: a.office_objective_id ?? null,
    action: a.action.trim(),
    description: a.description?.trim() || null,
    responsible: a.responsible?.trim() || null,
    deadline: a.deadline || null,
    priority: a.priority ?? "media",
    kpi: a.kpi?.trim() || null,
    category: a.category ?? null,
  }));

  const { error } = await supabase.from("tactical_plans").insert(rows);

  if (error) return { count: 0, error: error.message };
  revalidatePath(REVALIDATE_PATH);
  return { count: rows.length, error: null };
}
