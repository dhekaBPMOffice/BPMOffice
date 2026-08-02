"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createProvider } from "@/lib/ai/providers";

export async function testAiConnection(data: {
  default_provider: string;
  default_model: string;
  default_api_key?: string;
}) {
  await requireRole(["admin_master"]);

  const provider = data.default_provider as "openai" | "anthropic" | "google";
  if (!["openai", "anthropic", "google"].includes(provider)) {
    return { error: "Provedor inválido." };
  }

  const model = data.default_model?.trim();
  if (!model) {
    return { error: "Informe o modelo padrão." };
  }

  let apiKey = data.default_api_key?.trim() ?? "";

  if (!apiKey) {
    const supabase = await createServiceClient();
    const { data: platformConfig } = await supabase
      .from("ai_configs")
      .select("default_api_key_encrypted")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    apiKey = (platformConfig?.default_api_key_encrypted as string | null)?.trim() ?? "";
  }

  if (!apiKey) {
    return {
      error:
        "Nenhuma chave de API informada. Digite uma chave ou salve uma chave padrão antes de testar.",
    };
  }

  try {
    const ai = createProvider(provider, apiKey, model);
    const { text } = await ai.generate("Responda apenas com a palavra OK, sem pontuação.");
    if (!text?.trim()) {
      return { error: "A API respondeu, mas sem texto. Verifique o modelo configurado." };
    }
    return { success: true as const, preview: text.trim().slice(0, 80) };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha ao testar conexão com a IA.";
    return { error: message };
  }
}

export async function saveAiConfig(data: {
  default_provider: string;
  default_model: string;
  default_api_key?: string;
  prompts: Record<string, string>;
}) {
  await requireRole(["admin_master"]);
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
