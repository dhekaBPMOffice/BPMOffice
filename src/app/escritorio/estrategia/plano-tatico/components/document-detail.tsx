"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Pencil,
  Trash2,
  User,
  CalendarDays,
  Flag,
  BarChart3,
  Tag,
  CheckCircle2,
  ClipboardList,
  Settings,
  Save,
  Loader2,
} from "lucide-react";
import {
  updateTacticalPlanDocument,
  updateDocumentAction,
  createDocumentAction,
  deleteDocumentAction,
  deleteTacticalPlanDocument,
  type TacticalPlanDocument,
  type TacticalAction,
  type TacticalDocumentStatus,
  type TacticalHorizon,
  type TacticalPriority,
  type TacticalCategory,
} from "../actions";

const STATUS_OPTIONS = [
  { value: "draft", label: "Rascunho" },
  { value: "active", label: "Ativo" },
  { value: "completed", label: "Concluído" },
  { value: "cancelled", label: "Cancelado" },
];

const ACTION_STATUS_OPTIONS = [
  { value: "pending", label: "Pendente" },
  { value: "in_progress", label: "Em andamento" },
  { value: "completed", label: "Concluído" },
  { value: "cancelled", label: "Cancelado" },
];

const ACTION_STATUS_STYLES: Record<string, { label: string; className: string }> = {
  pending: { label: "Pendente", className: "bg-gray-100 text-gray-700" },
  in_progress: { label: "Em andamento", className: "bg-blue-100 text-blue-700" },
  completed: { label: "Concluído", className: "bg-emerald-100 text-emerald-700" },
  cancelled: { label: "Cancelado", className: "bg-red-100 text-red-700" },
};

const PRIORITY_STYLES: Record<string, { label: string; className: string }> = {
  alta: { label: "Alta", className: "bg-red-100 text-red-700" },
  media: { label: "Média", className: "bg-amber-100 text-amber-700" },
  baixa: { label: "Baixa", className: "bg-blue-100 text-blue-700" },
};

