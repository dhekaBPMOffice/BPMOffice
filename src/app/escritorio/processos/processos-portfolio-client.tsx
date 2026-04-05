"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LayoutGrid, List, Link2, Trash2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { buildProcessosHref, type ProcessosListQuery } from "@/lib/office-processes-list";
import { cn } from "@/lib/utils";
import { deleteOfficeProcessesBulk } from "./actions";

export type ProcessoPortfolioItem = {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  statusLabel: string;
  statusVariant: "outline" | "success" | "warning" | "secondary";
  origemLabel: string;
  originDetailLabel: string;
  faseBpmLabel: string;
  tipoLabel: string | null;
  nivelLabel: string | null;
  ownerName: string | null;
  flowcharts: { url: string }[];
  templates: { url: string; label?: string | null }[];
};

export function ProcessosPortfolioClient({
  items,
  query,
}: {
  items: ProcessoPortfolioItem[];
  query: ProcessosListQuery;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const liveRef = useRef<HTMLDivElement>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);

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
      if (ids.length === 0) return prev;
      if (ids.every((id) => prev.has(id))) {
        return new Set();
      }
      return new Set(ids);
    });
  }, [ids]);

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  const copyLinks = useCallback(async () => {
    const base =
      typeof window !== "undefined" ? window.location.origin : "";
    const lines = [...selected].map(
      (id) => `${base}/escritorio/processos/${id}`
    );
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      liveRef.current?.focus();
    } catch {
      /* ignore */
    }
  }, [selected]);

  function handleDeleteClick() {
    setDeleteError(null);
    setDeleteDialogOpen(true);
  }

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

  function setVista(v: "grade" | "lista") {
    if (v === query.vista) return;
    router.push(buildProcessosHref({ ...query, vista: v }));
  }

  return (
    <div className="space-y-4">
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
                query.vista === "lista"
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
                query.vista === "grade"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <LayoutGrid className="h-4 w-4" aria-hidden />
              Grade
            </button>
          </div>
          {query.vista === "grade" && ids.length > 0 ? (
            <button
              type="button"
              onClick={() => setSelected(new Set(ids))}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Selecionar todos
            </button>
          ) : null}
        </div>
      </div>

      {query.vista === "lista" ? (
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
              {items.map((row) => (
                <TableRow key={row.id} data-state={selected.has(row.id) ? "selected" : undefined}>
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
                    <div className="text-xs text-muted-foreground">{row.category || "—"}</div>
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
          {items.map((process) => (
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
                    <CardDescription>{process.category || "Sem categoria"}</CardDescription>
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
                        Tipo: <span className="text-foreground">{process.tipoLabel}</span>
                      </span>
                    ) : null}
                    {process.nivelLabel ? (
                      <span className="line-clamp-2">
                        Níveis: {process.nivelLabel}
                      </span>
                    ) : null}
                  </div>
                )}
                {process.flowcharts.length > 0 ? (
                  <div className="space-y-2">
                    {process.flowcharts.slice(0, 2).map((ff, i) =>
                      /\.(png|jpe?g|gif|webp)$/i.test(ff.url) ? (
                        <img
                          key={i}
                          src={ff.url}
                          alt={`Fluxograma ${i + 1}`}
                          className="h-40 w-full rounded-lg border object-contain"
                        />
                      ) : (
                        <a
                          key={i}
                          href={ff.url}
                          download
                          className={buttonVariants({ variant: "outline", size: "sm" })}
                        >
                          Baixar fluxograma {process.flowcharts.length > 1 ? i + 1 : ""}
                        </a>
                      )
                    )}
                  </div>
                ) : null}
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
                  {process.templates.map((tf, i) => (
                    <a
                      key={i}
                      href={tf.url}
                      target="_blank"
                      rel="noreferrer"
                      download
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      {tf.label || `Baixar template ${process.templates.length > 1 ? i + 1 : ""}`}
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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
        <span className="text-sm font-medium">
          {selected.size} processo(s) selecionado(s)
        </span>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={buttonVariants({ size: "sm" })} onClick={copyLinks}>
            <Link2 className="mr-1.5 h-4 w-4" aria-hidden />
            Copiar links
          </button>
          <button
            type="button"
            className={buttonVariants({ variant: "destructive", size: "sm" })}
            onClick={handleDeleteClick}
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

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir {selected.size} processo(s)?</DialogTitle>
            <DialogDescription>
              Esta ação é irreversível. Todos os dados associados (checklist, anexos, histórico) dos processos selecionados serão removidos permanentemente.
            </DialogDescription>
          </DialogHeader>
          {deleteError ? (
            <p className="text-sm text-destructive">{deleteError}</p>
          ) : null}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Excluindo…" : "Sim, excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
