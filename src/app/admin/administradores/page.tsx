import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageLayout } from "@/components/layout/page-layout";
import { ShieldCheck } from "lucide-react";
import { CriarAdminForm } from "./criar-admin-form";
import { PromoverAdminForm } from "./promover-admin-form";
import { RebaixarAdminButton } from "./rebaixar-admin-button";

export default async function AdministradoresPage() {
  await requireRole(["admin_master"]);
  const supabase = await createClient();

  const { data: admins, error } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("role", "admin_master")
    .order("full_name");

  if (error) {
    return (
      <PageLayout
        title="Administradores Master"
        description="Gerencie quem tem acesso à área de administração da plataforma."
        iconName="ShieldCheck"
      >
        <p className="text-destructive">Erro ao carregar administradores: {error.message}</p>
      </PageLayout>
    );
  }

  const adminList = admins ?? [];
  const podeRebaixar = adminList.length > 1;

  return (
    <PageLayout
      title="Administradores Master"
      description="Gerencie quem tem acesso à área de administração da plataforma."
      iconName="ShieldCheck"
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Administradores Master atuais</CardTitle>
            <CardDescription>Usuários com acesso total à área de administração.</CardDescription>
          </CardHeader>
          <CardContent>
            {adminList.length === 0 ? (
              <p className="text-muted-foreground">Nenhum administrador master cadastrado.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>E-mail</TableHead>
                    {podeRebaixar && <TableHead className="w-[120px]">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adminList.map((admin) => (
                    <TableRow key={admin.id}>
                      <TableCell>{admin.full_name ?? "—"}</TableCell>
                      <TableCell>{admin.email}</TableCell>
                      {podeRebaixar && (
                        <TableCell>
                          <RebaixarAdminButton profileId={admin.id} fullName={admin.full_name ?? admin.email} />
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Adicionar administrador master</CardTitle>
            <CardDescription>
              Crie um novo usuário ou promova um usuário existente a administrador master.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div>
              <h4 className="mb-2 font-medium">Criar novo administrador master</h4>
              <p className="mb-3 text-sm text-muted-foreground">
                Cadastre um novo usuário que já terá acesso total à área de administração.
              </p>
              <CriarAdminForm />
            </div>
            <div className="border-t pt-6">
              <h4 className="mb-2 font-medium">Promover usuário existente</h4>
              <p className="mb-3 text-sm text-muted-foreground">
                Se o usuário já existe no sistema, informe o e-mail para promover.
              </p>
              <PromoverAdminForm />
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
