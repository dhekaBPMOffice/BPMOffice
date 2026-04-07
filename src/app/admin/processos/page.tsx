"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { buildChecklistInput } from "@/lib/processes";
import type { BaseProcess } from "@/types/database";
import {
  createBaseProcess,
  deleteBaseProcess,
  deleteBaseProcesses,
  setBaseProcessActive,
  updateBaseProcess,
  uploadBaseProcessFile,
} from "./actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageLayout } from "@/components/layout/page-layout";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClipboardList, LayoutGrid, LayoutList, Plus, Search, Trash2 } from "lucide-react";

const VIEW_STORAGE_KEY = "admin-processos-view-mode";

type ViewMode = "list" | "card";

type SortOption =
  | "sort_order"
  | "name_asc"
  | "name_desc"
  | "category_asc"
  | "created_desc"
  | "created_asc";

export default function AdminProcessosPage() {
  const [processes, setProcesses] = useState<BaseProcess[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [templateFilesToAdd, setTemplateFilesToAdd] = useState<{ file: File; label: string }[]>([]);
  const [flowchartFilesToAdd, setFlowchartFilesToAdd] = useState<File[]>([]);
  const [checklist, setChecklist] = useState("");
  const [creating, setCreating] = useState(false);

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortOption, setSortOption] = useState<SortOption>("sort_order");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const stored = localStorage.getItem(VIEW_STORAGE_KEY);
      if (stored === "list" || stored === "card") {
        setViewMode(stored);
      }
    } catch {
      /* ignore */
    }
  }, []);

  function persistViewMode(mode: ViewMode) {
    setViewMode(mode);
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, mode);
    } catch {
      /* ignore */
    }
  }

  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    processes.forEach((p) => {
      if (p.category?.trim()) set.add(p.category.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [processes]);

  const displayedProcesses = useMemo(() => {
    let list = [...processes];
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((p) => {
        const nameL = p.name.toLowerCase();
        const cat = (p.category || "").toLowerCase();
        const desc = (p.description || "").toLowerCase();
        return nameL.includes(q) || cat.includes(q) || desc.includes(q);
      });
    }
    if (statusFilter === "active") list = list.filter((p) => p.is_active);
    if (statusFilter === "inactive") list = list.filter((p) => !p.is_active);
    if (categoryFilter !== "all") {
      list = list.filter((p) => (p.category || "") === categoryFilter);
    }

    switch (sortOption) {
      case "sort_order":
        list.sort((a, b) => {
          if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
          return a.name.localeCompare(b.name, "pt-BR");
        });
        break;
      case "name_asc":
        list.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
        break;
      case "name_desc":
        list.sort((a, b) => b.name.localeCompare(a.name, "pt-BR"));
        break;
      case "category_asc":
        list.sort((a, b) => {
          const ca = (a.category || "").localeCompare(b.category || "", "pt-BR");
          if (ca !== 0) return ca;
          return a.name.localeCompare(b.name, "pt-BR");
        });
        break;
      case "created_desc":
        list.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        break;
      case "created_asc":
        list.sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        break;
      default:
        break;
    }

    return list;
  }, [processes, searchQuery, statusFilter, categoryFilter, sortOption]);

  const visibleIds = useMemo(() => displayedProcesses.map((p) => p.id), [displayedProcesses]);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllVisible() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        visibleIds.forEach((id) => next.delete(id));
      } else {
        visibleIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  async function load() {
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data, error: queryError } = await supabase
      .from("base_processes")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (queryError) {
      setError(queryError.message);
    } else {
      setProcesses((data ?? []) as BaseProcess[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreating(true);

    const result = await createBaseProcess({
      name,
      category,
      description,
      templateFiles: [],
      flowchartFiles: [],
      managementChecklist: checklist.split("\n"),
      isActive: true,
    });

    if ("error" in result && result.error) {
      setError(result.error);
      setCreating(false);
      return;
    }

    const newId = "id" in result ? result.id : null;
    const finalTemplates: { url: string; label?: string }[] = [];
    const finalFlowcharts: { url: string }[] = [];

    if (newId) {
      for (const { file, label } of templateFilesToAdd) {
        if (!file?.size) continue;
        const formData = new FormData();
        formData.set("file", file);
        formData.set("baseProcessId", newId);
        formData.set("kind", "template");
        const up = await uploadBaseProcessFile(formData);
        if ("url" in up && up.url) finalTemplates.push({ url: up.url, label: label.trim() || file.name });
      }
      for (const file of flowchartFilesToAdd) {
        if (!file?.size) continue;
        const formData = new FormData();
        formData.set("file", file);
        formData.set("baseProcessId", newId);
        formData.set("kind", "flowchart");
        const up = await uploadBaseProcessFile(formData);
        if ("url" in up && up.url) finalFlowcharts.push({ url: up.url });
      }
      if (finalTemplates.length > 0 || finalFlowcharts.length > 0) {
        await updateBaseProcess(newId, {
          name,
          category,
          description,
          templateFiles: finalTemplates,
          flowchartFiles: finalFlowcharts,
          managementChecklist: checklist.split("\n"),
          sortOrder: 0,
          isActive: true,
        });
      }
    }

    setName("");
    setCategory("");
    setDescription("");
    setTemplateFilesToAdd([]);
    setFlowchartFilesToAdd([]);
    setChecklist("");
    setShowNew(false);
    setCreating(false);
    load();
  }

  async function handleToggleActive(process: BaseProcess) {
    const willDeactivate = process.is_active;
    if (
      willDeactivate
        ? !confirm("Inativar este processo no catálogo? Ele deixa de aparecer como opção ativa para novos vínculos.")
        : !confirm("Reativar este processo no catálogo?")
    ) {
      return;
    }

    setError(null);
    const result = await setBaseProcessActive(process.id, !process.is_active);
    if ("error" in result && result.error) {
      setError(result.error);
      return;
    }

    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este processo do catálogo?")) return;

    setError(null);
    const result = await deleteBaseProcess(id);
    if ("error" in result && result.error) {
      setError(result.error);
      return;
    }

    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    load();
  }

  async function handleBulkDelete() {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    if (
      !confirm(
        `Excluir ${ids.length} processo(s) do catálogo? Esta ação não pode ser desfeita.`
      )
    ) {
      return;
    }

    setError(null);
    const result = await deleteBaseProcesses(ids);
    if ("error" in result && result.error) {
      setError(result.error);
      return;
    }

    clearSelection();
    load();
  }

  function templateSummary(process: BaseProcess) {
    if (Array.isArray(process.template_files) && process.template_files.length > 0) {
      return `${process.template_files.length} arquivo(s)`;
    }
    if (process.template_url) return "1 arquivo";
    return "Não informado";
  }

  return (
    <PageLayout
      title="Catálogo de Processos"
      description="Cadastre os processos padrão que poderão ser atribuídos aos escritórios."
      icon={ClipboardList}
      actions={
        <Button onClick={() => setShowNew((current) => !current)}>
          <Plus className="h-4 w-4" />
          Novo Processo
        </Button>
      }
    >
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {showNew && (
        <Card>
          <CardHeader>
            <CardTitle>Novo processo padrão</CardTitle>
            <CardDescription>
              Cadastre o processo com descrição, template, fluxograma e checklist sugerido.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Gestão de Portfólio de Processos"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <Input
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Ex: Governança"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Explique o objetivo do processo e quando ele deve ser utilizado."
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Arquivos de template</Label>
                <p className="text-xs text-muted-foreground">
                  Aceita todos os formatos: PDF, imagens, planilhas, documentos, etc. Adicione 1 ou mais.
                </p>
                {templateFilesToAdd.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg border p-2">
                    <Input
                      placeholder="Rótulo (opcional)"
                      value={item.label}
                      onChange={(e) =>
                        setTemplateFilesToAdd((prev) =>
                          prev.map((x, j) => (j === i ? { ...x, label: e.target.value } : x))
                        )
                      }
                      className="flex-1"
                    />
                    <span className="text-xs truncate max-w-[140px]">{item.file.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setTemplateFilesToAdd((prev) => prev.filter((_, j) => j !== i))}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                <Input
                  type="file"
                  multiple
                  accept="*/*"
                  onChange={(e) => {
                    const files = e.target.files;
                    if (!files?.length) return;
                    setTemplateFilesToAdd((prev) => [
                      ...prev,
                      ...Array.from(files).map((file) => ({ file, label: "" })),
                    ]);
                    e.target.value = "";
                  }}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Arquivos do fluxograma</Label>
                <p className="text-xs text-muted-foreground">
                  Apenas PNG ou BPM (.png, .bpm, .bpmn, .bpms). Adicione 1 ou mais.
                </p>
                {flowchartFilesToAdd.map((file, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg border p-2">
                    <span className="text-sm truncate flex-1">{file.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setFlowchartFilesToAdd((prev) => prev.filter((_, j) => j !== i))}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                <Input
                  type="file"
                  multiple
                  accept=".png,.bpm,.bpmn,.bpms"
                  onChange={(e) => {
                    const files = e.target.files;
                    if (!files?.length) return;
                    setFlowchartFilesToAdd((prev) => [...prev, ...Array.from(files)]);
                    e.target.value = "";
                  }}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="checklist">Checklist sugerido</Label>
                <Textarea
                  id="checklist"
                  value={checklist}
                  onChange={(e) => setChecklist(e.target.value)}
                  rows={5}
                  placeholder={"Uma ação por linha\nEx: Definir responsável\nEx: Publicar procedimento"}
                />
              </div>
              <div className="flex gap-2 md:col-span-2">
                <Button type="submit" disabled={creating}>
                  {creating ? "Criando..." : "Criar processo"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowNew(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="space-y-4">
          <div>
            <CardTitle>Processos cadastrados</CardTitle>
            <CardDescription>
              Clique em um processo para editar seus detalhes e a configuração operacional.
            </CardDescription>
          </div>

          <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12 lg:items-end">
            <div className="flex flex-wrap items-center gap-2 sm:col-span-2 lg:col-span-2">
              <span className="text-xs font-medium text-muted-foreground">Visualização</span>
              <div className="flex rounded-lg border border-border/60 p-0.5">
                <Button
                  type="button"
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  size="sm"
                  className="gap-1.5"
                  onClick={() => persistViewMode("list")}
                  aria-pressed={viewMode === "list"}
                >
                  <LayoutList className="h-4 w-4" />
                  Lista
                </Button>
                <Button
                  type="button"
                  variant={viewMode === "card" ? "secondary" : "ghost"}
                  size="sm"
                  className="gap-1.5"
                  onClick={() => persistViewMode("card")}
                  aria-pressed={viewMode === "card"}
                >
                  <LayoutGrid className="h-4 w-4" />
                  Cartões
                </Button>
              </div>
            </div>

            <div className="space-y-1.5 sm:col-span-2 lg:col-span-4">
              <Label htmlFor="search-processos" className="text-xs">
                Buscar
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="search-processos"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Nome, categoria ou descrição..."
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-1.5 lg:col-span-2">
              <Label htmlFor="filter-status" className="text-xs">
                Status
              </Label>
              <Select
                id="filter-status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
              >
                <option value="all">Todos</option>
                <option value="active">Ativos</option>
                <option value="inactive">Inativos</option>
              </Select>
            </div>
            <div className="space-y-1.5 lg:col-span-2">
              <Label htmlFor="filter-category" className="text-xs">
                Categoria
              </Label>
              <Select
                id="filter-category"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="all">Todas</option>
                {categoryOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-2">
              <Label htmlFor="sort-processos" className="text-xs">
                Ordenar por
              </Label>
              <Select
                id="sort-processos"
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as SortOption)}
              >
                <option value="sort_order">Ordem do catálogo</option>
                <option value="name_asc">Nome (A–Z)</option>
                <option value="name_desc">Nome (Z–A)</option>
                <option value="category_asc">Categoria (A–Z)</option>
                <option value="created_desc">Mais recentes</option>
                <option value="created_asc">Mais antigos</option>
              </Select>
            </div>
          </div>

          {viewMode === "card" && displayedProcesses.length > 0 && (
            <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={toggleSelectAllVisible}
                className="rounded border-input"
              />
              Selecionar todos os processos visíveis (após filtros)
            </label>
          )}

          {selectedIds.size > 0 && (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm">
              <span>
                {selectedIds.size} selecionado{selectedIds.size !== 1 ? "s" : ""}
              </span>
              <Button type="button" variant="destructive" size="sm" onClick={handleBulkDelete}>
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir selecionados
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={clearSelection}>
                Limpar seleção
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : processes.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="Nenhum processo cadastrado"
              description="Crie o primeiro processo padrão para começar a estruturar o onboarding dos escritórios."
            />
          ) : displayedProcesses.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              <p className="mb-3">Nenhum processo corresponde aos filtros ou à busca.</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                  setCategoryFilter("all");
                }}
              >
                Limpar filtros
              </Button>
            </div>
          ) : viewMode === "list" ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[44px]">
                    <span className="sr-only">Selecionar</span>
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleSelectAllVisible}
                      className="rounded border-input"
                      aria-label="Selecionar todos os processos visíveis"
                    />
                  </TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead className="hidden md:table-cell">Categoria</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Checklist</TableHead>
                  <TableHead className="hidden lg:table-cell">Template</TableHead>
                  <TableHead className="w-[200px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedProcesses.map((process) => (
                  <TableRow key={process.id}>
                    <TableCell className="align-middle">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(process.id)}
                        onChange={() => toggleSelect(process.id)}
                        className="rounded border-input"
                        aria-label={`Selecionar ${process.name}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex flex-col gap-0.5">
                        <span>{process.name}</span>
                        <span className="text-xs font-normal text-muted-foreground md:hidden">
                          {process.category || "Sem categoria"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      {process.category || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={process.is_active ? "success" : "secondary"}>
                        {process.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground lg:table-cell">
                      {buildChecklistInput(process.management_checklist).split("\n").filter(Boolean).length}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground lg:table-cell">
                      {templateSummary(process)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-nowrap items-center justify-end gap-2">
                        <Link
                          href={`/admin/processos/${process.id}`}
                          className={buttonVariants({ size: "sm" })}
                        >
                          Abrir
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          className="shrink-0"
                          onClick={() => handleToggleActive(process)}
                          title={process.is_active ? "Inativar processo" : "Reativar processo"}
                        >
                          {process.is_active ? "Inativar" : "Ativar"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {displayedProcesses.map((process) => (
                <Card key={process.id} className="border border-border/60">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(process.id)}
                          onChange={() => toggleSelect(process.id)}
                          className="mt-1 rounded border-input"
                          aria-label={`Selecionar ${process.name}`}
                        />
                        <div className="min-w-0">
                          <CardTitle className="text-base">{process.name}</CardTitle>
                          <CardDescription>
                            {process.category || "Sem categoria"}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant={process.is_active ? "success" : "secondary"}>
                        {process.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="line-clamp-3 text-sm text-muted-foreground">
                      {process.description || "Sem descrição cadastrada."}
                    </p>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p>
                        Checklist:{" "}
                        {buildChecklistInput(process.management_checklist).split("\n").filter(Boolean).length}
                      </p>
                      <p>Template: {templateSummary(process)}</p>
                    </div>
                    <div className="flex flex-nowrap items-center gap-2">
                      <Link
                        href={`/admin/processos/${process.id}`}
                        className={buttonVariants({ size: "sm" })}
                      >
                        Abrir
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        onClick={() => handleToggleActive(process)}
                        title={process.is_active ? "Inativar processo" : "Reativar processo"}
                      >
                        {process.is_active ? "Inativar" : "Ativar"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </PageLayout>
  );
}
