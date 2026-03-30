import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageLayout } from "@/components/layout/page-layout";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import {
  BPM_PHASE_LABELS,
  BPM_PHASE_SLUGS,
  type BpmPhaseSlug,
  computeCurrentBpmPhaseSlug,
} from "@/lib/bpm-phases";
export default async function ProcessosVisaoGeralPage() {
  const profile = await requireRole(["leader"]);
  const supabase = await createClient();

  if (!profile.office_id) {
    return (
      <PageLayout title="Visão geral" icon={BarChart3}>
        <p className="text-destructive">Escritório não encontrado.</p>
      </PageLayout>
    );
  }

  const { data: rows } = await supabase
    .from("office_processes")
    .select(`
      id,
      name,
      creation_source,
      office_process_bpm_phases (phase, stage_status)
    `)
    .eq("office_id", profile.office_id);

  const list = rows ?? [];
  const total = list.length;

  const byOrigin = {
    catalogo: list.filter((p) => p.creation_source === "from_catalog").length,
    cadeia: list.filter((p) => p.creation_source === "created_in_value_chain").length,
  };

  const byPhase: Record<BpmPhaseSlug, number> = {
    levantamento: 0,
    modelagem: 0,
    validacao: 0,
    descritivo: 0,
    proposicao_melhorias: 0,
    implantacao: 0,
    acompanhamento: 0,
  };

  for (const p of list) {
    const phases = (p as { office_process_bpm_phases: { phase: string; stage_status: string }[] })
      .office_process_bpm_phases;
    const current = computeCurrentBpmPhaseSlug(phases ?? []);
    if (current && current in byPhase) {
      byPhase[current as BpmPhaseSlug] += 1;
    }
  }

  const maxPhaseCount = Math.max(1, ...Object.values(byPhase));

  return (
    <PageLayout
      title="Visão geral dos processos"
      description="Indicadores do portfólio do escritório e atalhos para listas filtradas."
      icon={BarChart3}
      backHref="/escritorio/processos"
      backLabel="Voltar para processos"
    >
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Total de processos</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end justify-between gap-2">
            <p className="text-3xl font-semibold">{total}</p>
            <Link href="/escritorio/processos" className={buttonVariants({ variant: "outline", size: "sm" })}>
              Ver lista
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">A partir do catálogo</CardTitle>
            <CardDescription>Processos base selecionados para o escritório.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end justify-between gap-2">
            <p className="text-3xl font-semibold">{byOrigin.catalogo}</p>
            <Link
              href="/escritorio/processos?origem=catalogo"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Filtrar lista
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Criados na cadeia</CardTitle>
            <CardDescription>Somente na cadeia de valor (sem processo base).</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end justify-between gap-2">
            <p className="text-3xl font-semibold">{byOrigin.cadeia}</p>
            <Link
              href="/escritorio/processos?origem=cadeia_somente"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Filtrar lista
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Processos por fase BPM atual</CardTitle>
          <CardDescription>
            Contagem com base na primeira etapa ainda não concluída (mesma regra da ficha do processo).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {BPM_PHASE_SLUGS.map((slug) => {
            const count = byPhase[slug];
            const widthPct = Math.round((count / maxPhaseCount) * 100);
            return (
              <div key={slug} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>{BPM_PHASE_LABELS[slug]}</span>
                  <Link
                    href={`/escritorio/processos?fase=${slug}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {count}
                  </Link>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary/80 transition-all"
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </PageLayout>
  );
}
