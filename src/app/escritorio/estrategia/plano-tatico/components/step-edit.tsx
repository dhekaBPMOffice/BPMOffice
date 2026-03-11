"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Save,
  Loader2,
  User,
  CalendarDays,
  Flag,
  BarChart3,
  Tag,
  CheckCircle2,
} from "lucide-react";
import type { AIGeneratedAction } from "./step-preview";

const PRIORITY_STYLES: Record<string, { label: string; className: string }> = {
  alta: { label: "Alta", className: "bg-red-100 text-red-700" },
  media: { label: "Média", className: "bg-amber-100 text-amber-700" },
  baixa: { label: "Baixa", className: "bg-blue-100 text-blue-700" },
};

const CATEGORY_OPTIONS = [
  { value: "", label: "Selecione..." },
  { value: "processos", label: "Processos" },
  { value: "pessoas", label: "Pessoas" },
  { value: "tecnologia", label: "Tecnologia" },
  { value: "governanca", label: "Governança" },
  { value: "capacitacao", label: "Capacitação" },
  { value: "outro", label: "Outro" },
];

const CATEGORY_LABELS: Record<string, string> = {
  processos: "Processos",
  pessoas: "Pessoas",
  tecnologia: "Tecnologia",
  governanca: "Governança",
  capacitacao: "Capacitação",
  outro: "Outro",
};

interface StepEditProps {
  actions: AIGeneratedAction[];
  onActionsChange: (actions: AIGeneratedAction[]) => void;
  onBack: () => void;
  onSave: () => void;
  isSaving: boolean;
  saveError: string | null;
}

export function StepEdit({
  actions,
  onActionsChange,
  onBack,
  onSave,
  isSaving,
  saveError,
}: StepEditProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [form, setForm] = useState<AIGeneratedAction>({
    action: "",
    description: "",
    objective_title: "",
    responsible: "",
    deadline: "",
    priority: "media",
    kpi: "",
    category: "",
  });

  function openNew() {
    setEditingIndex(null);
    setForm({
      action: "",
      description: "",
      objective_title: "",
      responsible: "",
      deadline: "",
      priority: "media",
      kpi: "",
      category: "",
    });
    setShowDialog(true);
  }

  function openEdit(index: number) {
    setEditingIndex(index);
    setForm({ ...actions[index] });
    setShowDialog(true);
  }

  function handleSaveAction() {
    if (!form.action.trim()) return;
    const updated = [...actions];
    if (editingIndex !== null) {
      updated[editingIndex] = { ...form };
    } else {
      updated.push({ ...form });
    }
    onActionsChange(updated);
    setShowDialog(false);
  }

  function handleDelete(index: number) {
    if (!confirm("Remover esta ação?")) return;
    onActionsChange(actions.filter((_, i) => i !== index));
  }

  const groupedByObjective = new Map<string, { action: AIGeneratedAction; index: number }[]>();
  actions.forEach((a, index) => {
    const key = a.objective_title || "Sem objetivo vinculado";
    const group = groupedByObjective.get(key) ?? [];
    group.push({ action: a, index });
    groupedByObjective.set(key, group);
  });

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">Editar e Salvar</h2>
        <p className="text-muted-foreground">
          Ajuste as ações conforme necessário e salve o plano tático.
        </p>
      </div>

      <div className="flex justify-center gap-3">
        <Button variant="outline" onClick={openNew} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Ação Manual
        </Button>
      </div>

      {saveError && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive text-center max-w-xl mx-auto">
          {saveError}
        </div>
      )}

      {actions.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>Nenhuma ação definida. Adicione ações manualmente ou volte para gerar com IA.</p>
        </div>
      ) : (
        <div className="space-y-6 max-w-3xl mx-auto">
          {Array.from(groupedByObjective.entries()).map(([objectiveTitle, items]) => (
            <div key={objectiveTitle}>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-2 w-2 rounded-full bg-teal-500" />
                <h3 className="font-semibold text-foreground text-sm">{objectiveTitle}</h3>
                <Badge variant="outline" className="text-xs ml-auto">
                  {items.length} ações
                </Badge>
              </div>

              <div className="space-y-2 pl-4 border-l-2 border-teal-100">
                {items.map(({ action: a, index }) => (
                  <Card key={index} className="border">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <p className="font-medium text-sm">{a.action}</p>
                          {a.description && (
                            <p className="text-xs text-muted-foreground">{a.description}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            {a.responsible && (
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" /> {a.responsible}
                              </span>
                            )}
                            {a.deadline && (
                              <span className="flex items-center gap-1">
                                <CalendarDays className="h-3 w-3" />{" "}
                                {new Date(a.deadline + "T00:00:00").toLocaleDateString("pt-BR")}
                              </span>
                            )}
                            {a.priority && (
                              <Badge
                                className={`text-[10px] ${PRIORITY_STYLES[a.priority]?.className ?? ""}`}
                              >
                                <Flag className="h-2.5 w-2.5 mr-0.5" />
                                {PRIORITY_STYLES[a.priority]?.label ?? a.priority}
                              </Badge>
                            )}
                            {a.category && (
                              <span className="flex items-center gap-1">
                                <Tag className="h-3 w-3" />{" "}
                                {CATEGORY_LABELS[a.category] ?? a.category}
                              </span>
                            )}
                            {a.kpi && (
                              <span className="flex items-center gap-1">
                                <BarChart3 className="h-3 w-3" /> {a.kpi}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => openEdit(index)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleDelete(index)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-center gap-3">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Voltar ao Preview
        </Button>
        <Button
          onClick={onSave}
          disabled={actions.length === 0 || isSaving}
          className="gap-2 bg-teal-600 hover:bg-teal-700"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {isSaving ? "Salvando..." : "Salvar Plano Tático"}
        </Button>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingIndex !== null ? "Editar Ação" : "Nova Ação Manual"}
            </DialogTitle>
            <DialogDescription>Defina os detalhes da ação tática.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label>Ação *</Label>
              <Input
                value={form.action}
                onChange={(e) => setForm({ ...form, action: e.target.value })}
                placeholder="Título da ação"
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Breve descrição do que será feito"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Objetivo Vinculado</Label>
              <Input
                value={form.objective_title}
                onChange={(e) => setForm({ ...form, objective_title: e.target.value })}
                placeholder="Título do objetivo"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Responsável</Label>
                <Input
                  value={form.responsible}
                  onChange={(e) => setForm({ ...form, responsible: e.target.value })}
                  placeholder="Cargo ou nome"
                />
              </div>
              <div className="space-y-2">
                <Label>Prazo</Label>
                <Input
                  type="date"
                  value={form.deadline}
                  onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select
                  value={form.priority}
                  onChange={(e) =>
                    setForm({ ...form, priority: e.target.value as "alta" | "media" | "baixa" })
                  }
                >
                  <option value="alta">Alta</option>
                  <option value="media">Média</option>
                  <option value="baixa">Baixa</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>KPI / Indicador de Sucesso</Label>
              <Input
                value={form.kpi}
                onChange={(e) => setForm({ ...form, kpi: e.target.value })}
                placeholder="Ex: Reduzir tempo de resposta em 20%"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveAction}
              disabled={!form.action.trim()}
              className="bg-teal-600 hover:bg-teal-700"
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              {editingIndex !== null ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
