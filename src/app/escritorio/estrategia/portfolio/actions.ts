"use server";

import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export interface ServicePortfolio {
  id: string;
  office_id: string;
  base_service_id: string | null;
  name: string;
  description: string | null;
  methodology: string | null;
  deliverables: string | null;
  resources: string | null;
  team: string | null;
  pricing: string | null;
  marketing: string | null;
  demand_level: string | null;
  capacity_level: string | null;
  is_custom: boolean;
  created_at: string;
  updated_at: string;
}

export interface BaseService {
  id: string;
  name: string;
  description: string | null;
  methodology: string | null;
  deliverables: string | null;
}

export async function getBaseServices(): Promise<{
  data: BaseService[] | null;
  error: string | null;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("base_services")
    .select("id, name, description, methodology, deliverables")
    .eq("is_active", true)
    .order("name");

  if (error) return { data: null, error: error.message };
  return { data: data as BaseService[], error: null };
}

export async function getServicePortfolio(): Promise<{
  data: ServicePortfolio[] | null;
  error: string | null;
}> {
  const supabase = await createClient();
  const profile = await getProfile();

  if (!profile.office_id) {
    return { data: null, error: "Escritório não encontrado." };
  }

  const { data, error } = await supabase
    .from("service_portfolio")
    .select("*")
    .eq("office_id", profile.office_id)
    .order("created_at", { ascending: false });

  if (error) return { data: null, error: error.message };
  return { data: data as ServicePortfolio[], error: null };
}

export async function createServicePortfolio(
  input: {
    base_service_id?: string | null;
    name: string;
    description?: string;
    methodology?: string;
    deliverables?: string;
    resources?: string;
    team?: string;
    pricing?: string;
    marketing?: string;
    demand_level?: string | null;
    capacity_level?: string | null;
    is_custom: boolean;
  }
): Promise<{ data: ServicePortfolio | null; error: string | null }> {
  const supabase = await createClient();
  const profile = await getProfile();

  if (!profile.office_id) {
    return { data: null, error: "Escritório não encontrado." };
  }

  const { data, error } = await supabase
    .from("service_portfolio")
    .insert({
      office_id: profile.office_id,
      base_service_id: input.base_service_id ?? null,
      name: input.name,
      description: input.description || null,
      methodology: input.methodology || null,
      deliverables: input.deliverables || null,
      resources: input.resources || null,
      team: input.team || null,
      pricing: input.pricing || null,
      marketing: input.marketing || null,
      demand_level: input.demand_level || null,
      capacity_level: input.capacity_level || null,
      is_custom: input.is_custom,
    })
    .select()
    .single();

  if (error) return { data: null, error: error.message };

  await logAudit({
    office_id: profile.office_id,
    user_id: profile.id,
    action: "create",
    resource_type: "service_portfolio",
    resource_id: data.id,
    details: { name: input.name },
  });

  revalidatePath("/escritorio/estrategia/portfolio");
  return { data: data as ServicePortfolio, error: null };
}

export async function updateServicePortfolio(
  id: string,
  updates: {
    name?: string;
    description?: string | null;
    methodology?: string | null;
    deliverables?: string | null;
    resources?: string | null;
    team?: string | null;
    pricing?: string | null;
    marketing?: string | null;
    demand_level?: string | null;
    capacity_level?: string | null;
  }
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const profile = await getProfile();

  if (!profile.office_id) {
    return { error: "Escritório não encontrado." };
  }

  const { error } = await supabase
    .from("service_portfolio")
    .update(updates)
    .eq("id", id)
    .eq("office_id", profile.office_id);

  if (error) return { error: error.message };

  revalidatePath("/escritorio/estrategia/portfolio");
  return { error: null };
}

export async function deleteServicePortfolio(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const profile = await getProfile();

  if (!profile.office_id) {
    return { error: "Escritório não encontrado." };
  }

  const { error } = await supabase
    .from("service_portfolio")
    .delete()
    .eq("id", id)
    .eq("office_id", profile.office_id);

  if (error) return { error: error.message };

  await logAudit({
    office_id: profile.office_id,
    user_id: profile.id,
    action: "delete",
    resource_type: "service_portfolio",
    resource_id: id,
    details: {},
  });

  revalidatePath("/escritorio/estrategia/portfolio");
  return { error: null };
}
