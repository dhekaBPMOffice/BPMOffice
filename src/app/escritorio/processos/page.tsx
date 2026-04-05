import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { OFFICE_PROCESS_STATUS_META } from "@/lib/processes";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageLayout } from "@/components/layout/page-layout";
import { ClipboardList, LayoutGrid, PlusCircle } from "lucide-react";
import type { OfficeProcessStatus } from "@/types/database";
import { formatCurrentBpmPhaseLabel, type BpmPhaseSlug } from "@/lib/bpm-phases";
import {
  applyProcessosFilters,
  buildProcessosHref,
  formatVcProcessTypeLabel,
  parseProcessosListQuery,
  sortOfficeProcesses,
  type OfficeProcessRowForList,
} from "@/lib/office-processes-list";
import { ProcessosFiltersClient } from "./processos-filters-client";
import { ProcessosPortfolioClient, type ProcessoPortfolioItem } from "./processos-portfolio-client";

function toPortfolioItem(
  process: OfficeProcessRowForList & {
    owner_profile?: { full_name?: string } | null;
  }
): ProcessoPortfolioItem {
  const statusMeta = OFFICE_PROCESS_STATUS_META[process.status as OfficeProcessStatus];
  const owner = process.owner_profile as { full_name?: string } | null;
  const phases = process.office_process_bpm_phases ?? [];
  const faseBpmLabel = formatCurrentBpmPhaseLabel(phases);
  const nivelParts = [process.vc_level1, process.vc_level2, process.vc_level3]
    .map((x) => x?.trim())
    .filter(Boolean) as string[];
  const nivelLabel = nivelParts.length ? nivelParts.join(" › ") : null;
  const tipoLabel = formatVcProcessTypeLabel(process.vc_process_type, process.vc_tipo_label);
  const origemLabel =
    process.creation_source === "created_in_value_chain" ? "Criado na cadeia" : "Catálogo";
  const originDetailLabel =
    process.origin === "questionnaire"
      ? "Automática"
      : process.origin === "value_chain"
        ? "Cadeia de valor"
        : "Manual";

  const flowcharts =
    Array.isArray(process.flowchart_files) && process.flowchart_files.length > 0
      ? process.flowchart_files
      : process.flowchart_image_url
        ? [{ url: process.flowchart_image_url }]
        : [];
  const templates =
    Array.isArray(process.template_files) && process.template_files.length > 0
      ? process.template_files
      : process.template_url
        ? [{ url: process.template_url, label: process.template_label }]
        : [];

  return {
    id: process.id,
    name: process.name,
    category: process.category,
    description: process.description,
    statusLabel: statusMeta.label,
    statusVariant: statusMeta.variant,
    origemLabel,
    originDetailLabel,
    faseBpmLabel,
    tipoLabel,
    nivelLabel,
    ownerName: owner?.full_name ?? null,
    flowcharts: flowcharts as { url: string }[],
    templates: templates as { url: string; label?: string | null }[],
  };
}

export default async function ProcessosEscritorioPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireRole(["leader"]);
  const supabase = await createClient();
  const sp = await searchParams;
  const query = parseProcessosListQuery(sp);

  if (!profile.office_id) {
    return (
      <PageLayout title="Meus Processos" icon={ClipboardList}>
        <p className="text-destructive">Escritório não encontrado.</p>
      </PageLayout>
    );
  }

  const { data: rawProcesses } = await supabase
    .from("office_processes")
    .select(`
      *,
      owner_profile:owner_profile_id (
        id,
        full_name
      ),
      office_process_bpm_phases (phase, stage_status)
    `)
    .eq("office_id", profile.office_id)
    .order("selected_at", { ascending: false });

  let afterOrigem = (rawProcesses ?? []) as OfficeProcessRowForList[];

  if (query.origem === "catalogo") {
    afterOrigem = afterOrigem.filter((p) => p.creation_source === "from_catalog");
  } else if (query.origem === "cadeia_somente") {
    afterOrigem = afterOrigem.filter((p) => p.creation_source === "created_in_value_chain");
  } else if (query.origem === "cadeia") {
    afterOrigem = afterOrigem.filter(
      (p) =>
        p.value_chain_id != null ||
        (p.vc_macroprocesso != null && String(p.vc_macroprocesso).trim() !== "")
    );
  }

  const levelTuples = afterOrigem.map(
    (p) => [p.vc_level1, p.vc_level2, p.vc_level3] as [string | null, string | null, string | null]
  );

  const faseFilter = (query.fase || "") as BpmPhaseSlug | "";
  const statusFilter = (query.status || "") as OfficeProcessStatus | "";

  let processes = applyProcessosFilters(afterOrigem, {
    faseFilter,
    tipo: query.tipo,
    n1: query.n1,
    n2: query.n2,
    n3: query.n3,
    status: statusFilter,
    q: query.q,
  });

  processes = sortOfficeProcesses(processes, query.ordenar);

  const total = processes.length;
  const completed = processes.filter((item) => item.status === "completed").length;
  const inProgress = processes.filter((item) => item.status === "in_progress").length;

  const portfolioItems = processes.map((p) => toPortfolioItem(p));

  return (
    <PageLayout
      title="Meus Processos"
      description="Lista oficial de processos do escritório, gerada pelo onboarding e complementada manualmente quando necessário."
      icon={ClipboardList}
      actions={
        <div className="flex flex-wrap gap-2">
          <Link
            href="/escritorio/processos/visao-geral"
            className={buttonVariants({ variant: "outline" })}
          >
            <LayoutGrid className="h-4 w-4" />
            Visão geral
          </Link>
          <Link href="/escritorio/processos/catalogo" className={buttonVariants()}>
            <PlusCircle className="h-4 w-4" />
            Catálogo e adicionar processo
          </Link>
        </div>
      }
    >
      <ProcessosFiltersClient query={query} levelTuples={levelTuples} />

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Processos ativos (filtro)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Em andamento</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{inProgress}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Concluídos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{completed}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Portfólio do escritório</CardTitle>
          <CardDescription>
            Cada processo possui uma área própria de gestão com checklist, anexos e histórico.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {portfolioItems.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="Nenhum processo neste filtro"
              description="Ajuste os filtros acima ou selecione processos no catálogo."
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <Link href={buildProcessosHref({ origem: query.origem, vista: query.vista })} className={buttonVariants()}>
                    Limpar filtros
                  </Link>
                  <Link href="/escritorio/processos/catalogo" className={buttonVariants({ variant: "outline" })}>
                    <PlusCircle className="h-4 w-4" />
                    Catálogo
                  </Link>
                </div>
              }
            />
          ) : (
            <ProcessosPortfolioClient items={portfolioItems} query={query} />
          )}
        </CardContent>
      </Card>
    </PageLayout>
  );
}
