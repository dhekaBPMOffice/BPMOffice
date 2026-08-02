import { requireRole } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { ensureDefaultOfficeRole } from "@/lib/custom-roles/default-office-role";
import { PageLayout } from "@/components/layout/page-layout";
import { NovoUsuarioForm } from "./novo-usuario-form";
import { UserPlus } from "lucide-react";

export default async function NovoUsuarioPage() {
  const profile = await requireRole(["leader"]);
  const supabase = await createServiceClient();

  if (!profile.office_id) {
    return (
      <PageLayout title="Novo Usuário" iconName="UserPlus" backHref="/escritorio/usuarios">
        <p className="text-destructive">Erro: escritório não encontrado.</p>
      </PageLayout>
    );
  }

  const defaultRole = await ensureDefaultOfficeRole(supabase, profile.office_id);

  const { data: customRoles } = await supabase
    .from("custom_roles")
    .select("id, name, is_system_default, description")
    .eq("office_id", profile.office_id)
    .order("is_system_default", { ascending: false })
    .order("name");

  return (
    <PageLayout
      title="Novo Usuário"
      description="Crie um novo usuário no escritório."
      iconName="UserPlus"
      backHref="/escritorio/usuarios"
    >
      <NovoUsuarioForm
        customRoles={customRoles ?? []}
        defaultRoleId={defaultRole.id}
      />
    </PageLayout>
  );
}
