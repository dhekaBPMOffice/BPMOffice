"use server";

import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export interface Backup {
  id: string;
  office_id: string | null;
  type: "manual" | "automatic";
  status: string;
  file_url: string | null;
  created_by: string | null;
  created_at: string;
}

export interface OfficeBackupConfig {
  id: string;
  office_id: string;
  enabled: boolean;
  frequency: string | null;
  created_at: string;
  updated_at: string;
}

export async function getBackups(): Promise<{ data: Backup[] | null; error: string | null }> {
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile.office_id) return { data: null, error: "Escritório não encontrado." };

  const { data, error } = await supabase
    .from("backups")
    .select("*")
    .eq("office_id", profile.office_id)
    .order("created_at", { ascending: false });

  if (error) return { data: null, error: error.message };
  return { data: (data ?? []) as Backup[], error: null };
}

export async function createManualBackup(): Promise<{ data: Backup | null; error: string | null }> {
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile.office_id) return { data: null, error: "Escritório não encontrado." };

  const { data, error } = await supabase
    .from("backups")
    .insert({
      office_id: profile.office_id,
      type: "manual",
      status: "pending",
      created_by: profile.id,
    })
    .select()
    .single();

  if (error) return { data: null, error: error.message };

  revalidatePath("/escritorio/backup");
  return { data: data as Backup, error: null };
}

export async function getOfficeBackupConfig(): Promise<{
  data: OfficeBackupConfig | null;
  error: string | null;
}> {
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile.office_id) return { data: null, error: "Escritório não encontrado." };

  const { data, error } = await supabase
    .from("backup_config")
    .select("*")
    .eq("office_id", profile.office_id)
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") return { data: null, error: error.message };
  return { data: data as OfficeBackupConfig | null, error: null };
}

export async function saveOfficeBackupConfig(input: {
  enabled: boolean;
  frequency?: string;
}): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile.office_id) return { error: "Escritório não encontrado." };

  const { data: existing } = await supabase
    .from("backup_config")
    .select("id")
    .eq("office_id", profile.office_id)
    .limit(1)
    .single();

  if (existing) {
    const { error } = await supabase
      .from("backup_config")
      .update({
        enabled: input.enabled,
        frequency: input.frequency || null,
      })
      .eq("id", existing.id);

    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("backup_config").insert({
      office_id: profile.office_id,
      enabled: input.enabled,
      frequency: input.frequency || null,
    });

    if (error) return { error: error.message };
  }

  revalidatePath("/escritorio/backup");
  return { error: null };
}
