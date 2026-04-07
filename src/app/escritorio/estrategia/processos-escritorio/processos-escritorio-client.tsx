"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardList,
  LayoutGrid,
  Link2,
  List,
  Loader2,
  Package,
  PlusCircle,
  Trash2,
  BarChart3,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { PageLayout } from "@/components/layout/page-layout";
import { cn } from "@/lib/utils";
import { BPM_PHASE_LABELS, BPM_PHASE_SLUGS } from "@/lib/bpm-phases";
import {
  addManualOfficeProcessesBulk,
  deleteOfficeProcessesBulk,
} from "@/app/escritorio/processos/actions";
import { AddProcessButton } from "@/app/escritorio/processos/catalogo/add-process-button";
import type { GestaoProcessItem, GestaoProcessosTabProps } from "../cadeia-valor/gestao-processos-tab";
import type { CatalogoItem } from "./page";

const STATUS_OPTIONS = [
  { value: "", label: "Todos os estados" },
  { value: "not_started", label: "Não iniciado" },
  { value: "in_progress", label: "Em andamento" },
  { value: "completed", label: "Concluído" },
  { value: "archived", label: "Arquivado" },
];

const TIPO_OPTIONS = [
  { value: "", label: "Todos os tipos" },
  { value: "primario", label: "Primário" },
  { value: "gerencial", label: "Gerencial" },
  { value: "apoio", label: "Apoio" },
];

const SORT_OPTIONS = [
  { value: "name_asc", label: "Nome (A–Z)" },
  { value: "name_desc", label: "Nome (Z–A)" },
];

function uniqueSorted(values: (string | null | undefined)[]): string[] {
  const set = new Set<string>();
  for (const v of values) {
    const t = v?.trim();
    if (t) set.add(t);
  }
  return [...set].sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));
}

type ProcessosEscritorioClientProps = {
  gestaoProps: GestaoProcessosTabProps;
  catalogItems: CatalogoItem[];
};

export function ProcessosEscritorioClient({
  gestaoProps,
  catalogItems,
}: ProcessosEscritorioClientProps) {
  return <ProcessosTab {...gestaoProps} catalogItems={catalogItems} />;
}

/* ─── Conteúdo principal ─────────────────────────────────────────── */

