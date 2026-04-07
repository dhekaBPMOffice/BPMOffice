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
import { Building2, LayoutGrid, List } from "lucide-react";
import { NovoEscritorioButton } from "./novo-escritorio-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ORDEM_VALUES = [
  "criado_desc",
  "criado_asc",
  "nome_asc",
  "nome_desc",
  "slug_asc",
  "slug_desc",
  "plano_asc",
  "plano_desc",
] as const;
type OrdemEscritorio = (typeof ORDEM_VALUES)[number];

type SearchParamValue = string | string[] | undefined;

/** Next pode entregar o mesmo parâmetro como string ou array; normaliza para uma string. */
function searchParamFirst(value: SearchParamValue): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value.length > 0) {
    const v = value[0];
    if (typeof v === "string") return v;
  }
  return "";
}

function safeStr(v: unknown): string {
  return String(v ?? "");
}

function safeLower(v: unknown): string {
  return safeStr(v).toLowerCase();
}

interface EscritoriosPageProps {
  searchParams?: Promise<Record<string, SearchParamValue>>;
}

export default async function EscritoriosPage({ searchParams: searchParamsPromise }: EscritoriosPageProps) {
  const searchParams = (await (searchParamsPromise ?? Promise.resolve({}))) as Record<
    string,
    SearchParamValue
  >;
  const novoErroRaw = searchParamFirst(searchParams.novo_erro);
  let novoErro: string | null = null;
  if (novoErroRaw) {
    try {
      novoErro = decodeURIComponent(novoErroRaw);
    } catch {
      novoErro = novoErroRaw;
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
      <PageLayout title="Escritórios" description="Gerencie os escritórios da plataforma BPM Office." iconName="Building2">
        <p className="text-destructive">Erro ao carregar escritórios: {error.message}</p>
      </PageLayout>
    );
  }

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "—";
    const t = new Date(dateStr).getTime();
    if (!Number.isFinite(t)) return "—";
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const rawAba = searchParamFirst(searchParams.aba);
  const aba =
    rawAba === "inativos" || rawAba === "arquivados" ? "inativos" : "lista";
  const visualizacao = searchParamFirst(searchParams.visualizacao) === "card" ? "card" : "lista";
  const qBusca = searchParamFirst(searchParams.q);
  const ordemRaw = searchParamFirst(searchParams.ordem);
  const ordem: OrdemEscritorio = ORDEM_VALUES.includes(ordemRaw as OrdemEscritorio)
    ? (ordemRaw as OrdemEscritorio)
    : "criado_desc";

  const escritoriosAtivos = (offices ?? []).filter((office) => office.is_active);
  const escritoriosInativos = (offices ?? []).filter((office) => !office.is_active);
  const escritoriosVisiveis = aba === "inativos" ? escritoriosInativos : escritoriosAtivos;

  const getPlanName = (office: (typeof offices)[number]) => {
    const p = office.plans as unknown;
    if (Array.isArray(p)) return (p[0] as { name: string })?.name ?? "—";
    return (p as { name: string } | null)?.name ?? "—";
  };

  const buscaNormalizada = qBusca.trim().toLowerCase();
  const porBusca =
    buscaNormalizada.length === 0
      ? escritoriosVisiveis
      : escritoriosVisiveis.filter((office) => {
          const plano = getPlanName(office).toLowerCase();
          return (
            safeLower(office.name).includes(buscaNormalizada) ||
            safeLower(office.slug).includes(buscaNormalizada) ||
            plano.includes(buscaNormalizada)
          );
        });

  const ordenar = (lista: typeof escritoriosVisiveis) => {
    const copy = [...lista];
    const planLabel = (o: (typeof offices)[number]) => getPlanName(o).toLowerCase();
    const createdMs = (o: (typeof offices)[number]) => {
      const t = o.created_at ? new Date(o.created_at).getTime() : 0;
      return Number.isFinite(t) ? t : 0;
    };
    switch (ordem) {
      case "nome_asc":
        return copy.sort((a, b) => safeStr(a.name).localeCompare(safeStr(b.name), "pt-BR"));
      case "nome_desc":
        return copy.sort((a, b) => safeStr(b.name).localeCompare(safeStr(a.name), "pt-BR"));
      case "slug_asc":
        return copy.sort((a, b) => safeStr(a.slug).localeCompare(safeStr(b.slug)));
      case "slug_desc":
        return copy.sort((a, b) => safeStr(b.slug).localeCompare(safeStr(a.slug)));
      case "plano_asc":
        return copy.sort((a, b) => planLabel(a).localeCompare(planLabel(b), "pt-BR"));
      case "plano_desc":
        return copy.sort((a, b) => planLabel(b).localeCompare(planLabel(a), "pt-BR"));
      case "criado_asc":
        return copy.sort((a, b) => createdMs(a) - createdMs(b));
      case "criado_desc":
      default:
        return copy.sort((a, b) => createdMs(b) - createdMs(a));
    }
  };

  const escritoriosExibidos = ordenar(porBusca);

  const buildListQuery = (nextAba: "lista" | "inativos", nextVisualizacao: "lista" | "card") => {
    const sp = new URLSearchParams();
    sp.set("aba", nextAba);
    sp.set("visualizacao", nextVisualizacao);
    if (qBusca.trim()) sp.set("q", qBusca.trim());
    if (ordem !== "criado_desc") sp.set("ordem", ordem);
    const qs = sp.toString();
    return qs ? `?${qs}` : "";
  };

  const buildHref = (nextAba: "lista" | "inativos", nextVisualizacao: "lista" | "card") =>
    `/admin/escritorios${buildListQuery(nextAba, nextVisualizacao)}`;

  return (
    <PageLayout
      title="Escritórios"
      description="Gerencie os escritórios da plataforma BPM Office."
      iconName="Building2"
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

          <form action="/admin/escritorios" method="get" className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <input type="hidden" name="aba" value={aba} />
            <input type="hidden" name="visualizacao" value={visualizacao} />
            <div className="flex w-full min-w-[200px] flex-1 flex-col gap-2">
              <Label htmlFor="q-escritorios">Buscar</Label>
              <Input
                id="q-escritorios"
                name="q"
                type="search"
                placeholder="Nome, slug ou plano..."
                defaultValue={qBusca}
                autoComplete="off"
              />
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-[min(100%,280px)]">
              <Label htmlFor="ordem-escritorios">Ordenar por</Label>
              <Select id="ordem-escritorios" name="ordem" defaultValue={ordem}>
                <option value="criado_desc">Criação (mais recente)</option>
                <option value="criado_asc">Criação (mais antigo)</option>
                <option value="nome_asc">Nome (A–Z)</option>
                <option value="nome_desc">Nome (Z–A)</option>
                <option value="slug_asc">Slug (A–Z)</option>
                <option value="slug_desc">Slug (Z–A)</option>
                <option value="plano_asc">Plano (A–Z)</option>
                <option value="plano_desc">Plano (Z–A)</option>
              </Select>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit">Aplicar</Button>
              {qBusca.trim() !== "" || ordem !== "criado_desc" ? (
                <Link
                  href={`/admin/escritorios?aba=${aba}&visualizacao=${visualizacao}`}
                  className={cn(buttonVariants({ variant: "outline" }))}
                >
                  Limpar filtros
                </Link>
              ) : null}
            </div>
          </form>

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
                ) : escritoriosExibidos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Nenhum escritório encontrado para a busca.
                    </TableCell>
                  </TableRow>
                ) : (
                  escritoriosExibidos.map((office) => (
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
          ) : escritoriosExibidos.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              Nenhum escritório encontrado para a busca.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {escritoriosExibidos.map((office) => (
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
