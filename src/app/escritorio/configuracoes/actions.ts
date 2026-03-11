"use server";

import { revalidatePath } from "next/cache";
import { getProfile } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

export type OfficeConfigInput = {
  ai_api_key?: string | null;
  ai_learn_from_history?: boolean;
  notification_review_reminders?: boolean;
};

export async function saveOfficeConfig(input: OfficeConfigInput) {
  const profile = await getProfile();
  if (profile.role !== "leader" || !profile.office_id) {
    return { error: "Sem permissão para alterar configurações." };
  }

  const supabase = await createServiceClient();

  const { data: existing } = await supabase
    .from("office_config")
    .select("id")
    .eq("office_id", profile.office_id)
    .single();

  const payload: Record<string, unknown> = {
    ai_learn_from_history: input.ai_learn_from_history ?? true,
    notification_review_reminders: input.notification_review_reminders ?? true,
  };

  if (input.ai_api_key !== undefined) {
    payload.ai_api_key_encrypted = input.ai_api_key ? input.ai_api_key : null;
  }

  if (existing) {
    const { error } = await supabase
      .from("office_config")
      .update(payload)
      .eq("id", existing.id);

    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("office_config").insert({
      office_id: profile.office_id,
      ...payload,
    });

    if (error) return { error: error.message };
  }

  revalidatePath("/escritorio/configuracoes");
  return { success: true };
}