function ProcessosTab({
  items,
  stats,
  catalogItems,
}: GestaoProcessosTabProps & { catalogItems: CatalogoItem[] }) {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [fase, setFase] = useState("");
  const [tipo, setTipo] = useState("");
  const [status, setStatus] = useState("");
  const [n1, setN1] = useState("");
  const [n2, setN2] = useState("");
  const [n3, setN3] = useState("");
  const [sort, setSort] = useState("name_asc");
  const [vista, setVista] = useState<"lista" | "grade">("lista");

  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [catalogDialogOpen, setCatalogDialogOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const selectAllRef = useRef<HTMLInputElement>(null);
  const liveRef = useRef<HTMLDivElement>(null);

  const n1Options = useMemo(() => uniqueSorted(items.map((i) => i.vcLevel1)), [items]);
  const n2Options = useMemo(() => {
    const filtered = n1 ? items.filter((i) => (i.vcLevel1 ?? "").trim() === n1.trim()) : items;
    return uniqueSorted(filtered.map((i) => i.vcLevel2));
  }, [items, n1]);
  const n3Options = useMemo(() => {
    let filtered = items;
    if (n1) filtered = filtered.filter((i) => (i.vcLevel1 ?? "").trim() === n1.trim());
    if (n2) filtered = filtered.filter((i) => (i.vcLevel2 ?? "").trim() === n2.trim());
    return uniqueSorted(filtered.map((i) => i.vcLevel3));
  }, [items, n1, n2]);

  const filteredItems = useMemo(() => {
    let out = items;
    const q = search.trim().toLowerCase();
    if (q) {
      out = out.filter(
        (i) =>
          (i.name ?? "").toLowerCase().includes(q) ||
          (i.description ?? "").toLowerCase().includes(q)
      );
    }
    if (status) out = out.filter((i) => i.statusRaw === status);
    if (tipo) out = out.filter((i) => i.vcProcessType === tipo);
    if (fase) out = out.filter((i) => i.faseBpmSlug === fase);
    if (n1) out = out.filter((i) => (i.vcLevel1 ?? "").trim() === n1.trim());
    if (n2) out = out.filter((i) => (i.vcLevel2 ?? "").trim() === n2.trim());
    if (n3) out = out.filter((i) => (i.vcLevel3 ?? "").trim() === n3.trim());

    const copy = [...out];
    copy.sort((a, b) => {
      const cmp = (a.name ?? "").localeCompare(b.name ?? "", "pt-BR", { sensitivity: "base" });
      return sort === "name_desc" ? -cmp : cmp;
    });
    return copy;
  }, [items, search, status, tipo, fase, n1, n2, n3, sort]);

  const ids = useMemo(() => filteredItems.map((i) => i.id), [filteredItems]);
  const allSelected = ids.length > 0 && ids.every((id) => selected.has(id));
  const someSelected = ids.some((id) => selected.has(id));

  useEffect(() => {
    const el = selectAllRef.current;
    if (el) el.indeterminate = someSelected && !allSelected;
  }, [someSelected, allSelected]);

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelected((prev) => {
      if (ids.every((id) => prev.has(id))) return new Set();
      return new Set(ids);
    });
  }, [ids]);

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  const copyLinks = useCallback(async () => {
    const base = typeof window !== "undefined" ? window.location.origin : "";
    const lines = [...selected].map((id) => `${base}/escritorio/processos/${id}`);
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
    } catch {
      /* ignore */
    }
  }, [selected]);

  async function confirmDelete() {
    const idsToDelete = [...selected];
    setDeleteError(null);
    setIsDeleting(true);
    try {
      const result = await deleteOfficeProcessesBulk(idsToDelete);
      if (result && "error" in result) {
        setDeleteError(result.error ?? "Erro desconhecido.");
        return;
      }
      setDeleteDialogOpen(false);
      setSelected(new Set());
      router.refresh();
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "Erro ao eliminar.");
    } finally {
      setIsDeleting(false);
    }
  }

  const hasActiveFilters = !!search.trim() || !!fase || !!tipo || !!status || !!n1 || !!n2 || !!n3;

  function clearFilters() {
    setSearch("");
    setFase("");
    setTipo("");
    setStatus("");
    setN1("");
    setN2("");
    setN3("");
  }

  return (
    <PageLayout
      title="Processos do Escritório"
      description="Processos vindos do formulário de ativação ou adicionados pelo catálogo complementar. Gerencie, filtre ou acesse a gestão individual de cada processo."
      icon={ClipboardList}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/escritorio/processos/visao-geral"
            className={buttonVariants({ variant: "outline" })}
          >
            <BarChart3 className="h-4 w-4" />
            Visão geral
          </Link>
          <Button
            type="button"
            variant="secondary"
            className="border border-border/80 bg-secondary font-medium text-secondary-foreground shadow-sm hover:bg-secondary/90"
            onClick={() => setCatalogDialogOpen(true)}
          >
            <Package className="mr-2 h-4 w-4" />
            Catálogo complementar
          </Button>
        </div>
      }
    >
      {/* Filtros */}
      <div className="space-y-4 rounded-xl border-2 border-border bg-card p-4 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="pe-q">Pesquisar</Label>
            <Input
              id="pe-q"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nome ou descrição…"
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pe-fase">Fase BPM (atual)</Label>
            <Select id="pe-fase" value={fase} onChange={(e) => setFase(e.target.value)}>
              <option value="">Todas as fases</option>
              {BPM_PHASE_SLUGS.map((slug) => (
                <option key={slug} value={slug}>
                  {BPM_PHASE_LABELS[slug]}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pe-tipo">Tipo (cadeia)</Label>
            <Select id="pe-tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
              {TIPO_OPTIONS.map((o) => (
                <option key={o.value || "all"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pe-n1">Nível 1</Label>
            <Select
              id="pe-n1"
              value={n1}
              onChange={(e) => {
                setN1(e.target.value);
                setN2("");
                setN3("");
              }}
            >
              <option value="">Todos</option>
              {n1Options.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pe-n2">Nível 2</Label>
            <Select
              id="pe-n2"
              value={n2}
              onChange={(e) => {
                setN2(e.target.value);
                setN3("");
              }}
              disabled={n2Options.length === 0}
            >
              <option value="">Todos</option>
              {n2Options.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pe-n3">Nível 3</Label>
            <Select
              id="pe-n3"
              value={n3}
              onChange={(e) => setN3(e.target.value)}
              disabled={n3Options.length === 0}
            >
              <option value="">Todos</option>
              {n3Options.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pe-status">Estado do processo</Label>
            <Select id="pe-status" value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value || "all"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pe-ordenar">Ordenar por</Label>
            <Select id="pe-ordenar" value={sort} onChange={(e) => setSort(e.target.value)}>
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" onClick={clearFilters}>
              Limpar filtros
            </Button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Processos (filtro)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{filteredItems.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Em andamento</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{stats.inProgress}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Concluídos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{stats.completed}</p>
          </CardContent>
        </Card>
      </div>

      {/* Portfólio */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Processos do escritório</CardTitle>
          <CardDescription>
            Incluídos pelo formulário de ativação ou pelo catálogo. Cada processo possui uma área própria de gestão com checklist, anexos e histórico.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredItems.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="Nenhum processo encontrado"
              description={
                hasActiveFilters
                  ? "Ajuste os filtros acima para encontrar processos."
                  : "Nenhum processo do catálogo foi adicionado ainda (ative o escritório ou adicione pelo catálogo)."
              }
              action={
                hasActiveFilters ? (
                  <Button variant="outline" onClick={clearFilters}>
                    Limpar filtros
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="space-y-4">
              {/* View toggle */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div
                    className="inline-flex rounded-lg border border-border/60 p-0.5"
                    role="group"
                    aria-label="Modo de visualização"
                  >
                    <button
                      type="button"
                      onClick={() => setVista("lista")}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                        vista === "lista"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <List className="h-4 w-4" aria-hidden />
                      Lista
                    </button>
                    <button
                      type="button"
                      onClick={() => setVista("grade")}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                        vista === "grade"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <LayoutGrid className="h-4 w-4" aria-hidden />
                      Grade
                    </button>
                  </div>
                </div>
              </div>

              {vista === "lista" ? (
                <div className="rounded-lg border border-border/60">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[44px]">
                          <span className="sr-only">Selecionar</span>
                          <input
                            ref={selectAllRef}
                            type="checkbox"
                            checked={allSelected}
                            onChange={toggleAll}
                            disabled={ids.length === 0}
                            className="h-4 w-4 rounded border-input"
                            aria-label="Selecionar todos os processos visíveis"
                          />
                        </TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Níveis</TableHead>
                        <TableHead>Fase BPM</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Responsável</TableHead>
                        <TableHead className="w-[140px]">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.map((row) => (
                        <TableRow
                          key={row.id}
                          data-state={selected.has(row.id) ? "selected" : undefined}
                        >
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selected.has(row.id)}
                              onChange={() => toggle(row.id)}
                              className="h-4 w-4 rounded border-input"
                              aria-label={`Selecionar ${row.name}`}
                            />
                          </TableCell>
                          <TableCell className="max-w-[220px]">
                            <div className="font-medium leading-snug">{row.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {row.category || "—"}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{row.tipoLabel ?? "—"}</TableCell>
                          <TableCell className="max-w-[200px] text-sm text-muted-foreground">
                            {row.nivelLabel ?? "—"}
                          </TableCell>
                          <TableCell className="text-sm">{row.faseBpmLabel}</TableCell>
                          <TableCell>
                            <Badge variant={row.statusVariant}>{row.statusLabel}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">{row.ownerName ?? "—"}</TableCell>
                          <TableCell>
                            <Link
                              href={`/escritorio/processos/${row.id}`}
                              className={buttonVariants({ size: "sm", variant: "default" })}
                            >
                              Gerir
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {filteredItems.map((process) => (
                    <Card
                      key={process.id}
                      className={cn(
                        "relative border border-border/60",
                        selected.has(process.id) && "ring-2 ring-primary/40"
                      )}
                    >
                      <div className="absolute left-3 top-3 z-10">
                        <input
                          type="checkbox"
                          checked={selected.has(process.id)}
                          onChange={() => toggle(process.id)}
                          className="h-4 w-4 rounded border-input bg-background"
                          aria-label={`Selecionar ${process.name}`}
                        />
                      </div>
                      <CardHeader className="pb-3 pl-10">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <CardTitle className="text-base">{process.name}</CardTitle>
                            <CardDescription>
                              {process.category || "Sem categoria"}
                            </CardDescription>
                          </div>
                          <Badge variant={process.statusVariant}>{process.statusLabel}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline">{process.origemLabel}</Badge>
                          <span>Fase BPM: {process.faseBpmLabel}</span>
                        </div>
                        {(process.tipoLabel || process.nivelLabel) && (
                          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                            {process.tipoLabel ? (
                              <span>
                                Tipo:{" "}
                                <span className="text-foreground">{process.tipoLabel}</span>
                              </span>
                            ) : null}
                            {process.nivelLabel ? (
                              <span className="line-clamp-2">Níveis: {process.nivelLabel}</span>
                            ) : null}
                          </div>
                        )}
                        <p className="line-clamp-3 text-sm text-muted-foreground">
                          {process.description || "Sem descrição cadastrada."}
                        </p>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <p>Responsável: {process.ownerName || "Não definido"}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/escritorio/processos/${process.id}`}
                            className={buttonVariants({ size: "sm" })}
                          >
                            Gerir processo
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Barra de seleção flutuante */}
      <div
        className={cn(
          "fixed bottom-4 left-1/2 z-50 flex max-w-[min(100%-2rem,42rem)] -translate-x-1/2 flex-wrap items-center gap-3 rounded-lg border border-border/60 bg-background/95 px-4 py-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80",
          selected.size === 0 && "hidden"
        )}
        role="status"
        aria-live="polite"
        ref={liveRef}
        tabIndex={-1}
      >
        <span className="text-sm font-medium">{selected.size} processo(s) selecionado(s)</span>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={buttonVariants({ size: "sm" })} onClick={copyLinks}>
            <Link2 className="mr-1.5 h-4 w-4" aria-hidden />
            Copiar links
          </button>
          <button
            type="button"
            className={buttonVariants({ variant: "destructive", size: "sm" })}
            onClick={() => {
              setDeleteError(null);
              setDeleteDialogOpen(true);
            }}
          >
            <Trash2 className="mr-1.5 h-4 w-4" aria-hidden />
            Excluir selecionados
          </button>
          <button
            type="button"
            className={buttonVariants({ variant: "outline", size: "sm" })}
            onClick={clearSelection}
          >
            Limpar seleção
          </button>
        </div>
      </div>

      {/* Dialog de exclusão em massa */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir {selected.size} processo(s)?</DialogTitle>
            <DialogDescription>
              Esta ação é irreversível. Todos os dados associados (checklist, anexos, histórico) dos
              processos selecionados serão removidos permanentemente.
            </DialogDescription>
          </DialogHeader>
          {deleteError ? <p className="text-sm text-destructive">{deleteError}</p> : null}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting}>
              {isDeleting ? "Excluindo…" : "Sim, excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CatalogoDialog
        open={catalogDialogOpen}
        onOpenChange={setCatalogDialogOpen}
        items={catalogItems}
      />
    </PageLayout>
  );
}

function CatalogoDialog({
  open,
  onOpenChange,
  items,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CatalogoItem[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setSelected(new Set());
      setBulkError(null);
    }
  }, [open]);

  const ids = useMemo(() => items.map((i) => i.id), [items]);
  const allSelected = ids.length > 0 && ids.every((id) => selected.has(id));
  const someSelected = ids.some((id) => selected.has(id));

  useEffect(() => {
    const el = selectAllRef.current;
    if (el) el.indeterminate = someSelected && !allSelected;
  }, [someSelected, allSelected]);

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelected((prev) => {
      if (ids.every((id) => prev.has(id))) return new Set();
      return new Set(ids);
    });
  }, [ids]);

  async function handleBulkAdd() {
    if (selected.size === 0) return;
    setBulkLoading(true);
    setBulkError(null);
    try {
      const result = await addManualOfficeProcessesBulk([...selected]);
      if (result && "error" in result && result.error) {
        setBulkError(result.error);
        return;
      }
      onOpenChange(false);
      router.refresh();
    } catch (e) {
      setBulkError(e instanceof Error ? e.message : "Erro ao adicionar processos.");
    } finally {
      setBulkLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} containerClassName="max-h-[min(92vh,56rem)] w-full max-w-[min(96rem,calc(100vw-1.5rem))]">
      <DialogContent className="flex max-h-[min(90vh,54rem)] flex-col gap-0 overflow-hidden p-0 sm:max-h-[min(90vh,54rem)]">
        <div className="shrink-0 border-b border-border/60 px-6 pb-4 pt-6 pr-14">
          <DialogHeader className="mb-0 text-left">
            <DialogTitle className="text-xl">Catálogo complementar</DialogTitle>
            <DialogDescription>
              Selecione um ou vários processos e adicione todos de uma vez, ou use &quot;Adicionar à
              lista&quot; em cada cartão.
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {items.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="Todos os processos já foram selecionados"
              description="O escritório já possui todos os processos ativos do catálogo padrão."
            />
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5">
                <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium">
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-input"
                    aria-label="Selecionar todos os processos do catálogo"
                  />
                  Selecionar todos
                </label>
                <span className="text-sm text-muted-foreground">
                  {selected.size} de {items.length} selecionado(s)
                </span>
              </div>
              <div className="grid items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {items.map((process) => (
                  <Card
                    key={process.id}
                    className={cn(
                      "relative flex h-full min-h-0 flex-col overflow-hidden border border-border/60 bg-card",
                      selected.has(process.id) && "ring-2 ring-primary/35"
                    )}
                  >
                    <div className="absolute left-3 top-3 z-10">
                      <input
                        type="checkbox"
                        checked={selected.has(process.id)}
                        onChange={() => toggle(process.id)}
                        className="h-4 w-4 rounded border-input bg-background"
                        aria-label={`Selecionar ${process.name}`}
                      />
                    </div>
                    <CardHeader className="shrink-0 pb-3 pl-10">
                      <CardTitle className="text-base leading-snug">{process.name}</CardTitle>
                      <CardDescription>{process.category || "Sem categoria"}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex min-h-0 flex-1 flex-col gap-4 pt-0">
                      {process.flowchartFiles.length > 0 ? (
                        <div className="shrink-0 space-y-2">
                          {process.flowchartFiles.slice(0, 2).map((ff, i) =>
                            /\.(png|jpe?g|gif|webp)$/i.test(ff.url) ? (
                              <img
                                key={i}
                                src={ff.url}
                                alt={`Fluxograma ${i + 1}`}
                                className="h-44 w-full rounded-lg border object-contain"
                              />
                            ) : (
                              <a
                                key={i}
                                href={ff.url}
                                download
                                className={buttonVariants({ variant: "outline", size: "sm" })}
                              >
                                Baixar fluxograma{process.flowchartFiles.length > 1 ? ` ${i + 1}` : ""}
                              </a>
                            )
                          )}
                        </div>
                      ) : null}
                      <div className="min-h-0 flex-1">
                        <p className="line-clamp-4 text-sm text-muted-foreground">
                          {process.description || "Sem descrição cadastrada."}
                        </p>
                      </div>
                      <div className="mt-auto flex shrink-0 flex-wrap gap-2 border-t border-border/40 pt-3">
                        <AddProcessButton baseProcessId={process.id} />
                        {process.templateFiles.map((tf, i) => (
                          <a
                            key={i}
                            href={tf.url}
                            target="_blank"
                            rel="noreferrer"
                            download
                            className={buttonVariants({ variant: "outline", size: "sm" })}
                          >
                            {tf.label ||
                              `Baixar template${process.templateFiles.length > 1 ? ` ${i + 1}` : ""}`}
                          </a>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
        <DialogFooter className="shrink-0 flex-col items-stretch gap-3 border-t border-border/60 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          {bulkError ? (
            <p className="w-full text-sm text-destructive sm:order-first sm:flex-1">{bulkError}</p>
          ) : null}
          <div className="flex w-full flex-wrap justify-end gap-2 sm:w-auto">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
            <Button
              type="button"
              disabled={selected.size === 0 || bulkLoading || items.length === 0}
              onClick={handleBulkAdd}
            >
              {bulkLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <PlusCircle className="mr-2 h-4 w-4" />
              )}
              {bulkLoading
                ? "Adicionando…"
                : selected.size > 0
                  ? `Adicionar ${selected.size} à lista`
                  : "Adicionar selecionados à lista"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
