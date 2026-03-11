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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
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
  Search,
  Pencil,
  Trash2,
  ListChecks,
} from "lucide-react";
import { PageLayout } from "@/components/layout/page-layout";
import { cn } from "@/lib/utils";
import {
  getOfficeStrategicObjectives,
  createOfficeStrategicObjective,
  updateOfficeStrategicObjective,
  deleteOfficeStrategicObjective,
  type OfficeStrategicObjective,
  type ObjectiveOrigin,
} from "./actions";

const ACCEPTED_EXT = ".txt, .docx";

export default function ObjetivosEstrategicosPage() {
  const [objectives, setObjectives] = useState<OfficeStrategicObjective[]>([]);
  const [loading, setLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [filterOrigem, setFilterOrigem] = useState<ObjectiveOrigin | "">("");
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
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

  const filteredObjectives = objectives.filter((obj) => {
    const matchesSearch = obj.title.toLowerCase().includes(search.toLowerCase());
    const matchesOrigem =
      filterOrigem === "" || (obj.origin ?? "manual") === filterOrigem;
    return matchesSearch && matchesOrigem;
  });

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
    setSubmitSuccess(false);
    const title = newTitle.trim();
    if (!title) {
      setSubmitError("Título do objetivo é obrigatório.");
      return;
    }
    const { data, error } = await createOfficeStrategicObjective(title, {
      description: newDescription.trim() || null,
      origin: "manual",
    });
    if (error) {
      setSubmitError(error);
      return;
    }
    setSubmitSuccess(true);
    setNewTitle("");
    setNewDescription("");
    if (data) setObjectives((prev) => [data, ...prev]);
  };

  const handleEditSave = async () => {
    if (!editId) return;
    const title = editTitle.trim();
    if (!title) return;
    const { error } = await updateOfficeStrategicObjective(editId, {
      title,
      description: editDescription.trim() || null,
    });
    if (!error) {
      setObjectives((prev) =>
        prev.map((o) =>
          o.id === editId
            ? { ...o, title, description: editDescription.trim() || null }
            : o
        )
      );
      setEditId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    const { error } = await deleteOfficeStrategicObjective(deleteId);
    if (!error) {
      setObjectives((prev) => prev.filter((o) => o.id !== deleteId));
      setDeleteId(null);
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
      description="Importe um documento com os objetivos da empresa ou cadastre manualmente."
      icon={Target}
      backHref="/escritorio/estrategia"
    >
      <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileUp className="h-5 w-5 text-[var(--identity-primary)]" />
              <CardTitle>Importar objetivos da empresa</CardTitle>
            </div>
            <CardDescription>
              Envie um arquivo de texto (TXT) ou DOCX com uma lista de objetivos
              (um por linha ou com numeração). Formatos: {ACCEPTED_EXT}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
                if (f && (f.name.toLowerCase().endsWith(".txt") || f.name.toLowerCase().endsWith(".docx")))
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
                id="file-import"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <label htmlFor="file-import" className="cursor-pointer">
                <FileUp className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Solte aqui um TXT ou DOCX com os objetivos
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
            <button
              type="button"
              onClick={handleImport}
              disabled={!file || isImporting}
              className={cn(
                buttonVariants(),
                "w-full"
              )}
            >
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Importando…
                </>
              ) : (
                "Importar objetivos"
              )}
            </button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-[var(--identity-primary)]" />
              <CardTitle>Cadastrar objetivo manualmente</CardTitle>
            </div>
            <CardDescription>
              Adicione um objetivo à lista. Você pode combinar com os importados.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Título do objetivo *</Label>
                <Input
                  id="title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex.: Aumentar faturamento em 15%"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="desc">Descrição (opcional)</Label>
                <Textarea
                  id="desc"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Contexto ou metas associadas"
                  className="mt-1 min-h-[80px]"
                />
              </div>
              {submitError && (
                <p className="text-sm text-destructive">{submitError}</p>
              )}
              {submitSuccess && (
                <p className="text-sm text-green-600 dark:text-green-400">
                  Objetivo adicionado.
                </p>
              )}
              <button type="submit" className={cn(buttonVariants(), "w-full")}>
                Adicionar objetivo
              </button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-[var(--identity-primary)]" />
            <div>
              <CardTitle>Objetivos cadastrados</CardTitle>
              <CardDescription>
                {filteredObjectives.length} objetivo(s)
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por título..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select
              value={filterOrigem}
              onChange={(e) => setFilterOrigem(e.target.value as ObjectiveOrigin | "")}
              className="w-[160px]"
            >
              <option value="">Todos</option>
              <option value="manual">Manual</option>
              <option value="imported">Importado</option>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredObjectives.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-muted/30 py-12 text-center">
              <Target className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                Nenhum objetivo cadastrado ainda.
              </p>
              <p className="text-sm text-muted-foreground">
                Importe um documento ou cadastre manualmente acima.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {filteredObjectives.map((obj) => (
                <li
                  key={obj.id}
                  className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent/20 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">{obj.title}</p>
                    {obj.description && (
                      <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">
                        {obj.description}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1">
                      <Badge variant="secondary" className="text-xs">
                        {(obj.origin ?? "manual") === "imported"
                          ? "Importado"
                          : "Manual"}
                      </Badge>
                      {obj.source_file && (
                        <Badge variant="outline" className="text-xs">
                          {obj.source_file}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(obj)}
                      className={cn(
                        buttonVariants({ variant: "ghost", size: "icon" }),
                        "h-9 w-9"
                      )}
                      aria-label="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteId(obj.id)}
                      className={cn(
                        buttonVariants({ variant: "ghost", size: "icon" }),
                        "h-9 w-9 text-destructive hover:text-destructive"
                      )}
                      aria-label="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editId} onOpenChange={(open) => !open && setEditId(null)}>
        <DialogContent onClose={() => setEditId(null)}>
          <DialogHeader>
            <DialogTitle>Editar objetivo</DialogTitle>
            <DialogDescription>
              Altere o título e a descrição do objetivo.
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
            <button
              type="button"
              onClick={() => setEditId(null)}
              className={buttonVariants({ variant: "outline" })}
            >
              Cancelar
            </button>
            <button type="button" onClick={handleEditSave} className={buttonVariants()}>
              Salvar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent onClose={() => setDeleteId(null)}>
          <DialogHeader>
            <DialogTitle>Excluir objetivo</DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita. Deseja realmente excluir este objetivo?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setDeleteId(null)}
              className={buttonVariants({ variant: "outline" })}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleDeleteConfirm}
              className={buttonVariants({ variant: "destructive" })}
            >
              Excluir
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </PageLayout>
  );
}
