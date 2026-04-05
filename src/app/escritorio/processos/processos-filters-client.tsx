"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BPM_PHASE_LABELS, BPM_PHASE_SLUGS, type BpmPhaseSlug } from "@/lib/bpm-phases";
import {
  buildProcessosHref,
  PROCESSOS_SORT_OPTIONS,
  type ProcessosListQuery,
} from "@/lib/office-processes-list";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Todos os estados" },
  { value: "not_started", label: "Não iniciado" },
  { value: "in_progress", label: "Em andamento" },
  { value: "completed", label: "Concluído" },
  { value: "archived", label: "Arquivado" },
];

const TIPO_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Todos os tipos" },
  { value: "primario", label: "Primário" },
  { value: "gerencial", label: "Gerencial" },
  { value: "apoio", label: "Apoio" },
  { value: "sem", label: "Sem tipo (cadeia)" },
];

function uniqueSorted(values: (string | null | undefined)[]): string[] {
  const set = new Set<string>();
  for (const v of values) {
    const t = v?.trim();
    if (t) set.add(t);
  }
  return [...set].sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));
}

export function ProcessosFiltersClient({
  query,
  levelTuples,
}: {
  query: ProcessosListQuery;
  levelTuples: Array<[string | null, string | null, string | null]>;
}) {
  const router = useRouter();
  const [qInput, setQInput] = useState(query.q);
  const queryRef = useRef(query);
  queryRef.current = query;

  useEffect(() => {
    setQInput(query.q);
  }, [query.q]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      const trimmed = qInput.trim();
      const cur = queryRef.current.q.trim();
      if (trimmed === cur) return;
      router.push(
        buildProcessosHref({
          ...queryRef.current,
          q: trimmed,
        })
      );
    }, 400);
    return () => window.clearTimeout(t);
  }, [qInput, router]);

  const n1Options = useMemo(
    () => uniqueSorted(levelTuples.map((tuple) => tuple[0])),
    [levelTuples]
  );

  const n2Options = useMemo(() => {
    const n1 = query.n1.trim();
    if (!n1) return uniqueSorted(levelTuples.map((tuple) => tuple[1]));
    return uniqueSorted(
      levelTuples.filter((tuple) => (tuple[0] ?? "").trim() === n1).map((tuple) => tuple[1])
    );
  }, [levelTuples, query.n1]);

  const n3Options = useMemo(() => {
    const n1 = query.n1.trim();
    const n2 = query.n2.trim();
    let rows = levelTuples;
    if (n1) rows = rows.filter((tuple) => (tuple[0] ?? "").trim() === n1);
    if (n2) rows = rows.filter((tuple) => (tuple[1] ?? "").trim() === n2);
    return uniqueSorted(rows.map((tuple) => tuple[2]));
  }, [levelTuples, query.n1, query.n2]);

  function push(next: Partial<ProcessosListQuery>) {
    router.push(buildProcessosHref({ ...query, ...next }));
  }

  const hasActiveFilters =
    !!query.fase ||
    !!query.tipo ||
    !!query.n1 ||
    !!query.n2 ||
    !!query.n3 ||
    !!query.status ||
    !!query.q.trim();

  return (
    <div className="space-y-4 rounded-xl border-2 border-border bg-card p-4 shadow-sm">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="processos-q">Pesquisar</Label>
          <Input
            id="processos-q"
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="Nome ou descrição…"
            autoComplete="off"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="processos-fase">Fase BPM (atual)</Label>
          <Select
            id="processos-fase"
            value={query.fase}
            onChange={(e) => {
              const v = e.target.value as BpmPhaseSlug | "";
              push({ fase: v });
            }}
          >
            <option value="">Todas as fases</option>
            {BPM_PHASE_SLUGS.map((slug) => (
              <option key={slug} value={slug}>
                {BPM_PHASE_LABELS[slug]}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="processos-tipo">Tipo (cadeia)</Label>
          <Select
            id="processos-tipo"
            value={query.tipo}
            onChange={(e) => push({ tipo: e.target.value })}
          >
            {TIPO_OPTIONS.map((o) => (
              <option key={o.value || "all"} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="processos-n1">Nível 1</Label>
          <Select
            id="processos-n1"
            value={query.n1}
            onChange={(e) => {
              const v = e.target.value;
              push({ n1: v, n2: "", n3: "" });
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
          <Label htmlFor="processos-n2">Nível 2</Label>
          <Select
            id="processos-n2"
            value={query.n2}
            onChange={(e) => {
              const v = e.target.value;
              push({ n2: v, n3: "" });
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
          <Label htmlFor="processos-n3">Nível 3</Label>
          <Select
            id="processos-n3"
            value={query.n3}
            onChange={(e) => push({ n3: e.target.value })}
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
          <Label htmlFor="processos-status">Estado do processo</Label>
          <Select
            id="processos-status"
            value={query.status}
            onChange={(e) => push({ status: e.target.value })}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value || "all"} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="processos-ordenar">Ordenar por</Label>
          <Select
            id="processos-ordenar"
            value={query.ordenar}
            onChange={(e) =>
              push({ ordenar: e.target.value as ProcessosListQuery["ordenar"] })
            }
          >
            {PROCESSOS_SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {hasActiveFilters ? (
          <Link
            href={buildProcessosHref({ origem: query.origem, vista: query.vista })}
            className={buttonVariants({ variant: "secondary", size: "sm" })}
          >
            Limpar filtros
          </Link>
        ) : null}
      </div>
    </div>
  );
}
