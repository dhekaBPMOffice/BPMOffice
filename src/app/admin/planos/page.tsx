import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
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
import { CreditCard, LayoutGrid, List, Plus } from "lucide-react";

interface PlanosPageProps {
  searchParams?: {
    aba?: string;
    visualizacao?: string;
  };
}

export default async function PlanosPage({ searchParams }: PlanosPageProps) {
  const supabase = await createServiceClient();

  const { data: plans, error } = await supabase
    .from("plans")
    .select("id, name, description, max_users, max_processes, price_monthly, is_active")
    .order("price_monthly", { ascending: true });

  if (error) {
    return (
      <PageLayout title="Planos" description="Gerencie os planos comerciais da plataforma." icon={CreditCard}>
        <p className="text-destructive">Erro ao carregar planos: {error.message}</p>
      </PageLayout>
    );
  }

  const formatPrice = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);

  const aba = searchParams?.aba === "arquivados" ? "arquivados" : "lista";
  const visualizacao = searchParams?.visualizacao === "card" ? "card" : "lista";
  const planosAtivos = (plans ?? []).filter((plan) => plan.is_active);
  const planosArquivados = (plans ?? []).filter((plan) => !plan.is_active);
  const planosVisiveis = aba === "arquivados" ? planosArquivados : planosAtivos;
  const buildHref = (nextAba: "lista" | "arquivados", nextVisualizacao: "lista" | "card") =>
    `/admin/planos?aba=${nextAba}&visualizacao=${nextVisualizacao}`;

  return (
    <PageLayout
      title="Planos"
      description="Gerencie os planos comerciais da plataforma."
      icon={CreditCard}
      actions={
        <Link href="/admin/planos/novo">
          <Button>
            <Plus className="h-4 w-4" />
            Novo Plano
          </Button>
        </Link>
      }
    >

      <Card>
        <CardHeader>
          <CardTitle>Lista de Planos</CardTitle>
          <CardDescription>
            Todos os planos cadastrados com limites e preços.
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
                  <TableHead>Descrição</TableHead>
                  <TableHead>Usuários</TableHead>
                  <TableHead>Processos</TableHead>
                  <TableHead>Preço/mês</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {planosVisiveis.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      {aba === "arquivados" ? "Nenhum plano arquivado." : "Nenhum plano ativo."}
                    </TableCell>
                  </TableRow>
                ) : (
                  planosVisiveis.map((plan) => (
                    <TableRow key={plan.id}>
                      <TableCell className="font-medium">{plan.name}</TableCell>
                      <TableCell className="text-muted-foreground max-w-[200px] truncate">
                        {plan.description || "—"}
                      </TableCell>
                      <TableCell>{plan.max_users}</TableCell>
                      <TableCell>{plan.max_processes}</TableCell>
                      <TableCell>{formatPrice(plan.price_monthly)}</TableCell>
                      <TableCell>
                        <Badge variant={plan.is_active ? "success" : "secondary"}>
                          {plan.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Link href={`/admin/planos/${plan.id}`}>
                          <Button variant="ghost" size="sm">Editar</Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          ) : planosVisiveis.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              {aba === "arquivados" ? "Nenhum plano arquivado." : "Nenhum plano ativo."}
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {planosVisiveis.map((plan) => (
                <Card key={plan.id} className="border border-border/60">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <CardTitle className="text-base">{plan.name}</CardTitle>
                      <Badge variant={plan.is_active ? "success" : "secondary"}>
                        {plan.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                    <CardDescription className="line-clamp-2">
                      {plan.description || "Sem descrição"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p className="text-muted-foreground">
                      Usuários: <span className="text-foreground">{plan.max_users}</span>
                    </p>
                    <p className="text-muted-foreground">
                      Processos: <span className="text-foreground">{plan.max_processes}</span>
                    </p>
                    <p className="text-muted-foreground">
                      Preço/mês: <span className="text-foreground">{formatPrice(plan.price_monthly)}</span>
                    </p>
                    <div className="pt-2">
                      <Link href={`/admin/planos/${plan.id}`}>
                        <Button variant="outline" size="sm">Editar</Button>
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
