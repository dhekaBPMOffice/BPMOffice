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
} from "lucide-react";
import { PageLayout } from "@/components/layout/page-layout";
import { cn } from "@/lib/utils";
import {
  ACCEPTED_IMPORT_EXT,
  ACCEPT_IMPORT_INPUT,
  isAcceptedImportFilename,
} from "@/lib/estrategia/import-file-types";
import {
  getOfficeStrategicObjectives,
  createOfficeStrategicObjective,
  updateOfficeStrategicObjective,
  deleteOfficeStrategicObjective,
  type OfficeStrategicObjective,
} from "./actions";

type SortKey = "recent" | "oldest" | "title_asc" | "title_desc";

const ACTION_TOOLBAR_BUTTON =
  "shrink-0 border-[var(--identity-primary)]/35 bg-[var(--identity-primary)]/[0.06] text-foreground shadow-sm hover:bg-[var(--identity-primary)]/12 hover:border-[var(--identity-primary)]/50";

export default function ObjetivosEstrategicosPage() {
  const [objectives, setObjectives] = useState<OfficeStrategicObjective[]>([]);
  const [loading, setLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<number | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const [listSearch, setListSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("recent");

  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createSubmitting, setCreateSubmitting] = useState(false);

  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const loadObjectives = useCallback(async () => {
    setLoading(true);
    const { data, error } = await getOfficeStrategicObjectives();
    setLoading(false);
    if (error) return;
    setObjectives(data ?? []);
  }, []);

  useEffect(() => {
    loadObjectives();
  }, [loadObjectives]);

  const displayedObjectives = useMemo(() => {
    const q = listSearch.trim().toLowerCase();
    let list = objectives.filter((obj) => {
      if (!q) return true;
      return (
        obj.title.toLowerCase().includes(q) ||
        (obj.description?.toLowerCase().includes(q) ?? false)
      );
    });
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

  const listEmptyFiltered =
    objectives.length > 0 && displayedObjectives.length === 0;

  const resetCreateForm = () => {
    setNewTitle("");
    setNewDescription("");
    setSubmitError(null);
  };

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
      const res = await fetch("/api/estrategia/objetivos/import", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) {
        setImportError(
          (json.error ?? "Falha ao importar.") +
            (json.detail ? ` Detalhe: ${json.detail}` : "")
        );
        return;
      }
      setImportSuccess(json.count ?? 0);
      setFile(null);
      setImportDialogOpen(false);
      await loadObjectives();
    } catch {
      setImportError("Erro de conexão ao importar.");
    } finally {
      setIsImporting(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    const title = newTitle.trim();
    if (!title) {
      setSubmitError("Título do objetivo é obrigatório.");
      return;
    }
    setCreateSubmitting(true);
    try {
      const { data, error } = await createOfficeStrategicObjective(title, {
        description: newDescription.trim() || null,
        origin: "manual",
      });
      if (error) {
        setSubmitError(error);
        return;
      }
      setCreateDialogOpen(false);
      resetCreateForm();
      if (data) setObjectives((prev) => [data, ...prev]);
      loadObjectives();
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleEditSave = async () => {
    if (!editId) return;
    const title = editTitle.trim();
    if (!title) return;
    setEditSaving(true);
    const { error } = await updateOfficeStrategicObjective(editId, {
      title,
      description: editDescription.trim() || null,
    });
    setEditSaving(false);
    if (!error) {
      setObjectives((prev) =>
        prev.map((o) =>
          o.id === editId
            ? { ...o, title, description: editDescription.trim() || null }
            : o
        )
      );
      setEditId(null);
      loadObjectives();
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    const { error } = await deleteOfficeStrategicObjective(deleteId);
    if (!error) {
      setObjectives((prev) => prev.filter((o) => o.id !== deleteId));
      setDeleteId(null);
      loadObjectives();
    }
  };

  const openEdit = (obj: OfficeStrategicObjective) => {
    setEditId(obj.id);
    setEditTitle(obj.title);
    setEditDescription(obj.description ?? "");
  };

  return (
    <PageLayout
      title="Objetivos Estratégicos"
      description="Visualize e organize os objetivos; use os botões ao lado para cadastrar ou importar."
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
                <CardTitle>Meus objetivos estratégicos</CardTitle>
                <CardDescription>
                  {objectives.length} objetivo(s). Filtre, ordene e edite conforme necessário.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {objectives.length > 0 && (
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                <div className="min-w-0 flex-1 space-y-1.5">
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
                  Use &quot;Cadastrar Objetivo&quot; ou &quot;Importar Objetivos&quot; no topo da página.
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
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground">{obj.title}</p>
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
                Informe título e descrição opcional. O objetivo fica associado ao seu escritório.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleManualSubmit} className="space-y-4 py-2">
              <div>
                <Label htmlFor="create-title">Título *</Label>
                <Input
                  id="create-title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex.: Aumentar faturamento em 15%"
                  className="mt-1"
                  autoFocus
                />
              </div>
              <div>
                <Label htmlFor="create-desc">Descrição (opcional)</Label>
                <Textarea
                  id="create-desc"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Contexto ou detalhes"
                  className="mt-1 min-h-[88px]"
                />
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

        <Dialog open={!!editId} onOpenChange={(open) => !open && setEditId(null)}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar objetivo</DialogTitle>
              <DialogDescription>
                Altere o título e a descrição do objetivo estratégico.
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

        <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Excluir objetivo</DialogTitle>
              <DialogDescription>
                Esta ação não pode ser desfeita. Deseja realmente excluir este objetivo?
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
