"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { SYSTEM_AREAS } from "@/lib/system-areas";
import { revalidatePath } from "next/cache";

const FEATURE_KEYS = [
  "value_chain",
  "swot",
  "portfolio",
  "bpm_cycle",
  "ai",
  "knowledge_management",
  "training",
  "custom_ai_api",
  "backup_auto",
] as string[];

const PLAN_FEATURE_KEYS = [
  ...FEATURE_KEYS,
  ...SYSTEM_AREAS.map((area) => area.featureKey),
];

const PROCESS_MANAGEMENT_VERSIONS = ["essential", "professional", "complete"] as const;
type ProcessManagementVersion = (typeof PROCESS_MANAGEMENT_VERSIONS)[number];

function readProcessManagementVersion(formData: FormData): ProcessManagementVersion {
  const value = formData.get("process_management_version");
  if (value === "simple") return "essential";
  return PROCESS_MANAGEMENT_VERSIONS.includes(value as ProcessManagementVersion)
    ? (value as ProcessManagementVersion)
    : "complete";
}

function buildFeatures(formData: FormData): Record<string, boolean | string> {
  const features: Record<string, boolean | string> = {};
  for (const key of PLAN_FEATURE_KEYS) {
    features[key] = formData.get(`features_${key}`) === "true";
  }
  features.process_management_version = readProcessManagementVersion(formData);
  return features;
}

export async function createPlan(formData: FormData) {
  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || null;
  const maxUsers = parseInt(formData.get("max_users") as string, 10);
  const maxProcesses = parseInt(formData.get("max_processes") as string, 10);
  const priceMonthly = parseFloat((formData.get("price_monthly") as string) || "0");

  if (!name?.trim()) {
    return { error: "Nome é obrigatório." };
  }

  if (isNaN(maxUsers) || maxUsers < 0) {
    return { error: "Máximo de usuários inválido." };
  }

  if (isNaN(maxProcesses) || maxProcesses < 0) {
    return { error: "Máximo de processos inválido." };
  }

  if (isNaN(priceMonthly) || priceMonthly < 0) {
    return { error: "Preço mensal inválido." };
  }

  const supabase = await createServiceClient();
  const features = buildFeatures(formData);

  const { error } = await supabase.from("plans").insert({
    name: name.trim(),
    description: description?.trim() || null,
    max_users: maxUsers,
    max_processes: maxProcesses,
    price_monthly: priceMonthly,
    features,
    is_active: true,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/planos");
  revalidatePath("/admin");
  return { success: true };
}

export async function updatePlan(id: string, formData: FormData) {
  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || null;
  const maxUsers = parseInt(formData.get("max_users") as string, 10);
  const maxProcesses = parseInt(formData.get("max_processes") as string, 10);
  const priceMonthly = parseFloat((formData.get("price_monthly") as string) || "0");
  const isActive = formData.get("is_active") === "true";

  if (!name?.trim()) {
    return { error: "Nome é obrigatório." };
  }

  const supabase = await createServiceClient();
  const features = buildFeatures(formData);

  const { error } = await supabase
    .from("plans")
    .update({
      name: name.trim(),
      description: description?.trim() || null,
      max_users: maxUsers,
      max_processes: maxProcesses,
      price_monthly: priceMonthly,
      features,
      is_active: isActive,
    })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/planos");
  revalidatePath(`/admin/planos/${id}`);
  revalidatePath("/admin");
  return { success: true };
}

export async function deletePlan(id: string) {
  const supabase = await createServiceClient();

  const { error } = await supabase.from("plans").delete().eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/planos");
  revalidatePath("/admin");
  return { success: true };
}
