"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { History, Eye, Calendar, Target, TrendingUp, TrendingDown, Lightbulb, ShieldAlert, ClipboardList } from "lucide-react";
import { PageLayout } from "@/components/layout/page-layout";
import {
  getStrategicPlan,
  getSnapshots,
  getSnapshot,
  type StrategicPlan,
  type PlanSnapshot,
  type SwotItem,
  type StrategicObjective,
  type TacticalPlan,
  type SwotType,
} from "../../actions";

const SWOT_LABELS: Record<SwotType, string> = {
  strength: "Forças",
  weakness: "Fraquezas",
  opportunity: "Oportunidades",
  threat: "Ameaças",
};

const SWOT_ICONS: Record<SwotType, typeof TrendingUp> = {
  strength: TrendingUp,
  weakness: TrendingDown,
  opportunity: Lightbulb,
  threat: ShieldAlert,
};

const SWOT_COLORS: Record<SwotType, string> = {
  strength: "text-emerald-600",
  weakness: "text-red-600",
  opportunity: "text-blue-600",
  threat: "text-amber-600",
};

interface SnapshotData {
  plan: StrategicPlan;
  swotItems: SwotItem[];
  objectives: StrategicObjective[];
  tacticalPlans: TacticalPlan[];
}

export default function HistoricoPage() {
  const params = useParams();
  const router = useRouter();
  const planId = params.planId as string;
  const [plan, setPlan] = useState<StrategicPlan | null>(null);
  const [snapshots, setSnapshots] = useState<PlanSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingSnapshot, setViewingSnapshot] = useState<PlanSnapshot | null>(null);

  useEffect(() => {
    async function load() {
      const [planRes, snapRes] = await Promise.all([
        getStrategicPlan(planId),
        getSnapshots(planId),
      ]);
      setPlan(planRes.data);
      setSnapshots(snapRes.data ?? []);
      setLoading(false);
    }
    load();
  }, [planId]);

  if (loading) {
    return (
      <PageLayout title="Histórico de Versões" iconName="History" backHref={`/escritorio/estrategia/swot/${planId}`}>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center space-y-2">
            <div className="h-8 w-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-muted-foreground">Carregando histórico...</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  const snapshotData = viewingSnapshot?.snapshot_data as unknown as SnapshotData | null;

  return (
    <PageLayout
      title="Histórico de Versões"
      description={`${plan?.name ?? "Plano Estratégico"} · ${plan?.year ?? ""}`}
      iconName="History"
      backHref={`/escritorio/estrategia/swot/${planId}`}
      className="max-w-3xl mx-auto"
    >
      {/* Snapshots list */}
      {snapshots.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <History className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Nenhuma versão salva ainda.</p>
          <p className="text-sm mt-1">Salve uma versão na etapa de Revisão do plano.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {snapshots.map((snapshot) => (
            <Card key={snapshot.id} className="border hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-teal-700">v{snapshot.version_number}</span>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        Versão {snapshot.version_number}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(snapshot.created_at).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "long",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      {snapshot.notes && (
                        <p className="text-xs text-muted-foreground mt-1 italic">
                          {snapshot.notes}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setViewingSnapshot(snapshot)}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Visualizar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Snapshot detail dialog */}
      <Dialog open={!!viewingSnapshot} onOpenChange={() => setViewingSnapshot(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Versão {viewingSnapshot?.version_number} &mdash; {viewingSnapshot && new Date(viewingSnapshot.created_at).toLocaleDateString("pt-BR")}
            </DialogTitle>
          </DialogHeader>

          {snapshotData && (
            <div className="space-y-6">
              {/* Identity */}
              <div>
                <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <div className="h-5 w-5 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 text-xs font-bold">1</div>
                  Identidade
                </h3>
                <div className="text-sm space-y-1 pl-7">
                  <p><span className="text-muted-foreground">Nome:</span> {snapshotData.plan.name}</p>
                  {snapshotData.plan.mission && <p><span className="text-muted-foreground">Missão:</span> {snapshotData.plan.mission}</p>}
                  {snapshotData.plan.vision && <p><span className="text-muted-foreground">Visão:</span> {snapshotData.plan.vision}</p>}
                  {snapshotData.plan.values_text && <p><span className="text-muted-foreground">Valores:</span> {snapshotData.plan.values_text}</p>}
                </div>
              </div>

              {/* SWOT */}
              <div>
                <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <div className="h-5 w-5 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 text-xs font-bold">2</div>
                  Análise SWOT ({snapshotData.swotItems.length} itens)
                </h3>
                <div className="grid grid-cols-2 gap-3 pl-7">
                  {(["strength", "weakness", "opportunity", "threat"] as SwotType[]).map((type) => {
                    const items = snapshotData.swotItems.filter((i) => i.type === type);
                    const Icon = SWOT_ICONS[type];
                    return (
                      <div key={type}>
                        <div className="flex items-center gap-1 mb-1">
                          <Icon className={`h-3 w-3 ${SWOT_COLORS[type]}`} />
                          <span className="text-xs font-medium">{SWOT_LABELS[type]}</span>
                        </div>
                        <ul className="text-xs text-muted-foreground space-y-0.5">
                          {items.map((i) => <li key={i.id}>- {i.content}</li>)}
                          {items.length === 0 && <li className="italic">Nenhum</li>}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Objectives */}
              <div>
                <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <div className="h-5 w-5 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 text-xs font-bold">3</div>
                  Objetivos ({snapshotData.objectives.length})
                </h3>
                <ul className="space-y-1 pl-7">
                  {snapshotData.objectives.map((o) => (
                    <li key={o.id} className="text-sm flex items-start gap-1.5">
                      <Target className="h-3.5 w-3.5 text-teal-600 mt-0.5 shrink-0" />
                      <span>{o.title}</span>
                    </li>
                  ))}
                  {snapshotData.objectives.length === 0 && (
                    <li className="text-sm text-muted-foreground italic">Nenhum objetivo</li>
                  )}
                </ul>
              </div>

              {/* Tactical Plans */}
              <div>
                <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <div className="h-5 w-5 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 text-xs font-bold">4</div>
                  Plano de Ação ({snapshotData.tacticalPlans.length} ações)
                </h3>
                <ul className="space-y-1 pl-7">
                  {snapshotData.tacticalPlans.map((tp) => (
                    <li key={tp.id} className="text-sm flex items-start gap-1.5">
                      <ClipboardList className="h-3.5 w-3.5 text-teal-600 mt-0.5 shrink-0" />
                      <div>
                        <span>{tp.action}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {tp.responsible && `(${tp.responsible})`}
                          {tp.deadline && ` - ${new Date(tp.deadline).toLocaleDateString("pt-BR")}`}
                        </span>
                      </div>
                    </li>
                  ))}
                  {snapshotData.tacticalPlans.length === 0 && (
                    <li className="text-sm text-muted-foreground italic">Nenhuma ação</li>
                  )}
                </ul>
              </div>

              {viewingSnapshot?.notes && (
                <div className="bg-muted/50 rounded-lg p-3 text-sm">
                  <span className="font-medium">Observações:</span> {viewingSnapshot.notes}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
