"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function saveAiConfig(data: {
  default_provider: string;
  default_model: string;
  default_api_key?: string;
  prompts: Record<string, string>;
}) {
  const supabase = await createServiceClient();

  const payload: Record<string, unknown> = {
    default_provider: data.default_provider,
    default_model: data.default_model,
    prompts: data.prompts,
  };

  if (data.default_api_key && data.default_api_key.trim() !== "") {
    payload.default_api_key_encrypted = data.default_api_key.trim();
  }

  const { data: existing } = await supabase
    .from("ai_configs")
    .select("id")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    const updatePayload: Record<string, unknown> = {
      default_provider: data.default_provider,
      default_model: data.default_model,
      prompts: data.prompts,
    };
    if (data.default_api_key?.trim()) {
      updatePayload.default_api_key_encrypted = data.default_api_key.trim();
    }
    const { error } = await supabase
      .from("ai_configs")
      .update(updatePayload)
      .eq("id", existing.id);

    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("ai_configs").insert({
      ...payload,
      is_active: true,
    });

    if (error) return { error: error.message };
  }

  revalidatePath("/admin/ia");
  return { success: true };
}
