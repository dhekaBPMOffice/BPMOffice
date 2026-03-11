"use server";

import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export interface ProcessFramework {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  is_active: boolean;
}

export interface OfficeFramework {
  id: string;
  office_id: string;
  framework_id: string;
  is_active: boolean;
  created_at: string;
}

export async function getFrameworks(): Promise<{
  frameworks: ProcessFramework[];
  activeIds: string[];
  error: string | null;
}> {
  const supabase = await createClient();
  const profile = await getProfile();

  if (!profile.office_id) {
    return { frameworks: [], activeIds: [], error: "Escritório não encontrado." };
  }

  const { data: frameworks, error: frameworksError } = await supabase
    .from("process_frameworks")
    .select("id, name, description, category, is_active")
    .eq("is_active", true)
    .order("name");

  if (frameworksError) {
    return { frameworks: [], activeIds: [], error: frameworksError.message };
  }

  const { data: officeFrameworks } = await supabase
    .from("office_frameworks")
    .select("framework_id")
    .eq("office_id", profile.office_id)
    .eq("is_active", true);

  const activeIds = (officeFrameworks ?? []).map((of) => of.framework_id);

  return {
    frameworks: frameworks ?? [],
    activeIds,
    error: null,
  };
}

export async function toggleFramework(
  frameworkId: string,
  isActive: boolean
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const profile = await getProfile();

  if (!profile.office_id) {
    return { error: "Escritório não encontrado." };
  }

  const { data: existing } = await supabase
    .from("office_frameworks")
    .select("id")
    .eq("office_id", profile.office_id)
    .eq("framework_id", frameworkId)
    .single();

  if (existing) {
    const { error } = await supabase
      .from("office_frameworks")
      .update({ is_active: isActive })
      .eq("id", existing.id);

    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("office_frameworks").insert({
      office_id: profile.office_id,
      framework_id: frameworkId,
      is_active: isActive,
    });

    if (error) return { error: error.message };
  }

  revalidatePath("/escritorio/estrategia/framework");
  return { error: null };
}
