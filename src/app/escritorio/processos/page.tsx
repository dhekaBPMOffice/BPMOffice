import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { OFFICE_PROCESS_STATUS_META } from "@/lib/processes";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageLayout } from "@/components/layout/page-layout";
import { ClipboardList, LayoutGrid, PlusCircle } from "lucide-react";
import type { OfficeProcessStatus } from "@/types/database";
import { computeCurrentBpmPhaseSlug, formatCurrentBpmPhaseLabel, type BpmPhaseSlug } from "@/lib/bpm-phases";
import { cn } from "@/lib/utils";

const ORIGEM_OPTIONS = [
  { value: "todos", label: "Todos", href: "/escritorio/processos" },
  { value: "catalogo", label: "Catálogo", href: "/escritorio/processos?origem=catalogo" },
  { value: "cadeia", label: "Na cadeia", href: "/escritorio/processos?origem=cadeia" },
  { value: "cadeia_somente", label: "Só cadeia (sem base)", href: "/escritorio/processos?origem=cadeia_somente" },
] as const;

export default async function ProcessosEscritorioPage({
  searchParams,
}: {
  searchParams: Promise<{ origem?: string; fase?: string }>;
}) {
  const profile = await requireRole(["leader"]);
  const supabase = await createClient();
  const sp = await searchParams;
  const origem = sp.origem ?? "todos";
  const faseFilter = (sp.fase ?? "") as BpmPhaseSlug | "";

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

  let processes = rawProcesses ?? [];

  if (origem === "catalogo") {
    processes = processes.filter((p) => p.creation_source === "from_catalog");
  } else if (origem === "cadeia_somente") {
    processes = processes.filter((p) => p.creation_source === "created_in_value_chain");
  } else if (origem === "cadeia") {
    processes = processes.filter(
      (p) => p.value_chain_id != null || (p.vc_macroprocesso != null && String(p.vc_macroprocesso).trim() !== "")
    );
  }

  if (faseFilter) {
    processes = processes.filter((p) => {
      const phases = (p as { office_process_bpm_phases: { phase: string; stage_status: string }[] })
        .office_process_bpm_phases;
      const current = computeCurrentBpmPhaseSlug(phases ?? []);
      return current === faseFilter;
    });
  }

  const total = processes.length;
  const completed = processes.filter((item) => item.status === "completed").length;
  const inProgress = processes.filter((item) => item.status === "in_progress").length;

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
            Ver processos não selecionados
          </Link>
          <Link href="/escritorio/processos/catalogo" className={buttonVariants()}>
            <PlusCircle className="h-4 w-4" />
            Adicionar processo
          </Link>
        </div>
      }
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {ORIGEM_OPTIONS.map((opt) => {
          const active =
            (opt.value === "todos" && origem === "todos") ||
            (opt.value !== "todos" && origem === opt.value);
          return (
            <Link
              key={opt.value}
              href={opt.href}
              className={cn(
                buttonVariants({ variant: active ? "default" : "outline", size: "sm" })
              )}
            >
              {opt.label}
            </Link>
          );
        })}
        {faseFilter ? (
          <Link href="/escritorio/processos" className={buttonVariants({ variant: "secondary", size: "sm" })}>
            Limpar filtro de fase
          </Link>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
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
          {processes.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="Nenhum processo neste filtro"
              description="Ajuste os filtros acima ou selecione processos no catálogo."
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <Link href="/escritorio/processos" className={buttonVariants()}>
                    Ver todos
                  </Link>
                  <Link href="/escritorio/processos/catalogo" className={buttonVariants({ variant: "outline" })}>
                    <PlusCircle className="h-4 w-4" />
                    Catálogo
                  </Link>
                </div>
              }
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {processes.map((process) => {
                const statusMeta =
                  OFFICE_PROCESS_STATUS_META[process.status as OfficeProcessStatus];
                const owner = process.owner_profile as { full_name?: string } | null;
                const phases = (process as { office_process_bpm_phases: { phase: string; stage_status: string }[] })
                  .office_process_bpm_phases;
                const faseAtual = formatCurrentBpmPhaseLabel(phases ?? []);
                const origemLabel =
                  process.creation_source === "created_in_value_chain"
                    ? "Criado na cadeia"
                    : "Catálogo";

                return (
                  <Card key={process.id} className="border border-border/60">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <CardTitle className="text-base">{process.name}</CardTitle>
                          <CardDescription>{process.category || "Sem categoria"}</CardDescription>
                        </div>
                        <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline">{origemLabel}</Badge>
                        <span>Fase BPM: {faseAtual}</span>
                      </div>
                      {(() => {
                        const flowcharts =
                          Array.isArray(process.flowchart_files) && process.flowchart_files.length > 0
                            ? process.flowchart_files
                            : process.flowchart_image_url
                              ? [{ url: process.flowchart_image_url }]
                              : [];
                        return flowcharts.length > 0 ? (
                          <div className="space-y-2">
                            {flowcharts.slice(0, 2).map((ff: { url: string }, i: number) =>
                              /\.(png|jpe?g|gif|webp)$/i.test(ff.url) ? (
                                <img
                                  key={i}
                                  src={ff.url}
                                  alt={`Fluxograma ${i + 1}`}
                                  className="h-40 w-full rounded-lg border object-contain"
                                />
                              ) : (
                                <a
                                  key={i}
                                  href={ff.url}
                                  download
                                  className={buttonVariants({ variant: "outline", size: "sm" })}
                                >
                                  Baixar fluxograma {flowcharts.length > 1 ? i + 1 : ""}
                                </a>
                              )
                            )}
                          </div>
                        ) : null;
                      })()}
                      <p className="line-clamp-3 text-sm text-muted-foreground">
                        {process.description || "Sem descrição cadastrada."}
                      </p>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p>
                          Origem:{" "}
                          {process.origin === "questionnaire"
                            ? "Automática"
                            : process.origin === "value_chain"
                              ? "Cadeia de valor"
                              : "Manual"}
                        </p>
                        <p>Responsável: {owner?.full_name || "Não definido"}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/escritorio/processos/${process.id}`}
                          className={buttonVariants({ size: "sm" })}
                        >
                          Gerir processo
                        </Link>
                        {(() => {
                          const templates =
                            Array.isArray(process.template_files) && process.template_files.length > 0
                              ? process.template_files
                              : process.template_url
                                ? [{ url: process.template_url, label: process.template_label }]
                                : [];
                          return templates.map((tf: { url: string; label?: string }, i: number) => (
                            <a
                              key={i}
                              href={tf.url}
                              target="_blank"
                              rel="noreferrer"
                              download
                              className={buttonVariants({ variant: "outline", size: "sm" })}
                            >
                              {tf.label || `Baixar template ${templates.length > 1 ? i + 1 : ""}`}
                            </a>
                          ));
                        })()}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </PageLayout>
  );
}
