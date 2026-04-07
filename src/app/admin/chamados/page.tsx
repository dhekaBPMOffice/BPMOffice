import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
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
import { Button } from "@/components/ui/button";
import { PageLayout } from "@/components/layout/page-layout";
import { Headphones, LayoutGrid, List } from "lucide-react";

interface ChamadosPageProps {
  searchParams?: Promise<{ aba?: string; visualizacao?: string }>;
}

export default async function ChamadosPage({ searchParams: searchParamsPromise }: ChamadosPageProps) {
  const searchParams: { aba?: string; visualizacao?: string } = await (searchParamsPromise ?? Promise.resolve({}));
  const supabase = await createServiceClient();

  const { data: tickets, error } = await supabase
    .from("support_tickets")
    .select(`
      id,
      title,
      status,
      created_at,
      offices (
        name
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <PageLayout title="Chamados de Suporte" description="Lista de chamados de suporte dos escritórios." iconName="Headphones">
        <p className="text-destructive">Erro ao carregar chamados: {error.message}</p>
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

  const statusLabels: Record<string, string> = {
    open: "Aberto",
    in_progress: "Em andamento",
    resolved: "Resolvido",
    closed: "Fechado",
  };
  const aba = searchParams?.aba === "arquivados" ? "arquivados" : "lista";
  const visualizacao = searchParams?.visualizacao === "card" ? "card" : "lista";
  const chamadosAtivos = (tickets ?? []).filter(
    (ticket) => ticket.status !== "resolved" && ticket.status !== "closed"
  );
  const chamadosArquivados = (tickets ?? []).filter(
    (ticket) => ticket.status === "resolved" || ticket.status === "closed"
  );
  const chamadosVisiveis = aba === "arquivados" ? chamadosArquivados : chamadosAtivos;
  const buildHref = (nextAba: "lista" | "arquivados", nextVisualizacao: "lista" | "card") =>
    `/admin/chamados?aba=${nextAba}&visualizacao=${nextVisualizacao}`;
  const getOfficeName = (ticket: (typeof tickets)[number]) =>
    Array.isArray(ticket.offices)
      ? (ticket.offices[0] as { name: string })?.name ?? "—"
      : (ticket.offices as { name: string } | null)?.name ?? "—";

  return (
    <PageLayout title="Chamados de Suporte" description="Lista de chamados de suporte dos escritórios." iconName="Headphones">
      <Card>
        <CardHeader>
          <CardTitle>Lista de Chamados</CardTitle>
          <CardDescription>
            Todos os chamados de suporte registrados na plataforma.
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
                  <TableHead>Título</TableHead>
                  <TableHead>Escritório</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {chamadosVisiveis.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      {aba === "arquivados" ? "Nenhum chamado arquivado." : "Nenhum chamado ativo."}
                    </TableCell>
                  </TableRow>
                ) : (
                  chamadosVisiveis.map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell className="font-medium">{ticket.title}</TableCell>
                      <TableCell>{getOfficeName(ticket)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {statusLabels[ticket.status] ?? ticket.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(ticket.created_at)}
                      </TableCell>
                      <TableCell>
                        <Link href={`/admin/chamados/${ticket.id}`}>
                          <Button variant="ghost" size="sm">Ver</Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          ) : chamadosVisiveis.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              {aba === "arquivados" ? "Nenhum chamado arquivado." : "Nenhum chamado ativo."}
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {chamadosVisiveis.map((ticket) => (
                <Card key={ticket.id} className="border border-border/60">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{ticket.title}</CardTitle>
                    <CardDescription>{getOfficeName(ticket)}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <Badge variant="secondary">
                      {statusLabels[ticket.status] ?? ticket.status}
                    </Badge>
                    <p className="text-muted-foreground">
                      Criado em: <span className="text-foreground">{formatDate(ticket.created_at)}</span>
                    </p>
                    <div className="pt-2">
                      <Link href={`/admin/chamados/${ticket.id}`}>
                        <Button variant="outline" size="sm">Ver</Button>
                      </Link>
                    </div>
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
