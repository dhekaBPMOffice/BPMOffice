import Link from "next/link";
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
import { PageLayout } from "@/components/layout/page-layout";
import { buttonVariants } from "@/components/ui/button";
import { ClipboardList, LayoutGrid, List, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface DemandasPageProps {
  searchParams?: {
    aba?: string;
    visualizacao?: string;
  };
}

export default async function DemandasPage({ searchParams }: DemandasPageProps) {
  const profile = await requireRole(["leader", "user"]);
  const supabase = await createClient();

  if (!profile.office_id) {
    return (
      <PageLayout title="Demandas" icon={ClipboardList}>
        <p className="text-destructive">Erro: escritório não encontrado.</p>
      </PageLayout>
    );
  }

  const { data: demands, error } = await supabase
    .from("demands")
    .select(`
      id,
      title,
      status,
      priority,
      assigned_to,
      created_at,
      assigned_profile:assigned_to (full_name)
    `)
    .eq("office_id", profile.office_id)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <PageLayout title="Demandas" icon={ClipboardList}>
        <p className="text-destructive">Erro ao carregar demandas: {error.message}</p>
      </PageLayout>
    );
  }

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning"; label: string }> = {
      active: { variant: "success", label: "Ativa" },
      paused: { variant: "warning", label: "Pausada" },
      completed: { variant: "secondary", label: "Concluída" },
      cancelled: { variant: "destructive", label: "Cancelada" },
    };
    const c = config[status] ?? { variant: "outline" as const, label: status };
    return <Badge variant={c.variant}>{c.label}</Badge>;
  };

  const getPriorityLabel = (priority: string) => {
    const labels: Record<string, string> = {
      low: "Baixa",
      medium: "Média",
      high: "Alta",
      urgent: "Urgente",
    };
    return labels[priority] ?? priority;
  };

  const aba = searchParams?.aba === "arquivados" ? "arquivados" : "lista";
  const visualizacao = searchParams?.visualizacao === "card" ? "card" : "lista";
  const demandasAtivas = (demands ?? []).filter(
    (demand) => demand.status !== "completed" && demand.status !== "cancelled"
  );
  const demandasArquivadas = (demands ?? []).filter(
    (demand) => demand.status === "completed" || demand.status === "cancelled"
  );
  const demandasVisiveis = aba === "arquivados" ? demandasArquivadas : demandasAtivas;
  const buildHref = (nextAba: "lista" | "arquivados", nextVisualizacao: "lista" | "card") =>
    `/escritorio/demandas?aba=${nextAba}&visualizacao=${nextVisualizacao}`;

  return (
    <PageLayout
      title="Demandas"
      description="Gerencie as demandas do ciclo BPM."
      icon={ClipboardList}
      actions={
        <Link
          href="/escritorio/demandas/nova"
          className={cn(
            buttonVariants({ variant: "default", size: "default" }),
            "gap-2"
          )}
        >
          <Plus className="h-4 w-4" />
          Nova Demanda
        </Link>
      }
    >
      {/* Toolbar: abas + toggle de visualização */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-lg bg-muted/50 p-1">
          <Link
            href={buildHref("lista", visualizacao)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-150 ${
              aba === "lista" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Lista
          </Link>
          <Link
            href={buildHref("arquivados", visualizacao)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-150 ${
              aba === "arquivados" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Arquivados
          </Link>
        </div>

        <div className="inline-flex rounded-lg border border-border/60 bg-background p-1">
          <Link
            href={buildHref(aba, "lista")}
            className={`rounded-md p-2 transition-all duration-150 ${
              visualizacao === "lista" ? "bg-muted/50 text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
            aria-label="Visualização em lista"
          >
            <List className="h-4 w-4" />
          </Link>
          <Link
            href={buildHref(aba, "card")}
            className={`rounded-md p-2 transition-all duration-150 ${
              visualizacao === "card" ? "bg-muted/50 text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
            aria-label="Visualização em cards"
          >
            <LayoutGrid className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Conteúdo */}
      {visualizacao === "lista" ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {demandasVisiveis.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      {aba === "arquivados" ? "Nenhuma demanda arquivada." : "Nenhuma demanda ativa."}
                    </TableCell>
                  </TableRow>
                ) : (
                  demandasVisiveis.map((d) => {
                    const assigned = d.assigned_profile as unknown;
                    const assignedName = assigned && typeof assigned === "object" && "full_name" in assigned
                      ? (assigned as { full_name: string }).full_name
                      : "—";
                    return (
                      <TableRow key={d.id}>
                        <TableCell className="font-medium">
                          <Link
                            href={`/escritorio/demandas/${d.id}`}
                            className="hover:underline text-[var(--identity-primary)]"
                          >
                            {d.title}
                          </Link>
                        </TableCell>
                        <TableCell>{getStatusBadge(d.status)}</TableCell>
                        <TableCell>{getPriorityLabel(d.priority)}</TableCell>
                        <TableCell className="text-muted-foreground">{assignedName}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(d.created_at)}
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/escritorio/demandas/${d.id}`}
                            className="text-sm text-[var(--identity-primary)] hover:underline"
                          >
                            Ver
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : demandasVisiveis.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">
          {aba === "arquivados" ? "Nenhuma demanda arquivada." : "Nenhuma demanda ativa."}
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {demandasVisiveis.map((d) => {
            const assigned = d.assigned_profile as unknown;
            const assignedName = assigned && typeof assigned === "object" && "full_name" in assigned
              ? (assigned as { full_name: string }).full_name
              : "—";

            return (
              <Card key={d.id} className="card-hover-shadow hover:-translate-y-0.5"
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{d.title}</CardTitle>
                  <CardDescription>
                    Prioridade: {getPriorityLabel(d.priority)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div>{getStatusBadge(d.status)}</div>
                  <p className="text-muted-foreground">
                    Responsável: <span className="text-foreground">{assignedName}</span>
                  </p>
                  <p className="text-muted-foreground">
                    Criado em: <span className="text-foreground">{formatDate(d.created_at)}</span>
                  </p>
                  <div className="pt-2">
                    <Link
                      href={`/escritorio/demandas/${d.id}`}
                      className="text-sm text-[var(--identity-primary)] hover:underline font-medium"
                    >
                      Ver demanda
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </PageLayout>
  );
}
