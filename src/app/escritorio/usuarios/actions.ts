"use server";

import { revalidatePath } from "next/cache";
import { getProfile } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

export type CreateUserInput = {
  full_name: string;
  email: string;
  phone?: string;
  department?: string;
  job_title?: string;
  custom_role_id?: string | null;
  initial_password: string;
};

export async function createUser(input: CreateUserInput) {
  const profile = await getProfile();
  if (profile.role !== "leader" || !profile.office_id) {
    return { error: "Sem permissão para criar usuários." };
  }

  const supabase = await createServiceClient();

  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: input.email,
    password: input.initial_password,
    email_confirm: true,
  });

  if (authError) {
    return { error: authError.message };
  }

  if (!authUser.user) {
    return { error: "Erro ao criar usuário de autenticação." };
  }

  // Trigger handle_new_user já pode ter criado uma linha em profiles; usar upsert para atualizar com office_id e dados completos
  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      auth_user_id: authUser.user.id,
      office_id: profile.office_id,
      role: "user",
      custom_role_id: input.custom_role_id || null,
      full_name: input.full_name,
      email: input.email,
      phone: input.phone || null,
      department: input.department || null,
      job_title: input.job_title || null,
      must_change_password: true,
      password_change_approved: false,
      is_active: true,
    },
    { onConflict: "auth_user_id" }
  );

  if (profileError) {
    await supabase.auth.admin.deleteUser(authUser.user.id);
    return { error: profileError.message };
  }

  revalidatePath("/escritorio/usuarios");
  return { success: true };
}

export async function updateUser(
  profileId: string,
  data: {
    full_name?: string;
    email?: string;
    phone?: string;
    department?: string;
    job_title?: string;
    custom_role_id?: string | null;
  }
) {
  const profile = await getProfile();
  if (profile.role !== "leader" || !profile.office_id) {
    return { error: "Sem permissão para atualizar usuários." };
  }

  const supabase = await createServiceClient();

  const { error } = await supabase
    .from("profiles")
    .update(data)
    .eq("id", profileId)
    .eq("office_id", profile.office_id);

  if (error) return { error: error.message };

  revalidatePath("/escritorio/usuarios");
  return { success: true };
}

export async function toggleUserActive(profileId: string) {
  const profile = await getProfile();
  if (profile.role !== "leader" || !profile.office_id) {
    return { error: "Sem permissão para alterar status." };
  }

  const supabase = await createServiceClient();

  const { data: target } = await supabase
    .from("profiles")
    .select("is_active")
    .eq("id", profileId)
    .eq("office_id", profile.office_id)
    .single();

  if (!target) return { error: "Usuário não encontrado." };

  const { error } = await supabase
    .from("profiles")
    .update({ is_active: !target.is_active })
    .eq("id", profileId)
    .eq("office_id", profile.office_id);

  if (error) return { error: error.message };

  revalidatePath("/escritorio/usuarios");
  return { success: true };
}

export async function approvePasswordChange(profileId: string) {
  const profile = await getProfile();
  if (profile.role !== "leader" || !profile.office_id) {
    return { error: "Sem permissão." };
  }

  const supabase = await createServiceClient();

  const { error } = await supabase
    .from("profiles")
    .update({ password_change_approved: true })
    .eq("id", profileId)
    .eq("office_id", profile.office_id);

  if (error) return { error: error.message };

  revalidatePath("/escritorio/usuarios");
  return { success: true };
}
