"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function sendNotification(data: {
  title: string;
  message: string;
  target_type: "all" | "office";
  target_office_id?: string;
  channel: "platform" | "email" | "both";
}) {
  if (!data.title?.trim()) return { error: "Título é obrigatório." };
  if (!data.message?.trim()) return { error: "Mensagem é obrigatória." };
  if (data.target_type === "office" && !data.target_office_id) {
    return { error: "Selecione um escritório." };
  }

  const supabase = await createServiceClient();

  const { error } = await supabase.from("notifications").insert({
    title: data.title.trim(),
    message: data.message.trim(),
    target_type: data.target_type,
    target_office_id: data.target_office_id || null,
    channel: data.channel,
  });

  if (error) return { error: error.message };
  revalidatePath("/admin/notificacoes");
  return { success: true };
}
