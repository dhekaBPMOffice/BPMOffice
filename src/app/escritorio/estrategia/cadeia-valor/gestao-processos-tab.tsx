"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardList,
  LayoutGrid,
  Link2,
  List,
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
import { BPM_PHASE_LABELS, BPM_PHASE_SLUGS, type BpmPhaseSlug } from "@/lib/bpm-phases";
import { deleteOfficeProcessesBulk } from "@/app/escritorio/processos/actions";
import { CriarProcessoDialog } from "./criar-processo-dialog";

export type GestaoProcessItem = {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  statusLabel: string;
  statusRaw: string;
  statusVariant: "outline" | "success" | "warning" | "secondary";
  origemLabel: string;
  originDetailLabel: string;
  faseBpmLabel: string;
  faseBpmSlug: string | null;
  tipoLabel: string | null;
  nivelLabel: string | null;
  ownerName: string | null;
  vcProcessType: string | null;
  vcLevel1: string | null;
  vcLevel2: string | null;
  vcLevel3: string | null;
  flowcharts: { url: string }[];
  templates: { url: string; label?: string | null }[];
};

export type GestaoProcessosTabProps = {
  items: GestaoProcessItem[];
  stats: { total: number; inProgress: number; completed: number };
};

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

export function GestaoProcessosTab({ items, stats }: GestaoProcessosTabProps) {
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
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [criarDialogOpen, setCriarDialogOpen] = useState(false);
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
      title="Gestão de Processos"
      description="Portfólio completo dos processos do escritório. Adicione, remova ou acesse a gestão individual de cada processo."
      iconName="ClipboardList"
      actions={
        <div className="flex flex-wrap gap-2">
          <Link
            href="/escritorio/processos/visao-geral"
            className={buttonVariants({ variant: "outline" })}
          >
            <BarChart3 className="h-4 w-4" />
            Visão geral
          </Link>
          <Button onClick={() => setCriarDialogOpen(true)}>
            <PlusCircle className="h-4 w-4" />
            Adicionar processo
          </Button>
        </div>
      }
    >
      {/* Filtros */}
      <div className="space-y-4 rounded-xl border-2 border-border bg-card p-4 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="gestao-q">Pesquisar</Label>
            <Input
              id="gestao-q"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nome ou descrição…"
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="gestao-fase">Fase BPM (atual)</Label>
            <Select id="gestao-fase" value={fase} onChange={(e) => setFase(e.target.value)}>
              <option value="">Todas as fases</option>
              {BPM_PHASE_SLUGS.map((slug) => (
                <option key={slug} value={slug}>
                  {BPM_PHASE_LABELS[slug]}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="gestao-tipo">Tipo (cadeia)</Label>
            <Select id="gestao-tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
              {TIPO_OPTIONS.map((o) => (
                <option key={o.value || "all"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="gestao-n1">Nível 1</Label>
            <Select
              id="gestao-n1"
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
            <Label htmlFor="gestao-n2">Nível 2</Label>
            <Select
              id="gestao-n2"
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
            <Label htmlFor="gestao-n3">Nível 3</Label>
            <Select
              id="gestao-n3"
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
            <Label htmlFor="gestao-status">Estado do processo</Label>
            <Select id="gestao-status" value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value || "all"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="gestao-ordenar">Ordenar por</Label>
            <Select id="gestao-ordenar" value={sort} onChange={(e) => setSort(e.target.value)}>
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
          <CardTitle>Portfólio do escritório</CardTitle>
          <CardDescription>
            Cada processo possui uma área própria de gestão com checklist, anexos e histórico.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredItems.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="Nenhum processo neste filtro"
              description="Ajuste os filtros acima ou adicione processos."
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <Button onClick={() => setCriarDialogOpen(true)}>
                    <PlusCircle className="h-4 w-4" />
                    Criar manualmente
                  </Button>
                  {hasActiveFilters && (
                    <Button variant="outline" onClick={clearFilters}>
                      Limpar filtros
                    </Button>
                  )}
                </div>
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
                          <p>Origem: {process.originDetailLabel}</p>
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

      {/* Dialog de criação manual */}
      <CriarProcessoDialog open={criarDialogOpen} onOpenChange={setCriarDialogOpen} />
    </PageLayout>
  );
}
