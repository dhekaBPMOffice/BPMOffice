"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Target,
  FileUp,
  Loader2,
  Pencil,
  Trash2,
  ListChecks,
  Plus,
} from "lucide-react";
import { PageLayout } from "@/components/layout/page-layout";
import { cn } from "@/lib/utils";
import {
  getOfficeObjectives,
  getBaseOfficeObjectives,
  createOfficeObjective,
  addObjectiveFromCatalog,
  updateOfficeObjective,
  deleteOfficeObjective,
  getGoalsByObjectiveId,
  getChildObjectives,
  createGoal,
  updateGoal,
  deleteGoal,
  type OfficeObjective,
  type OfficeObjectiveGoal,
  type BaseOfficeObjective,
  type OfficeObjectiveType,
} from "./actions";

const ACCEPTED_EXT = ".txt, .docx";

type EditGoalItem = { id?: string; title: string; description?: string | null };
type EditSecondaryItem = {
  id?: string;
  title: string;
  description?: string | null;
  goals: EditGoalItem[];
  initialGoalIds?: string[];
};

export default function ObjetivosEscritorioPage() {
  const [objectives, setObjectives] = useState<OfficeObjective[]>([]);
  const [baseOptions, setBaseOptions] = useState<BaseOfficeObjective[]>([]);
  const [loading, setLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<number | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const [manualPrimary, setManualPrimary] = useState({
    title: "",
    description: "",
    goals: [] as { title: string; description: string }[],
  });
  const [manualSecondaries, setManualSecondaries] = useState<
    { title: string; description: string; goals: { title: string; description: string }[] }[]
  >([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const [addingFromCatalogId, setAddingFromCatalogId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editParentId, setEditParentId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editType, setEditType] = useState<OfficeObjectiveType>("primary");
  const [editGoals, setEditGoals] = useState<EditGoalItem[]>([]);
  const [editGoalsInitialIds, setEditGoalsInitialIds] = useState<string[]>([]);
  const [editSecondaries, setEditSecondaries] = useState<EditSecondaryItem[]>([]);
  const [editSecondariesInitialIds, setEditSecondariesInitialIds] = useState<string[]>([]);
  const [editSaving, setEditSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [objRes, baseRes] = await Promise.all([
      getOfficeObjectives(),
      getBaseOfficeObjectives(),
    ]);
    setLoading(false);
    if (objRes.data) setObjectives(objRes.data);
    if (baseRes.data) setBaseOptions(baseRes.data);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleImport = async () => {
    if (!file) {
      setImportError("Selecione um arquivo.");
      return;
    }
    setImportError(null);
    setImportSuccess(null);
    setIsImporting(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const res = await fetch("/api/escritorio/objetivos-escritorio/import", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) {
        setImportError(
          (json.error ?? "Falha ao importar.") +
            (json.detail ? ` ${json.detail}` : "")
        );
        return;
      }
      setImportSuccess(json.count ?? 0);
      setFile(null);
      setImportDialogOpen(false);
      await loadData();
    } catch {
      setImportError("Erro de conexão ao importar.");
    } finally {
      setIsImporting(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(false);
    const primaryTitle = manualPrimary.title.trim();
    if (!primaryTitle) {
      setSubmitError("O título do objetivo primário é obrigatório.");
      return;
    }
    const secondariesWithTitle = manualSecondaries.filter((s) => s.title.trim());
    const primaryGoals = manualPrimary.goals
      .filter((g) => g.title.trim())
      .map((g) => ({ title: g.title.trim(), description: g.description?.trim() || null }));
    const { data: primaryData, error: primaryError } = await createOfficeObjective(
      primaryTitle,
      "primary",
      {
        description: manualPrimary.description.trim() || null,
        goals: primaryGoals.length ? primaryGoals : undefined,
      }
    );
    if (primaryError) {
      setSubmitError(primaryError);
      return;
    }
    const created: OfficeObjective[] = primaryData ? [primaryData] : [];
    const primaryId = primaryData?.id;
    if (primaryId) {
      for (const sec of secondariesWithTitle) {
        const { data: secData, error: secError } = await createOfficeObjective(
          sec.title.trim(),
          "secondary",
          {
            description: sec.description?.trim() || null,
            parentObjectiveId: primaryId,
          }
        );
        if (secError) {
          setSubmitError(secError);
          return;
        }
        if (secData) created.push(secData);
      }
    }
    setSubmitSuccess(true);
    setManualPrimary({ title: "", description: "", goals: [] });
    setManualSecondaries([]);
    setObjectives((prev) => [...created, ...prev]);
    loadData();
  };

  const handleAddFromCatalog = async (baseId: string) => {
    setAddingFromCatalogId(baseId);
    const { data, error } = await addObjectiveFromCatalog(baseId);
    setAddingFromCatalogId(null);
    if (!error && data) {
      setObjectives((prev) => [data, ...prev]);
      loadData();
    }
  };

  const openEdit = async (obj: OfficeObjective) => {
    setEditId(obj.id);
    setEditParentId(obj.parent_objective_id ?? null);
    setEditTitle(obj.title);
    setEditDescription(obj.description ?? "");
    setEditType(obj.type);
    const { data: goals } = await getGoalsByObjectiveId(obj.id);
    setEditGoals(
      (goals ?? []).map((g) => ({
        id: g.id,
        title: g.title,
        description: g.description ?? undefined,
      }))
    );
    setEditGoalsInitialIds((goals ?? []).map((g) => g.id));
    setEditSecondaries([]);
    setEditSecondariesInitialIds([]);
    const isPrimary = !obj.parent_objective_id;
    if (isPrimary) {
      const { data: children } = await getChildObjectives(obj.id);
      if (children?.length) {
        const withGoals: EditSecondaryItem[] = [];
        for (const child of children) {
          const { data: childGoals } = await getGoalsByObjectiveId(child.id);
          const goals = (childGoals ?? []).map((g) => ({
            id: g.id,
            title: g.title,
            description: g.description ?? undefined,
          }));
          withGoals.push({
            id: child.id,
            title: child.title,
            description: child.description ?? undefined,
            goals,
            initialGoalIds: goals.map((g) => g.id as string),
          });
        }
        setEditSecondaries(withGoals);
        setEditSecondariesInitialIds(children.map((c) => c.id));
      }
    }
  };

  const handleEditSave = async () => {
    if (!editId) return;
    const title = editTitle.trim();
    if (!title) return;
    setEditSaving(true);
    const { error: updateErr } = await updateOfficeObjective(editId, {
      title,
      description: editDescription.trim() || null,
    });
    if (updateErr) {
      setEditSaving(false);
      return;
    }
    const isPrimary = editParentId === null;
    if (isPrimary) {
      const currentSecondaryIds = editSecondaries
        .filter((s) => s.id)
        .map((s) => s.id as string);
      const toDeleteSecondary = editSecondariesInitialIds.filter(
        (id) => !currentSecondaryIds.includes(id)
      );
      for (const id of toDeleteSecondary) {
        await deleteOfficeObjective(id);
      }
      for (const sec of editSecondaries) {
        if (!sec.title.trim()) continue;
        if (sec.id) {
          await updateOfficeObjective(sec.id, {
            title: sec.title.trim(),
            description: sec.description?.trim() || null,
          });
        } else {
          await createOfficeObjective(sec.title.trim(), "secondary", {
            description: sec.description?.trim() || null,
            parentObjectiveId: editId,
          });
        }
      }
    }
    const currentGoalIds = editGoals.filter((g) => g.id).map((g) => g.id as string);
    const toDelete = editGoalsInitialIds.filter((id) => !currentGoalIds.includes(id));
    for (const id of toDelete) {
      await deleteGoal(id, editId);
    }
    for (const g of editGoals) {
      if (!g.title.trim()) continue;
      if (g.id) {
        await updateGoal(g.id, editId, {
          title: g.title,
          description: g.description ?? null,
        });
      } else {
        await createGoal(editId, g.title, g.description ?? null);
      }
    }
    setEditSaving(false);
    setEditId(null);
    loadData();
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    await deleteOfficeObjective(deleteId);
    setObjectives((prev) => prev.filter((o) => o.id !== deleteId));
    setDeleteId(null);
    loadData();
  };

  const addPrimaryGoal = () =>
    setManualPrimary((p) => ({
      ...p,
      goals: [...p.goals, { title: "", description: "" }],
    }));
  const removePrimaryGoal = (i: number) =>
    setManualPrimary((p) => ({
      ...p,
      goals: p.goals.filter((_, idx) => idx !== i),
    }));
  const setPrimaryGoal = (i: number, field: "title" | "description", value: string) =>
    setManualPrimary((p) => ({
      ...p,
      goals: p.goals.map((g, idx) => (idx === i ? { ...g, [field]: value } : g)),
    }));

  const addSecondaryBlock = () =>
    setManualSecondaries((prev) => [
      ...prev,
      { title: "", description: "", goals: [] },
    ]);
  const removeSecondaryBlock = (i: number) =>
    setManualSecondaries((prev) => prev.filter((_, idx) => idx !== i));
  const setSecondaryBlock = (
    i: number,
    field: "title" | "description",
    value: string
  ) =>
    setManualSecondaries((prev) =>
      prev.map((s, idx) => (idx === i ? { ...s, [field]: value } : s))
    );
  const addSecondaryGoal = (blockIndex: number) =>
    setManualSecondaries((prev) =>
      prev.map((s, idx) =>
        idx === blockIndex
          ? { ...s, goals: [...s.goals, { title: "", description: "" }] }
          : s
      )
    );
  const removeSecondaryGoal = (blockIndex: number, goalIndex: number) =>
    setManualSecondaries((prev) =>
      prev.map((s, idx) =>
        idx === blockIndex
          ? { ...s, goals: s.goals.filter((_, gi) => gi !== goalIndex) }
          : s
      )
    );
  const setSecondaryGoal = (
    blockIndex: number,
    goalIndex: number,
    field: "title" | "description",
    value: string
  ) =>
    setManualSecondaries((prev) =>
      prev.map((s, idx) =>
        idx === blockIndex
          ? {
              ...s,
              goals: s.goals.map((g, gi) =>
                gi === goalIndex ? { ...g, [field]: value } : g
              ),
            }
          : s
      )
    );

  const addEditGoal = () =>
    setEditGoals((prev) => [...prev, { title: "", description: null }]);
  const removeEditGoal = (i: number) =>
    setEditGoals((prev) => prev.filter((_, idx) => idx !== i));
  const setEditGoal = (
    i: number,
    field: "title" | "description",
    value: string | null
  ) =>
    setEditGoals((prev) =>
      prev.map((g, idx) =>
        idx === i
          ? { ...g, [field]: field === "description" ? value ?? undefined : value }
          : g
      )
    );

  const addEditSecondary = () =>
    setEditSecondaries((prev) => [
      ...prev,
      { title: "", description: undefined, goals: [] },
    ]);
  const removeEditSecondary = (i: number) =>
    setEditSecondaries((prev) => prev.filter((_, idx) => idx !== i));
  const setEditSecondary = (
    i: number,
    field: "title" | "description",
    value: string | undefined
  ) =>
    setEditSecondaries((prev) =>
      prev.map((s, idx) =>
        idx === i ? { ...s, [field]: value ?? "" } : s
      )
    );
  const addEditSecondaryGoal = (secIndex: number) =>
    setEditSecondaries((prev) =>
      prev.map((s, idx) =>
        idx === secIndex
          ? {
              ...s,
              goals: [...s.goals, { title: "", description: null }],
            }
          : s
      )
    );
  const removeEditSecondaryGoal = (secIndex: number, goalIndex: number) =>
    setEditSecondaries((prev) =>
      prev.map((s, idx) =>
        idx === secIndex
          ? { ...s, goals: s.goals.filter((_, gi) => gi !== goalIndex) }
          : s
      )
    );
  const setEditSecondaryGoal = (
    secIndex: number,
    goalIndex: number,
    field: "title" | "description",
    value: string | null
  ) =>
    setEditSecondaries((prev) =>
      prev.map((s, idx) =>
        idx === secIndex
          ? {
              ...s,
              goals: s.goals.map((g, gi) =>
                gi === goalIndex
                  ? {
                      ...g,
                      [field]: field === "description" ? value ?? undefined : value,
                    }
                  : g
              ),
            }
          : s
      )
    );

  const primaryCount = objectives.filter((o) => o.type === "primary").length;
  const deletingPrimary =
    deleteId && objectives.find((o) => o.id === deleteId)?.type === "primary";

  const catalogOptionsToShow = baseOptions.filter(
    (base) => !objectives.some((o) => o.base_objective_id === base.id)
  );

  return (
    <PageLayout
      title="Objetivos do Escritório"
      description="Defina o objetivo primário do escritório, objetivos secundários e metas."
      icon={Target}
      backHref="/escritorio/estrategia"
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={() => setImportDialogOpen(true)}
          className="shrink-0"
        >
          <FileUp className="h-4 w-4" />
          <span className="ml-1.5">Importar Objetivos</span>
        </Button>
      }
    >
      <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-1">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-[var(--identity-primary)]" />
              <CardTitle>Cadastrar objetivo manualmente</CardTitle>
            </div>
            <CardDescription>
              O objetivo primário é essencial; você pode adicionar objetivos secundários no mesmo formato abaixo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleManualSubmit} className="space-y-6">
              <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
                <Label className="text-base font-medium">Objetivo primário</Label>
                <div>
                  <Label htmlFor="manual_primary_title" className="text-muted-foreground">Título *</Label>
                  <Input
                    id="manual_primary_title"
                    value={manualPrimary.title}
                    onChange={(e) =>
                      setManualPrimary((p) => ({ ...p, title: e.target.value }))
                    }
                    placeholder="Ex.: Reduzir tempo de ciclo dos processos"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="manual_primary_desc" className="text-muted-foreground">Descrição (opcional)</Label>
                  <Textarea
                    id="manual_primary_desc"
                    value={manualPrimary.description}
                    onChange={(e) =>
                      setManualPrimary((p) => ({ ...p, description: e.target.value }))
                    }
                    placeholder="Contexto ou detalhes"
                    className="mt-1 min-h-[80px]"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <Label className="text-muted-foreground">Objetivos secundários (opcional)</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={addSecondaryBlock}
                    >
                      <Plus className="h-4 w-4" /> Adicionar objetivo secundário
                    </Button>
                  </div>
                  {manualSecondaries.length > 0 && (
                    <ul className="mt-2 space-y-3">
                      {manualSecondaries.map((sec, blockIdx) => (
                        <li
                          key={blockIdx}
                          className="flex flex-col gap-2 rounded-md border border-border bg-background p-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 space-y-1">
                              <Input
                                value={sec.title}
                                onChange={(e) =>
                                  setSecondaryBlock(blockIdx, "title", e.target.value)
                                }
                                placeholder="Título do objetivo secundário"
                                className="h-9"
                              />
                              <Textarea
                                value={sec.description}
                                onChange={(e) =>
                                  setSecondaryBlock(blockIdx, "description", e.target.value)
                                }
                                placeholder="Descrição (opcional)"
                                rows={1}
                                className="resize-none text-sm"
                              />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 shrink-0"
                              onClick={() => removeSecondaryBlock(blockIdx)}
                              aria-label="Remover objetivo secundário"
                            >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
            )}
            <div>
              <div className="flex items-center justify-between">
                <Label className="text-muted-foreground">Metas (opcional)</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={addPrimaryGoal}
                    >
                      <Plus className="h-4 w-4" /> Adicionar meta
                    </Button>
                  </div>
                  {manualPrimary.goals.length > 0 && (
                    <ul className="mt-2 space-y-2">
                      {manualPrimary.goals.map((g, i) => (
                        <li
                          key={i}
                          className="flex gap-2 rounded-md border border-border bg-background p-2"
                        >
                          <Input
                            value={g.title}
                            onChange={(e) =>
                              setPrimaryGoal(i, "title", e.target.value)
                            }
                            placeholder="Título da meta"
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removePrimaryGoal(i)}
                            aria-label="Remover meta"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>

              {submitError && (
                <p className="text-sm text-destructive">{submitError}</p>
              )}
              {submitSuccess && (
                <p className="text-sm text-green-600 dark:text-green-400">
                  Objetivo(s) adicionado(s).
                </p>
              )}
              <Button type="submit" className="w-full">
                Salvar objetivos
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {catalogOptionsToShow.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Sugestões do catálogo</CardTitle>
            <CardDescription>
              Clique para adicionar ao seu escritório.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {catalogOptionsToShow.map((base) => (
                <Button
                  key={base.id}
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddFromCatalog(base.id)}
                  disabled={addingFromCatalogId === base.id}
                >
                  {addingFromCatalogId === base.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  <span className="ml-1">{base.title}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-[var(--identity-primary)]" />
            <div>
              <CardTitle>Meus objetivos</CardTitle>
              <CardDescription>
                {objectives.length} objetivo(s). Ordene e edite conforme necessário.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : objectives.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-muted/30 py-12 text-center">
              <Target className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                Nenhum objetivo cadastrado ainda.
              </p>
              <p className="text-sm text-muted-foreground">
                Importe um documento, use o catálogo ou cadastre manualmente acima.
              </p>
            </div>
          ) : (
            <ul className="space-y-4">
              {objectives
                .filter((o) => !o.parent_objective_id)
                .map((primary) => {
                  const secondaries = objectives.filter(
                    (o) => o.parent_objective_id === primary.id
                  );
                  return (
                    <li
                      key={primary.id}
                      className="rounded-lg border border-[var(--identity-primary)]/50 bg-[var(--identity-primary)]/5 p-4 transition-colors"
                    >
                      <div className="flex flex-col gap-4">
                        {/* Objetivo primário */}
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-foreground">
                                {primary.title}
                              </span>
                              <Badge variant="default">Primário</Badge>
                              {primary.origin === "imported" && (
                                <Badge variant="outline" className="text-xs">
                                  Importado
                                </Badge>
                              )}
                              {primary.origin === "catalog" && (
                                <Badge variant="outline" className="text-xs">
                                  Catálogo
                                </Badge>
                              )}
                            </div>
                            {primary.description && (
                              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                                {primary.description}
                              </p>
                            )}
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEdit(primary)}
                              aria-label="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteId(primary.id)}
                              className="text-destructive hover:text-destructive"
                              aria-label="Excluir"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Objetivos secundários (dentro do mesmo card) */}
                        {secondaries.length > 0 && (
                          <ul className="space-y-2 border-l-2 border-[var(--identity-primary)]/30 pl-4">
                            {secondaries.map((sec) => (
                              <li
                                key={sec.id}
                                className="rounded-md border border-border bg-card p-3 transition-colors hover:bg-accent/10"
                              >
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="text-sm font-medium text-foreground">
                                        {sec.title}
                                      </span>
                                      <Badge variant="secondary">
                                        Secundário
                                      </Badge>
                                    </div>
                                    {sec.description && (
                                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                                        {sec.description}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex shrink-0 gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => openEdit(sec)}
                                      aria-label="Editar"
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-destructive hover:text-destructive"
                                      onClick={() => setDeleteId(sec.id)}
                                      aria-label="Excluir"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}

                        {/* Metas do objetivo primário */}
                        <GoalsList objectiveId={primary.id} />
                      </div>
                    </li>
                  );
                })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!editId}
        onOpenChange={(open) => !open && setEditId(null)}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar objetivo</DialogTitle>
            <DialogDescription>
              Altere título, descrição e metas. Só pode haver um objetivo
              primário por escritório.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="edit-title">Título *</Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="edit-desc">Descrição</Label>
              <Textarea
                id="edit-desc"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="mt-1 min-h-[80px]"
              />
            </div>
            {editParentId === null && (
              <div>
                <div className="flex items-center justify-between">
                  <Label>Objetivos secundários</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={addEditSecondary}
                  >
                    <Plus className="h-4 w-4" /> Adicionar objetivo secundário
                  </Button>
                </div>
                <ul className="mt-2 space-y-3">
                  {editSecondaries.map((sec, secIdx) => (
                    <li
                      key={secIdx}
                      className="flex flex-col gap-2 rounded-md border border-border bg-muted/30 p-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 space-y-1">
                          <Input
                            value={sec.title}
                            onChange={(e) =>
                              setEditSecondary(secIdx, "title", e.target.value)
                            }
                            placeholder="Título do objetivo secundário"
                            className="h-9"
                          />
                          <Textarea
                            value={sec.description ?? ""}
                            onChange={(e) =>
                              setEditSecondary(secIdx, "description", e.target.value)
                            }
                            placeholder="Descrição (opcional)"
                            rows={1}
                            className="resize-none text-sm"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 shrink-0"
                          onClick={() => removeEditSecondary(secIdx)}
                          aria-label="Remover objetivo secundário"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div>
              <div className="flex items-center justify-between">
                <Label>Metas</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={addEditGoal}
                >
                  <Plus className="h-4 w-4" /> Adicionar meta
                </Button>
              </div>
              <ul className="mt-2 space-y-2">
                {editGoals.map((g, i) => (
                  <li
                    key={i}
                    className="flex gap-2 rounded-md border border-border p-2"
                  >
                    <Input
                      value={g.title}
                      onChange={(e) => setEditGoal(i, "title", e.target.value)}
                      placeholder="Título da meta"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeEditGoal(i)}
                      aria-label="Remover meta"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditId(null)}
            >
              Cancelar
            </Button>
            <Button onClick={handleEditSave} disabled={editSaving}>
              {editSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importar objetivos</DialogTitle>
            <DialogDescription>
              Envie um arquivo TXT ou DOCX com uma lista de objetivos (um por
              linha ou com numeração). Formatos aceitos: {ACCEPTED_EXT}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                const f = e.dataTransfer.files[0];
                if (
                  f &&
                  (f.name.toLowerCase().endsWith(".txt") ||
                    f.name.toLowerCase().endsWith(".docx"))
                )
                  setFile(f);
              }}
              className={cn(
                "rounded-lg border-2 border-dashed p-6 text-center transition-colors",
                dragActive ? "border-[var(--identity-primary)] bg-[var(--identity-primary)]/5" : "border-border"
              )}
            >
              <input
                type="file"
                accept=".txt,.docx"
                className="hidden"
                id="file-import-dialog"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <label htmlFor="file-import-dialog" className="cursor-pointer">
                <FileUp className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Solte aqui um TXT ou DOCX
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  ou clique para selecionar
                </p>
              </label>
            </div>
            {file && (
              <p className="text-sm text-foreground">
                Arquivo: <strong>{file.name}</strong>
              </p>
            )}
            {importError && (
              <p className="text-sm text-destructive">{importError}</p>
            )}
            {importSuccess !== null && (
              <p className="text-sm text-green-600 dark:text-green-400">
                {importSuccess} objetivo(s) importado(s) com sucesso.
              </p>
            )}
            <Button
              type="button"
              onClick={handleImport}
              disabled={!file || isImporting}
              className="w-full"
            >
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Importando…
                </>
              ) : (
                "Importar objetivos"
              )}
            </Button>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setImportDialogOpen(false)}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir objetivo</DialogTitle>
            <DialogDescription>
              {deletingPrimary && primaryCount <= 1
                ? "Este é o único objetivo primário. Ao excluí-lo, defina outro como primário na edição depois. Deseja realmente excluir?"
                : "Esta ação não pode ser desfeita. Deseja realmente excluir este objetivo?"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </PageLayout>
  );
}

function GoalsList({ objectiveId }: { objectiveId: string }) {
  const [goals, setGoals] = useState<OfficeObjectiveGoal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getGoalsByObjectiveId(objectiveId).then(({ data }) => {
      if (!cancelled && data) setGoals(data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [objectiveId]);

  if (loading || goals.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
      <ListChecks className="h-4 w-4 shrink-0" />
      {goals.map((g) => (
        <span
          key={g.id}
          className="rounded-md bg-muted px-2 py-0.5 text-xs"
        >
          {g.title}
        </span>
      ))}
    </div>
  );
}
