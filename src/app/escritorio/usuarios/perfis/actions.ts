"use server";

import { revalidatePath } from "next/cache";
import { getProfile } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function createRole(name: string, description?: string) {
  const profile = await getProfile();
  if (profile.role !== "leader" || !profile.office_id) {
    return { error: "Sem permissão para criar perfis." };
  }

  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from("custom_roles")
    .insert({
      office_id: profile.office_id,
      name,
      description: description || null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/escritorio/usuarios/perfis");
  return { success: true, id: data.id };
}

export async function updateRole(roleId: string, name: string, description?: string) {
  const profile = await getProfile();
  if (profile.role !== "leader" || !profile.office_id) {
    return { error: "Sem permissão para atualizar perfis." };
  }

  const supabase = await createServiceClient();

  const { error } = await supabase
    .from("custom_roles")
    .update({ name, description: description || null })
    .eq("id", roleId)
    .eq("office_id", profile.office_id);

  if (error) return { error: error.message };

  revalidatePath("/escritorio/usuarios/perfis");
  return { success: true };
}

export async function deleteRole(roleId: string) {
  const profile = await getProfile();
  if (profile.role !== "leader" || !profile.office_id) {
    return { error: "Sem permissão para excluir perfis." };
  }

  const supabase = await createServiceClient();

  const { error } = await supabase
    .from("custom_roles")
    .delete()
    .eq("id", roleId)
    .eq("office_id", profile.office_id);

  if (error) return { error: error.message };

  revalidatePath("/escritorio/usuarios/perfis");
  return { success: true };
}

export async function setRolePermission(
  roleId: string,
  resource: string,
  permissions: { can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean }
) {
  const profile = await getProfile();
  if (profile.role !== "leader" || !profile.office_id) {
    return { error: "Sem permissão." };
  }

  const supabase = await createServiceClient();

  const { data: existing } = await supabase
    .from("role_permissions")
    .select("id")
    .eq("role_id", roleId)
    .eq("resource", resource)
    .single();

  if (existing) {
    const { error } = await supabase
      .from("role_permissions")
      .update(permissions)
      .eq("id", existing.id);

    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("role_permissions").insert({
      role_id: roleId,
      resource,
      ...permissions,
    });

    if (error) return { error: error.message };
  }

  revalidatePath("/escritorio/usuarios/perfis");
  return { success: true };
}
