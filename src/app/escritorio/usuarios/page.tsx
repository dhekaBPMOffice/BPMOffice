import Link from "next/link";
import { PageLayout } from "@/components/layout/page-layout";
import { createClient } from "@/lib/supabase/server";
import { getProfile, requireRole } from "@/lib/auth";
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
import { Badge } from "@/components/ui/badge";
import { LayoutGrid, List, Plus, Users } from "lucide-react";

interface UsuariosPageProps {
  searchParams?: Promise<{ aba?: string; visualizacao?: string }>;
}

export default async function UsuariosPage({ searchParams: searchParamsPromise }: UsuariosPageProps) {
  const searchParams: { aba?: string; visualizacao?: string } = await (searchParamsPromise ?? Promise.resolve({}));
  const profile = await requireRole(["leader"]);
  const supabase = await createClient();

  if (!profile.office_id) {
    return (
      <PageLayout title="Usuários" icon={Users}>
        <p className="text-destructive">Erro: escritório não encontrado.</p>
      </PageLayout>
    );
  }

  const { data: users, error } = await supabase
    .from("profiles")
    .select(`
      id,
      full_name,
      email,
      role,
      department,
      is_active,
      last_login_at,
      custom_roles:custom_role_id (
        name
      )
    `)
    .eq("office_id", profile.office_id)
    .order("full_name");

  if (error) {
    return (
      <PageLayout title="Usuários" icon={Users}>
        <p className="text-destructive">Erro ao carregar usuários: {error.message}</p>
      </PageLayout>
    );
  }

  const formatDate = (dateStr: string | null) =>
    dateStr
      ? new Date(dateStr).toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "—";

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin_master: "Admin Master",
      leader: "Líder",
      user: "Usuário",
    };
    return labels[role] ?? role;
  };

  const aba = searchParams?.aba === "arquivados" ? "arquivados" : "lista";
  const visualizacao = searchParams?.visualizacao === "card" ? "card" : "lista";
  const usuariosAtivos = (users ?? []).filter((u) => u.is_active);
  const usuariosArquivados = (users ?? []).filter((u) => !u.is_active);
  const usuariosVisiveis = aba === "arquivados" ? usuariosArquivados : usuariosAtivos;
  const buildHref = (nextAba: "lista" | "arquivados", nextVisualizacao: "lista" | "card") =>
    `/escritorio/usuarios?aba=${nextAba}&visualizacao=${nextVisualizacao}`;
  const getRoleName = (u: (typeof users)[number]) => {
    const cr = u.custom_roles as unknown;
    if (cr && typeof cr === "object" && cr !== null && "name" in cr) {
      return (cr as { name: string }).name ?? getRoleLabel(u.role);
    }
    return getRoleLabel(u.role);
  };

  return (
    <PageLayout
      title="Usuários"
      description="Gerencie os usuários do escritório."
      icon={Users}
      actions={
        <div className="flex gap-2">
          <Link
            href="/escritorio/usuarios/perfis"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 text-sm font-medium"
          >
            Perfis
          </Link>
          <Link
            href="/escritorio/usuarios/novo"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--identity-primary)] text-[var(--identity-primary-foreground)] hover:brightness-110 shadow-sm hover:shadow h-10 px-4 py-2 text-sm font-medium transition-all duration-150"
          >
            <Plus className="h-4 w-4" />
            Novo Usuário
          </Link>
        </div>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Lista de Usuários</CardTitle>
          <CardDescription>
            Nome, e-mail, perfil, departamento e status.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="inline-flex rounded-md bg-muted p-1">
              <Link
                href={buildHref("lista", visualizacao)}
                className={`rounded-sm px-3 py-1.5 text-sm font-medium transition-colors ${
                  aba === "lista" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Lista
              </Link>
              <Link
                href={buildHref("arquivados", visualizacao)}
                className={`rounded-sm px-3 py-1.5 text-sm font-medium transition-colors ${
                  aba === "arquivados" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Arquivados
              </Link>
            </div>

            <div className="inline-flex rounded-md border border-input bg-background p-1">
              <Link
                href={buildHref(aba, "lista")}
                className={`rounded-sm p-2 transition-colors ${
                  visualizacao === "lista" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
                aria-label="Visualização em lista"
              >
                <List className="h-4 w-4" />
              </Link>
              <Link
                href={buildHref(aba, "card")}
                className={`rounded-sm p-2 transition-colors ${
                  visualizacao === "card" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
                aria-label="Visualização em cards"
              >
                <LayoutGrid className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {visualizacao === "lista" ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Último acesso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usuariosVisiveis.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      {aba === "arquivados" ? "Nenhum usuário arquivado." : "Nenhum usuário ativo."}
                    </TableCell>
                  </TableRow>
                ) : (
                  usuariosVisiveis.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.full_name}</TableCell>
                      <TableCell className="text-muted-foreground">{u.email}</TableCell>
                      <TableCell>{getRoleName(u)}</TableCell>
                      <TableCell>{u.department ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={u.is_active ? "success" : "secondary"}>
                          {u.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(u.last_login_at)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          ) : usuariosVisiveis.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              {aba === "arquivados" ? "Nenhum usuário arquivado." : "Nenhum usuário ativo."}
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {usuariosVisiveis.map((u) => (
                <Card key={u.id} className="border border-border/60">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <CardTitle className="text-base">{u.full_name}</CardTitle>
                      <Badge variant={u.is_active ? "success" : "secondary"}>
                        {u.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                    <CardDescription>{u.email}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p className="text-muted-foreground">
                      Perfil: <span className="text-foreground">{getRoleName(u)}</span>
                    </p>
                    <p className="text-muted-foreground">
                      Departamento: <span className="text-foreground">{u.department ?? "—"}</span>
                    </p>
                    <p className="text-muted-foreground">
                      Último acesso: <span className="text-foreground">{formatDate(u.last_login_at)}</span>
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </PageLayout>
  );
}
