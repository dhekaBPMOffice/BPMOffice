"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, CalendarDays, User, ClipboardList } from "lucide-react";
import { AISuggestButton } from "./ai-suggest-button";
import {
  createTacticalPlan,
  updateTacticalPlan,
  deleteTacticalPlan,
  type StrategicObjective,
  type TacticalPlan,
} from "../actions";

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  pending: { label: "Pendente", className: "bg-gray-100 text-gray-700" },
  in_progress: { label: "Em andamento", className: "bg-blue-100 text-blue-700" },
  completed: { label: "Concluído", className: "bg-emerald-100 text-emerald-700" },
  cancelled: { label: "Cancelado", className: "bg-red-100 text-red-700" },
};

const STATUS_OPTIONS = [
  { value: "pending", label: "Pendente" },
  { value: "in_progress", label: "Em andamento" },
  { value: "completed", label: "Concluído" },
  { value: "cancelled", label: "Cancelado" },
];

interface StepActionPlanProps {
  planId: string;
  objectives: StrategicObjective[];
  tacticalPlans: TacticalPlan[];
  onReload: () => Promise<void>;
}

export function StepActionPlan({ planId, objectives, tacticalPlans, onReload }: StepActionPlanProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [objectiveId, setObjectiveId] = useState("");
  const [action, setAction] = useState("");
  const [responsible, setResponsible] = useState("");
  const [deadline, setDeadline] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  function openNew() {
    setEditingId(null);
    setObjectiveId(objectives[0]?.id ?? "");
    setAction("");
    setResponsible("");
    setDeadline("");
    setNotes("");
    setShowDialog(true);
  }

  function openEdit(plan: TacticalPlan) {
    setEditingId(plan.id);
    setObjectiveId(plan.objective_id);
    setAction(plan.action);
    setResponsible(plan.responsible ?? "");
    setDeadline(plan.deadline ?? "");
    setNotes(plan.notes ?? "");
    setShowDialog(true);
  }

  async function handleSave() {
    setError(null);
    if (editingId) {
      const result = await updateTacticalPlan(editingId, {
        action,
        responsible: responsible || null,
        deadline: deadline || null,
        notes: notes || null,
      });
      if (result.error) { setError(result.error); return; }
    } else {
      if (!objectiveId) { setError("Selecione um objetivo."); return; }
      const result = await createTacticalPlan(objectiveId, action, responsible || undefined, deadline || undefined, undefined, notes || undefined);
      if (result.error) { setError(result.error); return; }
    }
    setShowDialog(false);
    await onReload();
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta ação tática?")) return;
    const result = await deleteTacticalPlan(id);
    if (result.error) setError(result.error);
    else await onReload();
  }

  async function handleStatusChange(planItemId: string, status: string) {
    const result = await updateTacticalPlan(planItemId, { status });
    if (result.error) setError(result.error);
    else await onReload();
  }

  function getObjectiveTitle(id: string): string {
    return objectives.find((o) => o.id === id)?.title ?? "—";
  }

  async function handleAIResult(text: string) {
    const lines = text.split("\n").filter((l) => l.trim());
    let currentObjTitle = "";

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.toLowerCase().startsWith("objetivo:")) {
        currentObjTitle = trimmed.replace(/^objetivo:\s*/i, "").trim();
        continue;
      }

      if (trimmed.startsWith("-") && trimmed.includes("|")) {
        const parts = trimmed.replace(/^-\s*/, "").split("|").map((p) => p.trim());
        const actionText = parts[0]?.replace(/^ação:\s*/i, "").trim();
        const responsibleText = parts[1]?.replace(/^responsável:\s*/i, "").trim();
        const deadlineText = parts[2]?.replace(/^prazo:\s*/i, "").trim();

        const matchedObj = objectives.find(
          (o) => o.title.toLowerCase().includes(currentObjTitle.toLowerCase().slice(0, 20)) || currentObjTitle.toLowerCase().includes(o.title.toLowerCase().slice(0, 20))
        );
        const objId = matchedObj?.id ?? objectives[0]?.id;

        if (objId && actionText) {
          await createTacticalPlan(
            objId,
            actionText,
            responsibleText || undefined,
            deadlineText || undefined
          );
        }
      }
    }
    await onReload();
  }

  const objSummary = objectives.map((o) => o.title).join("\n");
  const aiContext = `Objetivos estratégicos:\n${objSummary || "Nenhum"}\n\nAções existentes: ${tacticalPlans.length}`;

  const groupedByObjective = objectives.map((obj) => ({
    objective: obj,
    plans: tacticalPlans.filter((p) => p.objective_id === obj.id),
  }));

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">Plano de Ação</h2>
        <p className="text-muted-foreground">
          Cronograma trimestral prático para execução
        </p>
      </div>

      <div className="flex justify-center gap-3">
        <AISuggestButton
          phase="tactical_plan"
          context={aiContext}
          onResult={handleAIResult}
          label="Gerar Plano com IA"
          disabled={objectives.length === 0}
        />
        <Button onClick={openNew} className="gap-2" disabled={objectives.length === 0}>
          <Plus className="h-4 w-4" />
          Nova Ação
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive text-center">{error}</div>
      )}

      {objectives.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Defina objetivos estratégicos primeiro.</p>
          <p className="text-sm mt-1">Volte à etapa anterior para adicionar objetivos.</p>
        </div>
      ) : (
        <div className="space-y-6 max-w-3xl mx-auto">
          {groupedByObjective.map(({ objective, plans }) => (
            <div key={objective.id}>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-2 w-2 rounded-full bg-teal-500" />
                <h3 className="font-semibold text-foreground text-sm">{objective.title}</h3>
                <Badge variant="outline" className="text-xs ml-auto">{plans.length} ações</Badge>
              </div>

              <div className="space-y-2 pl-4 border-l-2 border-teal-100">
                {plans.map((plan) => (
                  <Card key={plan.id} className="border">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <p className="font-medium text-sm">{plan.action}</p>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            {plan.responsible && (
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" /> {plan.responsible}
                              </span>
                            )}
                            {plan.deadline && (
                              <span className="flex items-center gap-1">
                                <CalendarDays className="h-3 w-3" /> {new Date(plan.deadline).toLocaleDateString("pt-BR")}
                              </span>
                            )}
                            <Select
                              value={plan.status}
                              onChange={(e) => handleStatusChange(plan.id, e.target.value)}
                              className="text-xs h-6 py-0 w-auto"
                            >
                              {STATUS_OPTIONS.map((s) => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                              ))}
                            </Select>
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(plan)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(plan.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {plans.length === 0 && (
                  <p className="text-sm text-muted-foreground py-2 pl-2">Nenhuma ação definida</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Ação" : "Nova Ação Tática"}</DialogTitle>
            <DialogDescription>Defina a ação, responsável e prazos.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {!editingId && (
              <div className="space-y-2">
                <Label>Objetivo</Label>
                <Select value={objectiveId} onChange={(e) => setObjectiveId(e.target.value)}>
                  <option value="">Selecione...</option>
                  {objectives.map((o) => (
                    <option key={o.id} value={o.id}>{o.title}</option>
                  ))}
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Ação</Label>
              <Input
                value={action}
                onChange={(e) => setAction(e.target.value)}
                placeholder="Ex: Implementar sistema de controle"
              />
            </div>
            <div className="space-y-2">
              <Label>Responsável</Label>
              <Input
                value={responsible}
                onChange={(e) => setResponsible(e.target.value)}
                placeholder="Nome do responsável"
              />
            </div>
            <div className="space-y-2">
              <Label>Prazo</Label>
              <Input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!action.trim()} className="bg-teal-600 hover:bg-teal-700">
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
