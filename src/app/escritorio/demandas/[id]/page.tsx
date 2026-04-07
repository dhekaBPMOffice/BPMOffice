import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ClipboardList } from "lucide-react";
import { PageLayout } from "@/components/layout/page-layout";
import { PlanejamentoPhase } from "./planejamento/planejamento-phase";
import { LevantamentoPhase } from "./levantamento/levantamento-phase";
import { ModelagemPhase } from "./modelagem/modelagem-phase";
import { AnalisePhase } from "./analise/analise-phase";
import { MelhoriasPhase } from "./melhorias/melhorias-phase";
import { ImplantacaoPhase } from "./implantacao/implantacao-phase";
import { EncerramentoPhase } from "./encerramento/encerramento-phase";

export default async function DemandaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireRole(["leader", "user"]);
  const supabase = await createClient();

  if (!profile.office_id) {
    return (
      <PageLayout title="Demanda" iconName="ClipboardList" backHref="/escritorio/demandas">
        <p className="text-destructive">Erro: escritório não encontrado.</p>
      </PageLayout>
    );
  }

  const { data: demand, error } = await supabase
    .from("demands")
    .select(`
      id,
      title,
      description,
      status,
      priority,
      external_ticket_id,
      assigned_to,
      created_at,
      assigned_profile:assigned_to (full_name)
    `)
    .eq("id", id)
    .eq("office_id", profile.office_id)
    .single();

  if (error || !demand) {
    notFound();
  }

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

  const assigned = demand.assigned_profile as unknown;
  const assignedName = assigned && typeof assigned === "object" && "full_name" in assigned
    ? (assigned as { full_name: string }).full_name
    : "—";

  return (
    <PageLayout
      title={demand.title}
      description={demand.description ?? undefined}
      iconName="ClipboardList"
      backHref="/escritorio/demandas"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {getStatusBadge(demand.status)}
          <Badge variant="outline">{getPriorityLabel(demand.priority)}</Badge>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="flex gap-4 text-sm text-muted-foreground">
          {demand.external_ticket_id && (
            <span>Ticket: {demand.external_ticket_id}</span>
          )}
          <span>Responsável: {assignedName}</span>
          <span>
            Criado em:{" "}
            {new Date(demand.created_at).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })}
          </span>
        </div>

        <Tabs defaultValue="planejamento" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="planejamento">Planejamento</TabsTrigger>
          <TabsTrigger value="levantamento">Levantamento</TabsTrigger>
          <TabsTrigger value="modelagem">Modelagem</TabsTrigger>
          <TabsTrigger value="analise">Análise</TabsTrigger>
          <TabsTrigger value="melhorias">Melhorias</TabsTrigger>
          <TabsTrigger value="implantacao">Implantação</TabsTrigger>
          <TabsTrigger value="encerramento">Encerramento</TabsTrigger>
        </TabsList>
        <TabsContent value="planejamento" className="mt-4">
          <PlanejamentoPhase demandId={id} officeId={profile.office_id} />
        </TabsContent>
        <TabsContent value="levantamento" className="mt-4">
          <LevantamentoPhase demandId={id} officeId={profile.office_id} />
        </TabsContent>
        <TabsContent value="modelagem" className="mt-4">
          <ModelagemPhase demandId={id} officeId={profile.office_id} />
        </TabsContent>
        <TabsContent value="analise" className="mt-4">
          <AnalisePhase demandId={id} officeId={profile.office_id} />
        </TabsContent>
        <TabsContent value="melhorias" className="mt-4">
          <MelhoriasPhase demandId={id} officeId={profile.office_id} />
        </TabsContent>
        <TabsContent value="implantacao" className="mt-4">
          <ImplantacaoPhase demandId={id} officeId={profile.office_id} />
        </TabsContent>
        <TabsContent value="encerramento" className="mt-4">
          <EncerramentoPhase demandId={id} officeId={profile.office_id} />
        </TabsContent>
      </Tabs>
      </div>
    </PageLayout>
  );
}
