import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { OFFICE_PROCESS_STATUS_META } from "@/lib/processes";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageLayout } from "@/components/layout/page-layout";
import { ClipboardList, Plus } from "lucide-react";
import type { OfficeProcessStatus } from "@/types/database";

export default async function ProcessosEscritorioPage() {
  const profile = await requireRole(["leader"]);
  const supabase = await createClient();

  if (!profile.office_id) {
    return (
      <PageLayout title="Meus Processos" icon={ClipboardList}>
        <p className="text-destructive">Escritório não encontrado.</p>
      </PageLayout>
    );
  }

  const { data: processes } = await supabase
    .from("office_processes")
    .select(`
      *,
      owner_profile:owner_profile_id (
        id,
        full_name
      )
    `)
    .eq("office_id", profile.office_id)
    .order("selected_at", { ascending: false });

  const total = processes?.length ?? 0;
  const completed = (processes ?? []).filter((item) => item.status === "completed").length;
  const inProgress = (processes ?? []).filter((item) => item.status === "in_progress").length;

  return (
    <PageLayout
      title="Meus Processos"
      description="Lista oficial de processos do escritório, gerada pelo onboarding e complementada manualmente quando necessário."
      icon={ClipboardList}
      actions={
        <Link href="/escritorio/processos/catalogo" className={buttonVariants()}>
          <Plus className="h-4 w-4" />
          Ver processos não selecionados
        </Link>
      }
    >
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Processos ativos</CardTitle>
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

      <Card>
        <CardHeader>
          <CardTitle>Portfólio do escritório</CardTitle>
          <CardDescription>
            Cada processo possui uma área própria de gestão com checklist, anexos e histórico.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!processes || processes.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="Nenhum processo disponível"
              description="Conclua o onboarding ou selecione processos manualmente no catálogo complementar."
              action={
                <Link href="/escritorio/onboarding/processos" className={buttonVariants()}>
                  Ir para onboarding
                </Link>
              }
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {processes.map((process) => {
                const statusMeta =
                  OFFICE_PROCESS_STATUS_META[process.status as OfficeProcessStatus];
                const owner = process.owner_profile as { full_name?: string } | null;

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
                      {(() => {
                        const flowcharts = Array.isArray(process.flowchart_files) && process.flowchart_files.length > 0
                          ? process.flowchart_files
                          : process.flowchart_image_url ? [{ url: process.flowchart_image_url }] : [];
                        return flowcharts.length > 0 ? (
                          <div className="space-y-2">
                            {flowcharts.slice(0, 2).map((ff: { url: string }, i: number) =>
                              /\.(png|jpe?g|gif|webp)$/i.test(ff.url) ? (
                                <img key={i} src={ff.url} alt={`Fluxograma ${i + 1}`} className="h-40 w-full rounded-lg border object-contain" />
                              ) : (
                                <a key={i} href={ff.url} download className={buttonVariants({ variant: "outline", size: "sm" })}>
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
                        <p>Origem: {process.origin === "questionnaire" ? "Automática" : "Manual"}</p>
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
                          const templates = Array.isArray(process.template_files) && process.template_files.length > 0
                            ? process.template_files
                            : process.template_url ? [{ url: process.template_url, label: process.template_label }] : [];
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
