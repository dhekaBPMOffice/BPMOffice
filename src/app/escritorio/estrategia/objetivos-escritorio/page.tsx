"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
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
  Library,
} from "lucide-react";
import { PageLayout } from "@/components/layout/page-layout";
import { cn } from "@/lib/utils";
import {
  ACCEPTED_IMPORT_EXT,
  ACCEPT_IMPORT_INPUT,
  isAcceptedImportFilename,
} from "@/lib/estrategia/import-file-types";
import {
  getOfficeObjectives,
  getBaseOfficeObjectives,
  createOfficeObjective,
  addObjectiveFromCatalog,
  updateOfficeObjective,
  deleteOfficeObjective,
  getGoalsByObjectiveId,
  createGoal,
  updateGoal,
  deleteGoal,
  type OfficeObjective,
  type OfficeObjectiveGoal,
  type BaseOfficeObjective,
} from "./actions";

type EditGoalItem = { id?: string; title: string; description?: string | null };

type SortKey = "recent" | "oldest" | "title_asc" | "title_desc";

/** Estilo único para os botões da barra de ações (importar / catálogo / cadastrar). */
const ACTION_TOOLBAR_BUTTON =
  "shrink-0 border-[var(--identity-primary)]/35 bg-[var(--identity-primary)]/[0.06] text-foreground shadow-sm hover:bg-[var(--identity-primary)]/12 hover:border-[var(--identity-primary)]/50";

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
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [catalogDialogOpen, setCatalogDialogOpen] = useState(false);

  const [listSearch, setListSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("recent");

  const [manualForm, setManualForm] = useState({
    title: "",
    description: "",
    goals: [] as { title: string; description: string }[],
  });
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createSubmitting, setCreateSubmitting] = useState(false);

  const [addingFromCatalogId, setAddingFromCatalogId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editGoals, setEditGoals] = useState<EditGoalItem[]>([]);
  const [editGoalsInitialIds, setEditGoalsInitialIds] = useState<string[]>([]);
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

  const displayedObjectives = useMemo(() => {
    const q = listSearch.trim().toLowerCase();
    let list = objectives.filter(
      (o) =>
        !q ||
        o.title.toLowerCase().includes(q) ||
        (o.description?.toLowerCase().includes(q) ?? false)
    );
    list = [...list];
    switch (sortKey) {
      case "recent":
        list.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        break;
      case "oldest":
        list.sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        break;
      case "title_asc":
        list.sort((a, b) => a.title.localeCompare(b.title, "pt"));
        break;
      case "title_desc":
        list.sort((a, b) => b.title.localeCompare(a.title, "pt"));
        break;
      default:
        break;
    }
    return list;
  }, [objectives, listSearch, sortKey]);

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

  const resetCreateForm = () => {
    setManualForm({ title: "", description: "", goals: [] });
    setSubmitError(null);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    const title = manualForm.title.trim();
    if (!title) {
      setSubmitError("O título do objetivo é obrigatório.");
      return;
    }
    const goals = manualForm.goals
      .filter((g) => g.title.trim())
      .map((g) => ({ title: g.title.trim(), description: g.description?.trim() || null }));
    setCreateSubmitting(true);
    try {
      const { data, error } = await createOfficeObjective(title, {
        description: manualForm.description.trim() || null,
        goals: goals.length ? goals : undefined,
      });
      if (error) {
        setSubmitError(error);
        return;
      }
      setCreateDialogOpen(false);
      resetCreateForm();
      if (data) setObjectives((prev) => [data, ...prev]);
      loadData();
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleAddFromCatalog = async (baseId: string) => {
    setAddingFromCatalogId(baseId);
    const { data, error } = await addObjectiveFromCatalog(baseId);
    setAddingFromCatalogId(null);
    if (!error && data) {
      const merged = [data, ...objectives];
      setObjectives((prev) => [data, ...prev]);
      await loadData();
      const stillInCatalog = baseOptions.filter(
        (b) => !merged.some((o) => o.base_objective_id === b.id)
      );
      if (stillInCatalog.length === 0) setCatalogDialogOpen(false);
    }
  };

  const openEdit = async (obj: OfficeObjective) => {
    setEditId(obj.id);
    setEditTitle(obj.title);
    setEditDescription(obj.description ?? "");
    const { data: goals } = await getGoalsByObjectiveId(obj.id);
    setEditGoals(
      (goals ?? []).map((g) => ({
        id: g.id,
        title: g.title,
        description: g.description ?? undefined,
      }))
    );
    setEditGoalsInitialIds((goals ?? []).map((g) => g.id));
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

  const addManualGoal = () =>
    setManualForm((p) => ({
      ...p,
      goals: [...p.goals, { title: "", description: "" }],
    }));
  const removeManualGoal = (i: number) =>
    setManualForm((p) => ({
      ...p,
      goals: p.goals.filter((_, idx) => idx !== i),
    }));
  const setManualGoal = (i: number, field: "title" | "description", value: string) =>
    setManualForm((p) => ({
      ...p,
      goals: p.goals.map((g, idx) => (idx === i ? { ...g, [field]: value } : g)),
    }));

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

  const catalogOptionsToShow = baseOptions.filter(
    (base) => !objectives.some((o) => o.base_objective_id === base.id)
  );

  const listEmptyFiltered =
    objectives.length > 0 && displayedObjectives.length === 0;

  return (
    <PageLayout
      title="Objetivos do Escritório"
      description="Visualize a lista abaixo; use os botões ao lado para importar, escolher do catálogo ou cadastrar manualmente."
      icon={Target}
      backHref="/escritorio/estrategia"
      actions={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="default"
            onClick={() => {
              setImportError(null);
              setImportSuccess(null);
              setImportDialogOpen(true);
            }}
            className={ACTION_TOOLBAR_BUTTON}
          >
            <FileUp className="h-4 w-4 text-[var(--identity-primary)]" />
            Importar Objetivos
          </Button>
          {catalogOptionsToShow.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="default"
              onClick={() => setCatalogDialogOpen(true)}
              className={ACTION_TOOLBAR_BUTTON}
            >
              <Library className="h-4 w-4 text-[var(--identity-primary)]" />
              Sugestões do Catálogo
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="default"
            onClick={() => {
              resetCreateForm();
              setCreateDialogOpen(true);
            }}
            className={ACTION_TOOLBAR_BUTTON}
          >
            <Plus className="h-4 w-4 text-[var(--identity-primary)]" />
            Cadastrar Objetivo
          </Button>
        </div>
      }
    >
      <div className="space-y-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-[var(--identity-primary)]" />
              <div>
                <CardTitle>Meus objetivos</CardTitle>
                <CardDescription>
                  {objectives.length} objetivo(s). Filtre, ordene e edite conforme necessário.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {objectives.length > 0 && (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="obj-search">Filtrar</Label>
                  <Input
                    id="obj-search"
                    value={listSearch}
                    onChange={(e) => setListSearch(e.target.value)}
                    placeholder="Buscar por título ou descrição…"
                    className="max-w-md"
                  />
                </div>
                <div className="w-full space-y-1.5 sm:w-56">
                  <Label htmlFor="obj-sort">Ordenar</Label>
                  <Select
                    id="obj-sort"
                    value={sortKey}
                    onChange={(e) => setSortKey(e.target.value as SortKey)}
                  >
                    <option value="recent">Mais recentes</option>
                    <option value="oldest">Mais antigos</option>
                    <option value="title_asc">Título (A–Z)</option>
                    <option value="title_desc">Título (Z–A)</option>
                  </Select>
                </div>
              </div>
            )}
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
                  Use os botões no topo: Cadastrar Objetivo, Importar Objetivos
                  {catalogOptionsToShow.length > 0 ? " ou Sugestões do Catálogo" : ""}.
                </p>
              </div>
            ) : listEmptyFiltered ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/30 py-8 text-center text-sm text-muted-foreground">
                Nenhum objetivo corresponde à busca.
              </div>
            ) : (
              <ul className="space-y-4">
                {displayedObjectives.map((obj) => (
                  <li
                    key={obj.id}
                    className="rounded-lg border border-[var(--identity-primary)]/50 bg-[var(--identity-primary)]/5 p-4 transition-colors"
                  >
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <span className="font-medium text-foreground">
                            {obj.title}
                          </span>
                          {obj.description && (
                            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                              {obj.description}
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(obj)}
                            aria-label="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(obj.id)}
                            className="text-destructive hover:text-destructive"
                            aria-label="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <GoalsList objectiveId={obj.id} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Dialog
          open={createDialogOpen}
          onOpenChange={(open) => {
            setCreateDialogOpen(open);
            if (!open) resetCreateForm();
          }}
        >
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Cadastrar objetivo</DialogTitle>
              <DialogDescription>
                Informe título, descrição opcional e metas opcionais.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleManualSubmit} className="space-y-4 py-2">
              <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
                <div>
                  <Label htmlFor="manual_title" className="text-muted-foreground">
                    Título *
                  </Label>
                  <Input
                    id="manual_title"
                    value={manualForm.title}
                    onChange={(e) =>
                      setManualForm((p) => ({ ...p, title: e.target.value }))
                    }
                    placeholder="Ex.: Reduzir tempo de ciclo dos processos"
                    className="mt-1"
                    autoFocus
                  />
                </div>
                <div>
                  <Label htmlFor="manual_desc" className="text-muted-foreground">
                    Descrição (opcional)
                  </Label>
                  <Textarea
                    id="manual_desc"
                    value={manualForm.description}
                    onChange={(e) =>
                      setManualForm((p) => ({ ...p, description: e.target.value }))
                    }
                    placeholder="Contexto ou detalhes"
                    className="mt-1 min-h-[80px]"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <Label className="text-muted-foreground">Metas (opcional)</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={addManualGoal}
                    >
                      <Plus className="h-4 w-4" /> Adicionar meta
                    </Button>
                  </div>
                  {manualForm.goals.length > 0 && (
                    <ul className="mt-2 space-y-2">
                      {manualForm.goals.map((g, i) => (
                        <li
                          key={i}
                          className="flex gap-2 rounded-md border border-border bg-background p-2"
                        >
                          <Input
                            value={g.title}
                            onChange={(e) =>
                              setManualGoal(i, "title", e.target.value)
                            }
                            placeholder="Título da meta"
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeManualGoal(i)}
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
              {submitError && (
                <p className="text-sm text-destructive">{submitError}</p>
              )}
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={createSubmitting}>
                  {createSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : null}
                  Salvar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={catalogDialogOpen} onOpenChange={setCatalogDialogOpen}>
          <DialogContent className="max-h-[85vh] min-w-0 max-w-lg overflow-y-auto overflow-x-hidden sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Sugestões do Catálogo</DialogTitle>
              <DialogDescription>
                Opções pré-definidas pelo administrador. Clique para adicionar ao seu escritório.
              </DialogDescription>
            </DialogHeader>
            <div className="flex min-w-0 w-full flex-col gap-2 py-2">
              {catalogOptionsToShow.map((base) => (
                <Button
                  key={base.id}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddFromCatalog(base.id)}
                  disabled={addingFromCatalogId === base.id}
                  className="h-auto min-h-10 w-full min-w-0 justify-start gap-2 whitespace-normal py-2.5 text-left font-normal"
                >
                  <span className="shrink-0">
                    {addingFromCatalogId === base.id ? (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[var(--identity-primary)]" />
                    ) : (
                      <Plus className="h-4 w-4 shrink-0 text-[var(--identity-primary)]" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1 break-words text-left leading-snug">
                    {base.title}
                  </span>
                </Button>
              ))}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCatalogDialogOpen(false)}
              >
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!editId} onOpenChange={(open) => !open && setEditId(null)}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar objetivo</DialogTitle>
              <DialogDescription>
                Altere o título, a descrição e as metas deste objetivo.
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
              <Button variant="outline" onClick={() => setEditId(null)}>
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

        <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Importar Objetivos</DialogTitle>
              <DialogDescription>
                Envie TXT, DOCX ou planilha Excel: um objetivo por linha (ou por
                célula na coluna A da primeira aba). Formatos: {ACCEPTED_IMPORT_EXT}
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
                  if (f && isAcceptedImportFilename(f.name)) setFile(f);
                }}
                className={cn(
                  "rounded-lg border-2 border-dashed p-6 text-center transition-colors",
                  dragActive
                    ? "border-[var(--identity-primary)] bg-[var(--identity-primary)]/5"
                    : "border-border"
                )}
              >
                <input
                  type="file"
                  accept={ACCEPT_IMPORT_INPUT}
                  className="hidden"
                  id="file-import-dialog"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                <label htmlFor="file-import-dialog" className="cursor-pointer">
                  <FileUp className="mx-auto h-10 w-10 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Solte aqui TXT, DOCX ou Excel
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
                  "Importar Objetivos"
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

        <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Excluir objetivo</DialogTitle>
              <DialogDescription>
                Esta ação não pode ser desfeita. As metas associadas a este objetivo
                também serão removidas. Deseja realmente excluir?
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
