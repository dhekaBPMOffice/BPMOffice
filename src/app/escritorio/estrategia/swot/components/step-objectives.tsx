"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
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
import { Plus, Pencil, Trash2, Target } from "lucide-react";
import { AISuggestButton } from "./ai-suggest-button";
import {
  createStrategicObjective,
  updateStrategicObjective,
  deleteStrategicObjective,
  type SwotItem,
  type StrategicObjective,
  type SwotType,
} from "../actions";

const SWOT_LABELS: Record<SwotType, string> = {
  strength: "Forças",
  weakness: "Fraquezas",
  opportunity: "Oportunidades",
  threat: "Ameaças",
};

interface StepObjectivesProps {
  planId: string;
  swotItems: SwotItem[];
  objectives: StrategicObjective[];
  onReload: () => Promise<void>;
}

export function StepObjectives({ planId, swotItems, objectives, onReload }: StepObjectivesProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [swotId, setSwotId] = useState("");
  const [error, setError] = useState<string | null>(null);

  function openNew() {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setSwotId("");
    setShowDialog(true);
  }

  function openEdit(obj: StrategicObjective) {
    setEditingId(obj.id);
    setTitle(obj.title);
    setDescription(obj.description ?? "");
    setSwotId(obj.swot_item_id ?? "");
    setShowDialog(true);
  }

  async function handleSave() {
    setError(null);
    if (editingId) {
      const result = await updateStrategicObjective(editingId, {
        title,
        description: description || undefined,
        swot_item_id: swotId || null,
      });
      if (result.error) { setError(result.error); return; }
    } else {
      const result = await createStrategicObjective(title, description || undefined, swotId || undefined, planId);
      if (result.error) { setError(result.error); return; }
    }
    setShowDialog(false);
    await onReload();
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este objetivo e seus planos táticos vinculados?")) return;
    const result = await deleteStrategicObjective(id);
    if (result.error) setError(result.error);
    else await onReload();
  }

  async function handleAIResult(text: string) {
    const lines = text.split("\n").filter((l) => l.trim());

    for (const line of lines) {
      const match = line.match(/^\d+\.\s*(.+?)(?:\s*-\s*(.+))?$/);
      if (match) {
        const objTitle = match[1].trim();
        const objDesc = match[2]?.trim() || undefined;
        await createStrategicObjective(objTitle, objDesc, undefined, planId);
      }
    }
    await onReload();
  }

  const swotSummary = swotItems
    .map((item) => `${SWOT_LABELS[item.type]}: ${item.content}`)
    .join("\n");

  const aiContext = `Análise SWOT atual:\n${swotSummary || "Nenhum item SWOT definido"}\n\nObjetivos existentes: ${objectives.length}`;

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">Objetivos Estratégicos</h2>
        <p className="text-muted-foreground">
          Defina metas claras e resultados chave (OKRs)
        </p>
      </div>

      <div className="flex justify-center gap-3">
        <AISuggestButton
          phase="strategic_objectives"
          context={aiContext}
          onResult={handleAIResult}
          label="Sugerir Objetivos com IA"
        />
        <Button onClick={openNew} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Objetivo
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive text-center">{error}</div>
      )}

      <div className="space-y-3 max-w-2xl mx-auto">
        {objectives.map((obj, index) => (
          <Card key={obj.id} className="border">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-teal-100 text-teal-700 text-sm font-bold shrink-0 mt-0.5">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">{obj.title}</p>
                    {obj.description && (
                      <p className="text-sm text-muted-foreground mt-1">{obj.description}</p>
                    )}
                    {obj.swot_item_id && (
                      <div className="flex items-center gap-1.5 mt-2">
                        <Target className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          Vinculado ao SWOT: {swotItems.find((s) => s.id === obj.swot_item_id)?.content?.slice(0, 40) ?? "—"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(obj)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(obj.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {objectives.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Nenhum objetivo definido ainda.</p>
            <p className="text-sm mt-1">Adicione manualmente ou peça sugestões da IA.</p>
          </div>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Objetivo" : "Novo Objetivo Estratégico"}</DialogTitle>
            <DialogDescription>Defina o título, descrição e vínculo com o SWOT.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Aumentar eficiência operacional em 30%"
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descrição opcional do objetivo"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Vinculado ao SWOT (opcional)</Label>
              <Select value={swotId} onChange={(e) => setSwotId(e.target.value)}>
                <option value="">Nenhum</option>
                {swotItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {SWOT_LABELS[item.type]}: {item.content.slice(0, 50)}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!title.trim()} className="bg-teal-600 hover:bg-teal-700">
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
