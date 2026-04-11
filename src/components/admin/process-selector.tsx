"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { BaseProcess } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronDown } from "lucide-react";

export type ProcessSelectorProps = {
  processes: BaseProcess[];
  selectedIds: string[];
  onToggle: (id: string, checked: boolean) => void;
  /** Mensagem quando não existem processos cadastrados */
  emptyMessage?: string;
};

export function ProcessSelector({
  processes,
  selectedIds,
  onToggle,
  emptyMessage = "Cadastre processos em /admin/processos primeiro.",
}: ProcessSelectorProps) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const sortedProcesses = useMemo(
    () =>
      [...processes].sort((a, b) =>
        a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" })
      ),
    [processes]
  );

  const filteredProcesses = useMemo(() => {
    const q = filter.trim().toLocaleLowerCase("pt-BR");
    if (!q) return sortedProcesses;
    return sortedProcesses.filter((p) =>
      p.name.toLocaleLowerCase("pt-BR").startsWith(q)
    );
  }, [sortedProcesses, filter]);

  useEffect(() => {
    if (open) {
      setFilter("");
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  if (processes.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  const n = selectedIds.length;
  const summary =
    n === 0
      ? "Selecionar processos…"
      : n === 1
        ? "1 processo selecionado"
        : `${n} processos selecionados`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="w-full sm:max-w-md">
        <Button
          type="button"
          variant="outline"
          className="w-full justify-between font-normal"
        >
          <span className="truncate">{summary}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="flex max-h-[min(360px,70vh)] w-[min(calc(100vw-2rem),360px)] flex-col overflow-hidden p-0"
      >
        <div className="shrink-0 border-b border-border/60 p-2">
          <Input
            ref={inputRef}
            placeholder="Filtrar pelo início do nome…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="h-9"
          />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-1 [scrollbar-gutter:stable]">
          {filteredProcesses.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              Nenhum processo encontrado.
            </p>
          ) : (
            filteredProcesses.map((p) => (
              <label
                key={p.id}
                className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-2 text-sm hover:bg-accent/30"
              >
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={selectedIds.includes(p.id)}
                  onChange={(e) => onToggle(p.id, e.target.checked)}
                />
                <span>
                  <span className="block font-medium">{p.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {p.category || "Sem categoria"}
                  </span>
                </span>
              </label>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