const CATEGORY_OPTIONS = [
  { value: "", label: "Nenhuma" },
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

interface DocumentDetailProps {
  document: TacticalPlanDocument;
  actions: TacticalAction[];
}

export function DocumentDetail({ document: initialDoc, actions: initialActions }: DocumentDetailProps) {
  const router = useRouter();
  const [doc, setDoc] = useState(initialDoc);
  const [actions, setActions] = useState(initialActions);
  const [error, setError] = useState<string | null>(null);
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [editingActionId, setEditingActionId] = useState<string | null>(null);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);

  const [settingsForm, setSettingsForm] = useState({
    title: doc.title,
    period_start: doc.period_start ?? "",
    period_end: doc.period_end ?? "",
    horizon: doc.horizon,
    status: doc.status,
  });

  const [actionForm, setActionForm] = useState({
    action: "",
    description: "",
    responsible: "",
    deadline: "",
    priority: "media" as TacticalPriority,
    kpi: "",
    category: "" as string,
    notes: "",
    objective_id: "",
  });

  function openNewAction() {
    setEditingActionId(null);
    setActionForm({
      action: "",
      description: "",
      responsible: "",
      deadline: "",
      priority: "media",
      kpi: "",
      category: "",
      notes: "",
      objective_id: "",
    });
    setShowActionDialog(true);
  }

  function openEditAction(a: TacticalAction) {
    setEditingActionId(a.id);
    setActionForm({
      action: a.action,
      description: a.description ?? "",
      responsible: a.responsible ?? "",
      deadline: a.deadline ?? "",
      priority: (a.priority as TacticalPriority) ?? "media",
      kpi: a.kpi ?? "",
      category: a.category ?? "",
      notes: a.notes ?? "",
      objective_id: a.objective_id,
    });
    setShowActionDialog(true);
  }

  async function handleSaveAction() {
    setError(null);
    if (!actionForm.action.trim()) return;

    if (editingActionId) {
      const result = await updateDocumentAction(editingActionId, {
        action: actionForm.action.trim(),
        description: actionForm.description.trim() || null,
        responsible: actionForm.responsible.trim() || null,
        deadline: actionForm.deadline || null,
        priority: actionForm.priority,
        kpi: actionForm.kpi.trim() || null,
        category: (actionForm.category || null) as TacticalCategory | null,
        notes: actionForm.notes.trim() || null,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setActions((prev) =>
        prev.map((a) =>
          a.id === editingActionId
            ? {
                ...a,
                action: actionForm.action.trim(),
                description: actionForm.description.trim() || null,
                responsible: actionForm.responsible.trim() || null,
                deadline: actionForm.deadline || null,
                priority: actionForm.priority,
                kpi: actionForm.kpi.trim() || null,
                category: (actionForm.category || null) as TacticalCategory | null,
                notes: actionForm.notes.trim() || null,
              }
            : a
        )
      );
    } else {
      const result = await createDocumentAction({
        document_id: doc.id,
        objective_id: actionForm.objective_id || actions[0]?.objective_id || doc.id,
        action: actionForm.action.trim(),
        description: actionForm.description.trim() || undefined,
        responsible: actionForm.responsible.trim() || undefined,
        deadline: actionForm.deadline || undefined,
        priority: actionForm.priority,
        kpi: actionForm.kpi.trim() || undefined,
        category: (actionForm.category || undefined) as TacticalCategory | undefined,
        notes: actionForm.notes.trim() || undefined,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.data) {
        setActions((prev) => [...prev, result.data!]);
      }
    }
    setShowActionDialog(false);
  }

  async function handleDeleteAction(id: string) {
    if (!confirm("Excluir esta ação tática?")) return;
    const result = await deleteDocumentAction(id);
    if (result.error) {
      setError(result.error);
    } else {
      setActions((prev) => prev.filter((a) => a.id !== id));
    }
  }

  async function handleStatusChange(actionId: string, status: string) {
    const result = await updateDocumentAction(actionId, { status });
    if (result.error) {
      setError(result.error);
    } else {
      setActions((prev) =>
        prev.map((a) => (a.id === actionId ? { ...a, status } : a))
      );
    }
  }

  async function handleSaveSettings() {
    setSettingsSaving(true);
    setError(null);
    const result = await updateTacticalPlanDocument(doc.id, {
      title: settingsForm.title.trim(),
      period_start: settingsForm.period_start || null,
      period_end: settingsForm.period_end || null,
      horizon: settingsForm.horizon as TacticalHorizon,
      status: settingsForm.status as TacticalDocumentStatus,
    });
    if (result.error) {
      setError(result.error);
    } else {
      setDoc((prev) => ({
        ...prev,
        title: settingsForm.title.trim(),
        period_start: settingsForm.period_start || null,
        period_end: settingsForm.period_end || null,
        horizon: settingsForm.horizon as TacticalHorizon,
        status: settingsForm.status as TacticalDocumentStatus,
      }));
      setShowSettingsDialog(false);
    }
    setSettingsSaving(false);
  }

  async function handleDeleteDocument() {
    if (!confirm("Excluir este plano tático e todas as suas ações? Esta ação não pode ser desfeita.")) return;
    const result = await deleteTacticalPlanDocument(doc.id);
    if (result.error) {
      setError(result.error);
    } else {
      router.push("/escritorio/estrategia/plano-tatico");
    }
  }

  const completedCount = actions.filter((a) => a.status === "completed").length;
  const progress = actions.length > 0 ? Math.round((completedCount / actions.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      {/* Header card */}
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">{doc.title}</h2>
                <Badge className={`text-[10px] ${ACTION_STATUS_STYLES[doc.status]?.className ?? "bg-gray-100 text-gray-700"}`}>
                  {STATUS_OPTIONS.find((s) => s.value === doc.status)?.label ?? doc.status}
                </Badge>
              </div>
              {doc.period_start && doc.period_end && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {new Date(doc.period_start + "T00:00:00").toLocaleDateString("pt-BR")} —{" "}
                  {new Date(doc.period_end + "T00:00:00").toLocaleDateString("pt-BR")}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowSettingsDialog(true)} className="gap-1">
                <Settings className="h-3.5 w-3.5" />
                Configurações
              </Button>
              <Button variant="outline" size="sm" onClick={openNewAction} className="gap-1">
                <Plus className="h-3.5 w-3.5" />
                Nova Ação
              </Button>
            </div>
          </div>

          {actions.length > 0 && (
            <div className="mt-4 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">
                  {completedCount} de {actions.length} ações concluídas
                </span>
                <span className="font-medium">{progress}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-teal-500 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions list */}
      {actions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <ClipboardList className="h-12 w-12 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Nenhuma ação cadastrada neste plano.</p>
            <Button onClick={openNewAction} className="gap-2">
              <Plus className="h-4 w-4" />
              Adicionar Ação
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {actions.map((a) => {
            const statusStyle = ACTION_STATUS_STYLES[a.status] ?? ACTION_STATUS_STYLES.pending;
            const priorityStyle = PRIORITY_STYLES[a.priority ?? "media"] ?? PRIORITY_STYLES.media;
            return (
              <Card key={a.id} className="border">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{a.action}</p>
                        <Badge className={`text-[10px] shrink-0 ${priorityStyle.className}`}>
                          <Flag className="h-2.5 w-2.5 mr-0.5" />
                          {priorityStyle.label}
                        </Badge>
                      </div>
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
                        {a.category && (
                          <span className="flex items-center gap-1">
                            <Tag className="h-3 w-3" /> {CATEGORY_LABELS[a.category] ?? a.category}
                          </span>
                        )}
                        {a.kpi && (
                          <span className="flex items-center gap-1">
                            <BarChart3 className="h-3 w-3" /> {a.kpi}
                          </span>
                        )}
                        <Select
                          value={a.status}
                          onChange={(e) => handleStatusChange(a.id, e.target.value)}
                          className="text-xs h-6 py-0 w-auto"
                        >
                          {ACTION_STATUS_OPTIONS.map((s) => (
                            <option key={s.value} value={s.value}>
                              {s.label}
                            </option>
                          ))}
                        </Select>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditAction(a)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteAction(a.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Action dialog */}
      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingActionId ? "Editar Ação" : "Nova Ação"}</DialogTitle>
            <DialogDescription>Defina os detalhes da ação tática.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label>Ação *</Label>
              <Input
                value={actionForm.action}
                onChange={(e) => setActionForm({ ...actionForm, action: e.target.value })}
                placeholder="Título da ação"
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={actionForm.description}
                onChange={(e) => setActionForm({ ...actionForm, description: e.target.value })}
                placeholder="Breve descrição"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Responsável</Label>
                <Input
                  value={actionForm.responsible}
                  onChange={(e) => setActionForm({ ...actionForm, responsible: e.target.value })}
                  placeholder="Cargo ou nome"
                />
              </div>
              <div className="space-y-2">
                <Label>Prazo</Label>
                <Input
                  type="date"
                  value={actionForm.deadline}
                  onChange={(e) => setActionForm({ ...actionForm, deadline: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select
                  value={actionForm.priority}
                  onChange={(e) => setActionForm({ ...actionForm, priority: e.target.value as TacticalPriority })}
                >
                  <option value="alta">Alta</option>
                  <option value="media">Média</option>
                  <option value="baixa">Baixa</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select
                  value={actionForm.category}
                  onChange={(e) => setActionForm({ ...actionForm, category: e.target.value })}
                >
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>KPI / Indicador de Sucesso</Label>
              <Input
                value={actionForm.kpi}
                onChange={(e) => setActionForm({ ...actionForm, kpi: e.target.value })}
                placeholder="Ex: Reduzir tempo de resposta em 20%"
              />
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={actionForm.notes}
                onChange={(e) => setActionForm({ ...actionForm, notes: e.target.value })}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActionDialog(false)}>Cancelar</Button>
            <Button
              onClick={handleSaveAction}
              disabled={!actionForm.action.trim()}
              className="bg-teal-600 hover:bg-teal-700"
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings dialog */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurações do Plano</DialogTitle>
            <DialogDescription>Edite as informações do plano tático.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input
                value={settingsForm.title}
                onChange={(e) => setSettingsForm({ ...settingsForm, title: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Início</Label>
                <Input
                  type="date"
                  value={settingsForm.period_start}
                  onChange={(e) => setSettingsForm({ ...settingsForm, period_start: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Fim</Label>
                <Input
                  type="date"
                  value={settingsForm.period_end}
                  onChange={(e) => setSettingsForm({ ...settingsForm, period_end: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Horizonte</Label>
                <Select
                  value={settingsForm.horizon}
                  onChange={(e) => setSettingsForm({ ...settingsForm, horizon: e.target.value as TacticalHorizon })}
                >
                  <option value="trimestral">Trimestral</option>
                  <option value="semestral">Semestral</option>
                  <option value="anual">Anual</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={settingsForm.status}
                  onChange={(e) => setSettingsForm({ ...settingsForm, status: e.target.value as TacticalDocumentStatus })}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="flex justify-between sm:justify-between">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteDocument}
              className="gap-1"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Excluir Plano
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowSettingsDialog(false)}>Cancelar</Button>
              <Button
                onClick={handleSaveSettings}
                disabled={settingsSaving || !settingsForm.title.trim()}
                className="bg-teal-600 hover:bg-teal-700 gap-1"
              >
                {settingsSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Salvar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
