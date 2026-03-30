import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageLayout } from "@/components/layout/page-layout";
import { ClipboardList } from "lucide-react";
import { AddProcessButton } from "./add-process-button";

export default async function CatalogoComplementarProcessosPage() {
  const profile = await requireRole(["leader"]);
  const supabase = await createClient();

  if (!profile.office_id) {
    return (
      <PageLayout title="Processos não selecionados" icon={ClipboardList}>
        <p className="text-destructive">Escritório não encontrado.</p>
      </PageLayout>
    );
  }

  const [{ data: baseProcesses }, { data: officeProcesses }] = await Promise.all([
    supabase
      .from("base_processes")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("office_processes")
      .select("base_process_id")
      .eq("office_id", profile.office_id),
  ]);

  const selectedProcessIds = new Set(
    (officeProcesses ?? [])
      .map((item) => item.base_process_id)
      .filter((id): id is string => id != null)
  );
  const availableProcesses = (baseProcesses ?? []).filter(
    (process) => !selectedProcessIds.has(process.id)
  );

  return (
    <PageLayout
      title="Processos não selecionados"
      description="Avalie os processos da estrutura padrão que ainda não fazem parte da lista do escritório."
      icon={ClipboardList}
      backHref="/escritorio/processos"
      backLabel="Voltar para Meus Processos"
      actions={
        <Link
          href="/escritorio/processos"
          className={buttonVariants({ variant: "outline" })}
        >
          Voltar para lista
        </Link>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Catálogo complementar</CardTitle>
          <CardDescription>
            Se algum processo for relevante para o momento do escritório, adicione-o manualmente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {availableProcesses.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="Todos os processos já foram selecionados"
              description="O escritório já possui todos os processos ativos do catálogo padrão."
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {availableProcesses.map((process) => (
                <Card key={process.id} className="border border-border/60">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{process.name}</CardTitle>
                    <CardDescription>{process.category || "Sem categoria"}</CardDescription>
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
                    <div className="flex flex-wrap gap-2">
                      <AddProcessButton baseProcessId={process.id} />
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
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </PageLayout>
  );
}
