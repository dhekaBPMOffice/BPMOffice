"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Save, CheckCircle2, History, TrendingUp, TrendingDown, Lightbulb, ShieldAlert, Target, ClipboardList } from "lucide-react";
import {
  saveSnapshot,
  updateStrategicPlan,
  type StrategicPlan,
  type SwotItem,
  type StrategicObjective,
  type TacticalPlan,
  type SwotType,
} from "../actions";

const SWOT_ICONS: Record<SwotType, typeof TrendingUp> = {
  strength: TrendingUp,
  weakness: TrendingDown,
  opportunity: Lightbulb,
  threat: ShieldAlert,
};

const SWOT_LABELS: Record<SwotType, string> = {
  strength: "Forças",
  weakness: "Fraquezas",
  opportunity: "Oportunidades",
  threat: "Ameaças",
};

const SWOT_COLORS: Record<SwotType, string> = {
  strength: "text-emerald-600",
  weakness: "text-red-600",
  opportunity: "text-blue-600",
  threat: "text-amber-600",
};

interface StepReviewProps {
  plan: StrategicPlan;
  swotItems: SwotItem[];
  objectives: StrategicObjective[];
  tacticalPlans: TacticalPlan[];
  planId: string;
  onReload: () => Promise<void>;
}

export function StepReview({ plan, swotItems, objectives, tacticalPlans, planId, onReload }: StepReviewProps) {
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [snapshotNotes, setSnapshotNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSaveVersion() {
    setSaving(true);
    setError(null);
    const result = await saveSnapshot(planId, snapshotNotes || undefined);
    if (result.error) {
      setError(result.error);
    } else {
      setSaved(true);
      setShowSaveDialog(false);
      setSnapshotNotes("");
    }
    setSaving(false);
  }

  async function handleActivate() {
    await updateStrategicPlan(planId, { status: "active" });
    await onReload();
  }

  const completionItems = [
    { label: "Identidade definida", done: !!(plan.mission && plan.vision) },
    { label: "Análise SWOT", done: swotItems.length > 0 },
    { label: "Objetivos estratégicos", done: objectives.length > 0 },
    { label: "Plano de ação", done: tacticalPlans.length > 0 },
  ];
  const completionPercent = Math.round((completionItems.filter((i) => i.done).length / completionItems.length) * 100);

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">Revisão do Plano</h2>
        <p className="text-muted-foreground">
          Confira todas as informações antes de salvar
        </p>
      </div>

      {/* Completion */}
      <Card className="max-w-2xl mx-auto border-teal-200 bg-teal-50/50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Progresso do Plano</h3>
            <span className="text-2xl font-bold text-teal-700">{completionPercent}%</span>
          </div>
          <div className="h-2 bg-teal-100 rounded-full mb-4">
            <div className="h-full bg-teal-500 rounded-full transition-all" style={{ width: `${completionPercent}%` }} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {completionItems.map((item) => (
              <div key={item.label} className="flex items-center gap-2 text-sm">
                <CheckCircle2 className={`h-4 w-4 ${item.done ? "text-teal-600" : "text-gray-300"}`} />
                <span className={item.done ? "text-foreground" : "text-muted-foreground"}>{item.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Identity */}
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 text-xs font-bold">1</div>
            Identidade
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <span className="font-medium text-muted-foreground">Nome:</span>{" "}
            <span className="text-foreground">{plan.name}</span>
          </div>
          <div>
            <span className="font-medium text-muted-foreground">Ano:</span>{" "}
            <span className="text-foreground">{plan.year}</span>
          </div>
          {plan.mission && (
            <div>
              <span className="font-medium text-muted-foreground">Missão:</span>{" "}
              <span className="text-foreground">{plan.mission}</span>
            </div>
          )}
          {plan.vision && (
            <div>
              <span className="font-medium text-muted-foreground">Visão:</span>{" "}
              <span className="text-foreground">{plan.vision}</span>
            </div>
          )}
          {plan.values_text && (
            <div>
              <span className="font-medium text-muted-foreground">Valores:</span>{" "}
              <span className="text-foreground">{plan.values_text}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SWOT Summary */}
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 text-xs font-bold">2</div>
              Análise SWOT
            </CardTitle>
            <Badge variant="outline">{swotItems.length} itens</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {swotItems.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {(["strength", "weakness", "opportunity", "threat"] as SwotType[]).map((type) => {
                const items = swotItems.filter((i) => i.type === type);
                const Icon = SWOT_ICONS[type];
                return (
                  <div key={type} className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Icon className={`h-3.5 w-3.5 ${SWOT_COLORS[type]}`} />
                      <span className="text-xs font-medium">{SWOT_LABELS[type]} ({items.length})</span>
                    </div>
                    <ul className="text-xs text-muted-foreground space-y-0.5">
                      {items.slice(0, 3).map((item) => (
                        <li key={item.id} className="truncate">- {item.content}</li>
                      ))}
                      {items.length > 3 && <li>... +{items.length - 3} mais</li>}
                    </ul>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-3">Nenhum item SWOT</p>
          )}
        </CardContent>
      </Card>

      {/* Objectives */}
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 text-xs font-bold">3</div>
              Objetivos Estratégicos
            </CardTitle>
            <Badge variant="outline">{objectives.length} objetivos</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {objectives.length > 0 ? (
            <ul className="space-y-2">
              {objectives.map((obj, i) => (
                <li key={obj.id} className="flex items-start gap-2 text-sm">
                  <Target className="h-4 w-4 text-teal-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-medium">{obj.title}</span>
                    {obj.description && <p className="text-xs text-muted-foreground">{obj.description}</p>}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-3">Nenhum objetivo definido</p>
          )}
        </CardContent>
      </Card>

      {/* Action Plan */}
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 text-xs font-bold">4</div>
              Plano de Ação
            </CardTitle>
            <Badge variant="outline">{tacticalPlans.length} ações</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {tacticalPlans.length > 0 ? (
            <ul className="space-y-2">
              {tacticalPlans.map((tp) => (
                <li key={tp.id} className="flex items-start gap-2 text-sm">
                  <ClipboardList className="h-4 w-4 text-teal-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-medium">{tp.action}</span>
                    <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                      {tp.responsible && <span>{tp.responsible}</span>}
                      {tp.deadline && <span>{new Date(tp.deadline).toLocaleDateString("pt-BR")}</span>}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-3">Nenhuma ação definida</p>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-center gap-3 pb-20 max-w-2xl mx-auto">
        {saved ? (
          <div className="flex items-center gap-2 text-teal-700 bg-teal-50 px-4 py-2 rounded-lg">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">Versão salva com sucesso!</span>
          </div>
        ) : (
          <>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setShowSaveDialog(true)}
            >
              <History className="h-4 w-4" />
              Salvar Versão
            </Button>
            {plan.status === "draft" && (
              <Button
                className="gap-2 bg-teal-600 hover:bg-teal-700"
                onClick={handleActivate}
              >
                <CheckCircle2 className="h-4 w-4" />
                Ativar Plano
              </Button>
            )}
          </>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive text-center max-w-2xl mx-auto">{error}</div>
      )}

      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Salvar Versão</DialogTitle>
            <DialogDescription>
              Salve um snapshot do estado atual do plano para poder acompanhar a evolução.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Observações (opcional)</label>
              <Input
                value={snapshotNotes}
                onChange={(e) => setSnapshotNotes(e.target.value)}
                placeholder="Ex: Versão inicial após reunião de kickoff"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>Cancelar</Button>
            <Button
              onClick={handleSaveVersion}
              disabled={saving}
              className="gap-2 bg-teal-600 hover:bg-teal-700"
            >
              <Save className="h-4 w-4" />
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
