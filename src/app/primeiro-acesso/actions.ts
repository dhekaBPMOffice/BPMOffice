"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";

export type ConfirmarPrimeiroAcessoResult =
  | { success: true; role: string }
  | { success: false; error: string };

export async function confirmarPrimeiroAcesso(): Promise<ConfirmarPrimeiroAcessoResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Não autenticado." };
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { success: false, error: "Configuração do servidor incompleta. Avise o administrador." };
  }

  const supabaseAdmin = await createServiceClient();
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .update({ must_change_password: false })
    .eq("auth_user_id", user.id)
    .select("role")
    .single();

  if (error || !data) {
    const message =
      process.env.NODE_ENV === "development" && error?.message
        ? error.message
        : "Erro ao confirmar acesso. Tente novamente.";
    return { success: false, error: message };
  }

  return { success: true, role: data.role };
}
