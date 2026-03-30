import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
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
import { Building2, LayoutGrid, List, Plus } from "lucide-react";
import { NovoEscritorioButton } from "./novo-escritorio-button";

interface EscritoriosPageProps {
  searchParams?: Promise<{ aba?: string; visualizacao?: string; novo_erro?: string }>;
}

export default async function EscritoriosPage({ searchParams: searchParamsPromise }: EscritoriosPageProps) {
  const searchParams: { aba?: string; visualizacao?: string; novo_erro?: string } =
    await (searchParamsPromise ?? Promise.resolve({}));
  let novoErro: string | null = null;
  if (searchParams?.novo_erro) {
    try {
      novoErro = decodeURIComponent(searchParams.novo_erro);
    } catch {
      novoErro = searchParams.novo_erro;
    }
  }
  const supabase = await createClient();

  const { data: offices, error } = await supabase
    .from("offices")
    .select(`
      id,
      name,
      slug,
      is_active,
      created_at,
      plans (
        id,
        name
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <PageLayout title="Escritórios" description="Gerencie os escritórios da plataforma BPM Office." icon={Building2}>
        <p className="text-destructive">Erro ao carregar escritórios: {error.message}</p>
      </PageLayout>
    );
  }

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  const rawAba = searchParams?.aba;
  const aba =
    rawAba === "inativos" || rawAba === "arquivados" ? "inativos" : "lista";
  const visualizacao = searchParams?.visualizacao === "card" ? "card" : "lista";
  const escritoriosAtivos = (offices ?? []).filter((office) => office.is_active);
  const escritoriosInativos = (offices ?? []).filter((office) => !office.is_active);
  const escritoriosVisiveis = aba === "inativos" ? escritoriosInativos : escritoriosAtivos;
  const buildHref = (nextAba: "lista" | "inativos", nextVisualizacao: "lista" | "card") =>
    `/admin/escritorios?aba=${nextAba}&visualizacao=${nextVisualizacao}`;
  const getPlanName = (office: (typeof offices)[number]) => {
    const p = office.plans as unknown;
    if (Array.isArray(p)) return (p[0] as { name: string })?.name ?? "—";
    return (p as { name: string } | null)?.name ?? "—";
  };

  return (
    <PageLayout
      title="Escritórios"
      description="Gerencie os escritórios da plataforma BPM Office."
      icon={Building2}
      actions={<NovoEscritorioButton />}
    >
      {novoErro && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {novoErro}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Lista de Escritórios</CardTitle>
          <CardDescription>
            Todos os escritórios cadastrados com seus respectivos planos.
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
                href={buildHref("inativos", visualizacao)}
                className={`rounded-sm px-3 py-1.5 text-sm font-medium transition-colors ${
                  aba === "inativos" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Inativos
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
                  <TableHead>Slug</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {escritoriosVisiveis.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      {aba === "inativos" ? "Nenhum escritório inativo." : "Nenhum escritório ativo."}
                    </TableCell>
                  </TableRow>
                ) : (
                  escritoriosVisiveis.map((office) => (
                    <TableRow key={office.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/admin/escritorios/${office.id}`}
                          className="hover:underline text-[var(--identity-primary)]"
                        >
                          {office.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-sm">
                        {office.slug}
                      </TableCell>
                      <TableCell>{getPlanName(office)}</TableCell>
                      <TableCell>
                        <Badge variant={office.is_active ? "success" : "secondary"}>
                          {office.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(office.created_at)}
                      </TableCell>
                      <TableCell>
                        <Link href={`/admin/escritorios/${office.id}`} className="text-sm text-[var(--identity-primary)] hover:underline">
                          Ver
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          ) : escritoriosVisiveis.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              {aba === "inativos" ? "Nenhum escritório inativo." : "Nenhum escritório ativo."}
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {escritoriosVisiveis.map((office) => (
                <Card key={office.id} className="border border-border/60">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <CardTitle className="text-base">{office.name}</CardTitle>
                      <Badge variant={office.is_active ? "success" : "secondary"}>
                        {office.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                    <CardDescription className="font-mono text-xs">
                      {office.slug}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p className="text-muted-foreground">
                      Plano: <span className="text-foreground">{getPlanName(office)}</span>
                    </p>
                    <p className="text-muted-foreground">
                      Criado em: <span className="text-foreground">{formatDate(office.created_at)}</span>
                    </p>
                    <div className="pt-2">
                      <Link href={`/admin/escritorios/${office.id}`} className="text-sm text-[var(--identity-primary)] hover:underline">
                        Ver escritório
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
