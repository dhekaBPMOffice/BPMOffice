"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { validatePassword } from "@/lib/password";
import { revalidatePath } from "next/cache";

export type CriarAdminMasterInput = {
  full_name: string;
  email: string;
  initial_password: string;
};

export async function criarAdminMaster(input: CriarAdminMasterInput): Promise<{
  success?: boolean;
  error?: string;
}> {
  await requireRole(["admin_master"]);

  if (!input.full_name?.trim() || !input.email?.trim() || !input.initial_password) {
    return { error: "Nome, e-mail e senha são obrigatórios." };
  }

  const pwdResult = validatePassword(input.initial_password);
  if (!pwdResult.valid) {
    return { error: pwdResult.error };
  }

  const supabase = await createServiceClient();

  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: input.email.trim(),
    password: input.initial_password,
    email_confirm: true,
    user_metadata: { full_name: input.full_name.trim() },
  });

  if (authError) {
    if (
      authError.message?.includes("already been registered") ||
      authError.message?.includes("already exists")
    ) {
      return {
        error: "Este e-mail já está cadastrado. Use a opção Promover usuário existente.",
      };
    }
    return { error: authError.message };
  }

  if (!authUser.user) {
    return { error: "Erro ao criar usuário de autenticação." };
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .upsert(
      {
        auth_user_id: authUser.user.id,
        office_id: null,
        role: "admin_master",
        full_name: input.full_name.trim(),
        email: input.email.trim(),
        must_change_password: false,
        password_change_approved: true,
        is_active: true,
      },
      { onConflict: "auth_user_id" }
    );

  if (profileError) {
    await supabase.auth.admin.deleteUser(authUser.user.id);
    return { error: profileError.message };
  }

  revalidatePath("/admin/administradores");
  revalidatePath("/admin");
  return { success: true };
}

export async function promoverAdminMaster(email: string): Promise<{
  success?: boolean;
  error?: string;
}> {
  await requireRole(["admin_master"]);

  const trimmed = email?.trim();
  if (!trimmed) {
    return { error: "Informe o e-mail do usuário." };
  }

  const supabase = await createClient();

  const { data: profile, error: fetchError } = await supabase
    .from("profiles")
    .select("id, role")
    .ilike("email", trimmed)
    .limit(1)
    .single();

  if (fetchError || !profile) {
    return {
      error: "Usuário não encontrado. O usuário deve existir no sistema (ter feito login ao menos uma vez).",
    };
  }

  if (profile.role === "admin_master") {
    return { error: "Este usuário já é administrador master." };
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      role: "admin_master",
      must_change_password: false,
      password_change_approved: true,
    })
    .eq("id", profile.id);

  if (updateError) {
    return { error: updateError.message };
  }

  revalidatePath("/admin/administradores");
  revalidatePath("/admin");
  return { success: true };
}

export async function removerAdminMaster(profileId: string): Promise<{
  success?: boolean;
  error?: string;
}> {
  await requireRole(["admin_master"]);

  if (!profileId?.trim()) {
    return { error: "ID do perfil inválido." };
  }

  const supabase = await createClient();

  const { count, error: countError } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "admin_master");

  if (countError) {
    return { error: countError.message };
  }

  if ((count ?? 0) <= 1) {
    return { error: "Não é possível remover o último administrador master." };
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ role: "user" })
    .eq("id", profileId)
    .eq("role", "admin_master");

  if (updateError) {
    return { error: updateError.message };
  }

  revalidatePath("/admin/administradores");
  revalidatePath("/admin");
  return { success: true };
}
