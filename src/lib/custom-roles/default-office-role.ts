import type { SupabaseClient } from "@supabase/supabase-js";

export const SYSTEM_DEFAULT_ROLE_NAME = "Usuário padrão";

export const SYSTEM_DEFAULT_ROLE_DESCRIPTION =
  "Perfil definido pelo sistema: acesso de colaborador à Área de Trabalho, Demandas, Conhecimento e Capacitação (conforme o plano do escritório). Não pode ser editado. Para regras diferentes, crie um perfil customizado.";

/** Recursos alinhados à tela de Perfis e ao menu do usuário comum. */
export const SYSTEM_DEFAULT_ROLE_RESOURCES = [
  "demandas",
  "conhecimento",
  "capacitacao",
  "processos",
  "estrategia",
  "usuarios",
] as const;

type PermissionFlags = {
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
};

const SYSTEM_DEFAULT_PERMISSIONS: Record<
  (typeof SYSTEM_DEFAULT_ROLE_RESOURCES)[number],
  PermissionFlags
> = {
  demandas: { can_view: true, can_create: true, can_edit: true, can_delete: false },
  conhecimento: { can_view: true, can_create: false, can_edit: false, can_delete: false },
  capacitacao: { can_view: true, can_create: false, can_edit: false, can_delete: false },
  processos: { can_view: false, can_create: false, can_edit: false, can_delete: false },
  estrategia: { can_view: false, can_create: false, can_edit: false, can_delete: false },
  usuarios: { can_view: false, can_create: false, can_edit: false, can_delete: false },
};

export type SystemDefaultRoleRow = {
  id: string;
  office_id: string;
  name: string;
  description: string | null;
  is_system_default: boolean;
};

async function upsertSystemDefaultPermissions(
  supabase: SupabaseClient,
  roleId: string
) {
  for (const resource of SYSTEM_DEFAULT_ROLE_RESOURCES) {
    const permissions = SYSTEM_DEFAULT_PERMISSIONS[resource];
    const { data: existing } = await supabase
      .from("role_permissions")
      .select("id")
      .eq("role_id", roleId)
      .eq("resource", resource)
      .maybeSingle();

    if (existing) {
      await supabase.from("role_permissions").update(permissions).eq("id", existing.id);
    } else {
      await supabase.from("role_permissions").insert({
        role_id: roleId,
        resource,
        ...permissions,
      });
    }
  }
}

async function backfillUsersToDefaultRole(
  supabase: SupabaseClient,
  officeId: string,
  defaultRoleId: string
) {
  await supabase
    .from("profiles")
    .update({ custom_role_id: defaultRoleId })
    .eq("office_id", officeId)
    .eq("role", "user")
    .is("custom_role_id", null);
}

/**
 * Garante um perfil padrão do sistema por escritório (idempotente).
 */
export async function ensureDefaultOfficeRole(
  supabase: SupabaseClient,
  officeId: string
): Promise<SystemDefaultRoleRow> {
  const { data: existing } = await supabase
    .from("custom_roles")
    .select("id, office_id, name, description, is_system_default")
    .eq("office_id", officeId)
    .eq("is_system_default", true)
    .maybeSingle();

  if (existing) {
    await upsertSystemDefaultPermissions(supabase, existing.id);
    await backfillUsersToDefaultRole(supabase, officeId, existing.id);
    return existing as SystemDefaultRoleRow;
  }

  const { data: created, error } = await supabase
    .from("custom_roles")
    .insert({
      office_id: officeId,
      name: SYSTEM_DEFAULT_ROLE_NAME,
      description: SYSTEM_DEFAULT_ROLE_DESCRIPTION,
      is_system_default: true,
    })
    .select("id, office_id, name, description, is_system_default")
    .single();

  if (error || !created) {
    throw new Error(error?.message ?? "Erro ao criar perfil padrão do escritório.");
  }

  await upsertSystemDefaultPermissions(supabase, created.id);
  await backfillUsersToDefaultRole(supabase, officeId, created.id);

  return created as SystemDefaultRoleRow;
}

export async function resolveUserCustomRoleId(
  supabase: SupabaseClient,
  officeId: string,
  customRoleId: string | null | undefined
): Promise<string> {
  if (customRoleId?.trim()) {
    return customRoleId.trim();
  }
  const role = await ensureDefaultOfficeRole(supabase, officeId);
  return role.id;
}

export function isSystemDefaultRole(role: { is_system_default?: boolean | null }): boolean {
  return role.is_system_default === true;
}
