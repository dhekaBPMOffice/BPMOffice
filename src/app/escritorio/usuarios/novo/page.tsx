import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageLayout } from "@/components/layout/page-layout";
import { NovoUsuarioForm } from "./novo-usuario-form";
import { UserPlus } from "lucide-react";

export default async function NovoUsuarioPage() {
  const profile = await requireRole(["leader"]);
  const supabase = await createClient();

  if (!profile.office_id) {
    return (
      <PageLayout title="Novo Usuário" icon={UserPlus} backHref="/escritorio/usuarios">
        <p className="text-destructive">Erro: escritório não encontrado.</p>
      </PageLayout>
    );
  }

  const { data: customRoles } = await supabase
    .from("custom_roles")
    .select("id, name")
    .eq("office_id", profile.office_id)
    .order("name");

  return (
    <PageLayout
      title="Novo Usuário"
      description="Crie um novo usuário no escritório."
      icon={UserPlus}
      backHref="/escritorio/usuarios"
    >
      <NovoUsuarioForm customRoles={customRoles ?? []} />
    </PageLayout>
  );
}
