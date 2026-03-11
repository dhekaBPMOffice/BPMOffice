"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { revalidatePath } from "next/cache";

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function createOffice(formData: FormData) {
  const name = formData.get("name") as string;
  const slugInput = formData.get("slug") as string;
  const planId = formData.get("plan_id") as string | null;

  if (!name?.trim()) {
    return { error: "Nome é obrigatório." };
  }

  const slug = slugInput?.trim() || generateSlug(name);
  if (!slug) {
    return { error: "Slug inválido. Use um nome com caracteres válidos." };
  }

  const supabase = await createServiceClient();

  const { data: office, error: officeError } = await supabase
    .from("offices")
    .insert({
      name: name.trim(),
      slug,
      plan_id: planId || null,
      is_active: true,
    })
    .select("id")
    .single();

  if (officeError) {
    if (officeError.code === "23505") {
      return { error: "Já existe um escritório com este slug." };
    }
    return { error: officeError.message };
  }

  if (office) {
    const { error: brandingError } = await supabase.from("branding").insert({
      office_id: office.id,
      primary_color: "#0097a7",
      secondary_color: "#7b1fa2",
      accent_color: "#c2185b",
      is_default: false,
    });

    if (brandingError) {
      // Rollback: delete office if branding fails
      await supabase.from("offices").delete().eq("id", office.id);
      return { error: "Erro ao criar identidade visual do escritório." };
    }
  }

  revalidatePath("/admin/escritorios");
  revalidatePath("/admin");
  return { success: true };
}

export async function updateOffice(id: string, formData: FormData) {
  const name = formData.get("name") as string;
  const slug = formData.get("slug") as string;
  const planId = formData.get("plan_id") as string | null;
  const isActive = formData.get("is_active") === "true";

  if (!name?.trim()) {
    return { error: "Nome é obrigatório." };
  }

  const finalSlug = slug?.trim() || generateSlug(name);
  if (!finalSlug) {
    return { error: "Slug inválido." };
  }

  const supabase = await createServiceClient();

  const { error } = await supabase
    .from("offices")
    .update({
      name: name.trim(),
      slug: finalSlug,
      plan_id: planId || null,
      is_active: isActive,
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return { error: "Já existe um escritório com este slug." };
    }
    return { error: error.message };
  }

  revalidatePath("/admin/escritorios");
  revalidatePath(`/admin/escritorios/${id}`);
  revalidatePath("/admin");
  return { success: true };
}

export async function deleteOffice(id: string) {
  const supabase = await createServiceClient();

  const { error } = await supabase.from("offices").delete().eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/escritorios");
  revalidatePath("/admin");
  return { success: true };
}

export type CreateLeaderInput = {
  full_name: string;
  email: string;
  initial_password: string;
};

export async function createLeader(officeId: string, input: CreateLeaderInput) {
  const profile = await getProfile();
  if (profile.role !== "admin_master") {
    return { error: "Sem permissão para cadastrar líder." };
  }

  if (!input.full_name?.trim() || !input.email?.trim() || !input.initial_password) {
    return { error: "Nome, e-mail e senha são obrigatórios." };
  }

  if (input.initial_password.length < 6) {
    return { error: "A senha deve ter pelo menos 6 caracteres." };
  }

  const supabase = await createServiceClient();

  const { data: office, error: officeError } = await supabase
    .from("offices")
    .select("id")
    .eq("id", officeId)
    .single();

  if (officeError || !office) {
    return { error: "Escritório não encontrado." };
  }

  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: input.email.trim(),
    password: input.initial_password,
    email_confirm: true,
    user_metadata: { full_name: input.full_name.trim() },
  });

  if (authError) {
    return { error: authError.message };
  }

  if (!authUser.user) {
    return { error: "Erro ao criar usuário de autenticação." };
  }

  // O trigger handle_new_user pode já ter criado o perfil; usar upsert para atualizar para líder
  const { error: profileError } = await supabase
    .from("profiles")
    .upsert(
      {
        auth_user_id: authUser.user.id,
        office_id: officeId,
        role: "leader",
        full_name: input.full_name.trim(),
        email: input.email.trim(),
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

  revalidatePath("/admin/escritorios");
  revalidatePath(`/admin/escritorios/${officeId}`);
  revalidatePath("/admin");
  return { success: true };
}
