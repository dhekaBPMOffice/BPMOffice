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

export interface PlatformBackupConfig {
  id: string;
  enabled: boolean;
  frequency: string | null;
  created_at: string;
  updated_at: string;
}

export async function getBackups(): Promise<{ data: Backup[] | null; error: string | null }> {
  const supabase = await createClient();
  const profile = await getProfile();
  if (profile.role !== "admin_master") return { data: null, error: "Acesso negado." };

  const { data, error } = await supabase
    .from("backups")
    .select("*")
    .is("office_id", null)
    .order("created_at", { ascending: false });

  if (error) return { data: null, error: error.message };
  return { data: (data ?? []) as Backup[], error: null };
}

export async function createManualBackup(): Promise<{ data: Backup | null; error: string | null }> {
  const supabase = await createClient();
  const profile = await getProfile();
  if (profile.role !== "admin_master") return { data: null, error: "Acesso negado." };

  const { data, error } = await supabase
    .from("backups")
    .insert({
      office_id: null,
      type: "manual",
      status: "pending",
      created_by: profile.id,
    })
    .select()
    .single();

  if (error) return { data: null, error: error.message };

  revalidatePath("/admin/backup");
  return { data: data as Backup, error: null };
}

export async function getPlatformBackupConfig(): Promise<{
  data: PlatformBackupConfig | null;
  error: string | null;
}> {
  const supabase = await createClient();
  const profile = await getProfile();
  if (profile.role !== "admin_master") return { data: null, error: "Acesso negado." };

  const { data, error } = await supabase
    .from("platform_backup_config")
    .select("*")
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") return { data: null, error: error.message };
  return { data: data as PlatformBackupConfig | null, error: null };
}

export async function savePlatformBackupConfig(input: {
  enabled: boolean;
  frequency?: string;
}): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const profile = await getProfile();
  if (profile.role !== "admin_master") return { error: "Acesso negado." };

  const { data: existing } = await supabase
    .from("platform_backup_config")
    .select("id")
    .limit(1)
    .single();

  if (existing) {
    const { error } = await supabase
      .from("platform_backup_config")
      .update({
        enabled: input.enabled,
        frequency: input.frequency || null,
      })
      .eq("id", existing.id);

    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("platform_backup_config").insert({
      enabled: input.enabled,
      frequency: input.frequency || null,
    });

    if (error) return { error: error.message };
  }

  revalidatePath("/admin/backup");
  return { error: null };
}
