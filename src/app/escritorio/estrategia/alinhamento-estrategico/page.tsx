"use client";

import { useEffect, useMemo, useState } from "react";
import { PageLayout } from "@/components/layout/page-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Target, Network, Loader2 } from "lucide-react";
import type { OfficeStrategicObjective } from "../objetivos-estrategicos/actions";
import {
  createStrategicObjectiveProcessLink,
  deleteStrategicObjectiveProcessLink,
  type StrategicObjectiveProcessLink,
} from "./actions";

type ProcessType = "Primário" | "Apoio" | "Gerencial";
type Priority = "Alta" | "Média" | "Baixa";
type GeneralStatus = "Não iniciado" | "Em andamento" | "Concluído" | "Em acompanhamento";
type StageStatus = "Não iniciado" | "Em andamento" | "Concluído";

const STORAGE_KEY_PROCESSES = "cadeia-valor-processos";

type BPMStage =
  | "Levantamento"
  | "Modelagem"
  | "Validação"
  | "Descritivo"
  | "Proposição de melhorias"
  | "Implantação"
  | "Acompanhamento";

interface ProcessItem {
  id: string;
  tipo: ProcessType;
  macroprocesso: string;
  nivel1: string;
  nivel2: string;
  nivel3: string;
  gestorProcesso: string;
  ultimaAtualizacao: string;
  responsavelAtualizacao: string;
  prioridade: Priority;
  statusGeral: GeneralStatus;
  etapas: Record<BPMStage, StageStatus>;
}

interface AlignmentData {
  objectives: OfficeStrategicObjective[];
  links: StrategicObjectiveProcessLink[];
  error: string | null;
}

export default function AlinhamentoEstrategicoPage() {
  const [objectives, setObjectives] = useState<OfficeStrategicObjective[]>([]);
  const [processes, setProcesses] = useState<ProcessItem[]>([]);
  const [links, setLinks] = useState<StrategicObjectiveProcessLink[]>([]);
  const [searchProcess, setSearchProcess] = useState("");
  const [searchObjective, setSearchObjective] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadInitialData() {
      setLoading(true);
      setError(null);

      // processos da cadeia de valor (localStorage)
      try {
        const storedProcesses = localStorage.getItem(STORAGE_KEY_PROCESSES);
        if (storedProcesses) {
          setProcesses(JSON.parse(storedProcesses) as ProcessItem[]);
        }
      } catch {
        setProcesses([]);
      }

      // objetivos e vínculos (backend) - será conectado via actions
      try {
        const res = await fetch("/api/estrategia/alinhamento");
        if (!res.ok) {
          throw new Error("Falha ao carregar dados estratégicos.");
        }
        const json = (await res.json()) as AlignmentData;
        if (json.error) {
          setError(json.error);
        }
        setObjectives(json.objectives ?? []);
        setLinks(json.links ?? []);
      } catch (err) {
        if (!error) {
          setError(
            err instanceof Error
              ? err.message
              : "Não foi possível carregar objetivos e vínculos."
          );
        }
      } finally {
        setLoading(false);
      }
    }

    loadInitialData();
  }, []);

  const filteredObjectives = useMemo(() => {
    const text = searchObjective.trim().toLowerCase();
    if (!text) return objectives;
    return objectives.filter((objective) =>
      objective.title.toLowerCase().includes(text)
    );
  }, [objectives, searchObjective]);

  const filteredProcesses = useMemo(() => {
    const text = searchProcess.trim().toLowerCase();
    if (!text) return processes;
    return processes.filter((process) => {
      const composite = [
        process.macroprocesso,
        process.nivel1,
        process.nivel2,
        process.nivel3,
        process.gestorProcesso,
      ]
        .join(" ")
        .toLowerCase();
      return composite.includes(text);
    });
  }, [processes, searchProcess]);

  const coverageStats = useMemo(() => {
    const objectivesWithLinks = new Set(
      links.map((link) => link.objective_id)
    );
    const processesWithLinks = new Set(
      links.map((link) => link.process_local_id)
    );

    return {
      totalObjectives: objectives.length,
      coveredObjectives: objectivesWithLinks.size,
      totalProcesses: processes.length,
      coveredProcesses: processesWithLinks.size,
    };
  }, [links, objectives.length, processes.length]);

  function hasLink(objectiveId: string, processId: string) {
    return links.some(
      (link) =>
        link.objective_id === objectiveId &&
        link.process_local_id === processId
    );
  }

  async function handleToggleLink(objective: OfficeStrategicObjective, process: ProcessItem) {
    const alreadyLinked = hasLink(objective.id, process.id);
    setSaving(true);
    setError(null);

    if (alreadyLinked) {
      // otimista: remove localmente
      setLinks((current) =>
        current.filter(
          (link) =>
            !(
              link.objective_id === objective.id &&
              link.process_local_id === process.id
            )
        )
      );

      const { error: deleteError } = await deleteStrategicObjectiveProcessLink({
        objectiveId: objective.id,
        processLocalId: process.id,
      });

      if (deleteError) {
        // reverte em caso de erro
        setLinks((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            office_id: "",
            objective_id: objective.id,
            process_local_id: process.id,
            process_macroprocesso: process.macroprocesso,
            process_nivel1: process.nivel1,
            process_nivel2: process.nivel2,
            process_nivel3: process.nivel3,
            created_at: new Date().toISOString(),
          },
        ]);
        setError(deleteError);
      }
    } else {
      // otimista: adiciona localmente
      const optimistic: StrategicObjectiveProcessLink = {
        id: crypto.randomUUID(),
        office_id: "",
        objective_id: objective.id,
        process_local_id: process.id,
        process_macroprocesso: process.macroprocesso,
        process_nivel1: process.nivel1,
        process_nivel2: process.nivel2,
        process_nivel3: process.nivel3,
        created_at: new Date().toISOString(),
      };

      setLinks((current) => [...current, optimistic]);

      const { link, error: createError } =
        await createStrategicObjectiveProcessLink({
          objectiveId: objective.id,
          process: {
            localId: process.id,
            macroprocesso: process.macroprocesso,
            nivel1: process.nivel1,
            nivel2: process.nivel2,
            nivel3: process.nivel3,
          },
        });

      if (createError || !link) {
        // reverte em caso de erro
        setLinks((current) =>
          current.filter((l) => l.id !== optimistic.id)
        );
        setError(createError ?? "Não foi possível criar o vínculo.");
      } else {
        // substitui o otimista pela versão retornada do backend
        setLinks((current) =>
          current.map((l) => (l.id === optimistic.id ? link : l))
        );
      }
    }

    setSaving(false);
  }

  return (
    <PageLayout
      title="Alinhamento Estratégico"
      description="Visualize a conexão entre objetivos estratégicos e processos da Cadeia de Valor."
      icon={Target}
      backHref="/escritorio/estrategia"
    >
      <div className="space-y-6">
        {(error || saving) && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {saving ? (
              <span className="inline-flex items-center gap-2 text-[var(--identity-primary)]">
                <Loader2 className="h-4 w-4 animate-spin" />
                Salvando vínculos de alinhamento...
              </span>
            ) : (
              error
            )}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground">Objetivos estratégicos</p>
              <p className="text-2xl font-semibold">
                {coverageStats.totalObjectives}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground">
                Objetivos com pelo menos um processo
              </p>
              <p className="text-2xl font-semibold">
                {coverageStats.coveredObjectives}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground">Processos na Cadeia de Valor</p>
              <p className="text-2xl font-semibold">
                {coverageStats.totalProcesses}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground">
                Processos alinhados a pelo menos um objetivo
              </p>
              <p className="text-2xl font-semibold">
                {coverageStats.coveredProcesses}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="space-y-2">
            <div className="flex items-center gap-2">
              <Network className="h-5 w-5 text-[var(--identity-primary)]" />
              <div>
                <CardTitle className="text-base">
                  Matriz Objetivos × Processos
                </CardTitle>
                <CardDescription>
                  Use a matriz para verificar se todos os objetivos estão
                  conectados a um ou mais processos da empresa.
                </CardDescription>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label className="mb-1 block text-xs text-muted-foreground">
                  Filtrar processos
                </Label>
                <Input
                  value={searchProcess}
                  onChange={(event) => setSearchProcess(event.target.value)}
                  placeholder="Buscar por macroprocesso, níveis ou gestor..."
                />
              </div>
              <div>
                <Label className="mb-1 block text-xs text-muted-foreground">
                  Filtrar objetivos
                </Label>
                <Input
                  value={searchObjective}
                  onChange={(event) => setSearchObjective(event.target.value)}
                  placeholder="Buscar por título do objetivo..."
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Carregando objetivos, processos e vínculos...
              </p>
            ) : filteredObjectives.length === 0 || filteredProcesses.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/30 py-10 text-center text-sm text-muted-foreground">
                Nenhum objetivo ou processo encontrado para montar a matriz.
              </div>
            ) : (
              <div className="max-h-[720px] w-full overflow-auto rounded-md border">
                <table className="min-w-[720px] w-full caption-bottom text-sm">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 top-0 z-30 max-w-[180px] bg-muted/60 backdrop-blur">
                        Processo
                      </TableHead>
                      {filteredObjectives.map((objective) => (
                        <TableHead
                          key={objective.id}
                          className="sticky top-0 z-20 min-w-[90px] max-w-[130px] text-center align-middle bg-muted/60 backdrop-blur"
                          title={objective.title}
                        >
                          <span className="block break-words line-clamp-3 text-xs font-medium">
                            {objective.title}
                          </span>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProcesses.map((process) => (
                      <TableRow key={process.id}>
                        <TableCell className="sticky left-0 z-10 max-w-[180px] bg-background/95">
                          <div className="space-y-0.5">
                            <p className="text-sm font-medium">
                              {process.macroprocesso || "Sem Macroprocesso"}
                            </p>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {[process.nivel1, process.nivel2, process.nivel3]
                                .filter(Boolean)
                                .join(" • ") || "Sem detalhamento de níveis"}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              Gestor: {process.gestorProcesso || "Não definido"}
                            </p>
                          </div>
                        </TableCell>
                        {filteredObjectives.map((objective) => {
                          const checked = hasLink(objective.id, process.id);
                          return (
                            <TableCell
                              key={objective.id}
                              className="text-center align-middle"
                            >
                              <button
                                type="button"
                                className={`inline-flex h-7 w-7 items-center justify-center rounded-md border text-xs font-semibold transition-colors ${
                                  checked
                                    ? "border-[var(--identity-primary)] bg-[var(--identity-primary)]/10 text-[var(--identity-primary)]"
                                    : "border-border bg-background text-muted-foreground hover:bg-muted/40"
                                }`}
                                aria-label={
                                  checked
                                    ? "Remover vínculo entre objetivo e processo"
                                    : "Criar vínculo entre objetivo e processo"
                                }
                                onClick={() => handleToggleLink(objective, process)}
                              >
                                {checked ? "X" : ""}
                              </button>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-[var(--identity-primary)]" />
              <div>
                <CardTitle className="text-base">
                  Mapa de vínculos por processo
                </CardTitle>
                <CardDescription>
                  Visualize rapidamente quais processos já estão conectados a
                  objetivos estratégicos.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {links.length === 0 ? (
              <p className="py-6 text-sm text-muted-foreground">
                Nenhum vínculo criado ainda. Marque os X na matriz acima para
                começar o alinhamento.
              </p>
            ) : (
              <div className="space-y-3">
                {processes
                  .map((process) => {
                    const relatedObjectiveIds = new Set(
                      links
                        .filter(
                          (link) => link.process_local_id === process.id
                        )
                        .map((link) => link.objective_id)
                    );
                    if (relatedObjectiveIds.size === 0) return null;

                    const relatedObjectives = objectives.filter((objective) =>
                      relatedObjectiveIds.has(objective.id)
                    );

                    return (
                      <div
                        key={process.id}
                        className="rounded-lg border bg-card p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold">
                              {process.macroprocesso || "Sem Macroprocesso"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {[process.nivel1, process.nivel2, process.nivel3]
                                .filter(Boolean)
                                .join(" • ") || "Sem detalhamento de níveis"}
                            </p>
                          </div>
                          <Badge variant="outline">
                            {relatedObjectives.length} objetivo(s)
                          </Badge>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {relatedObjectives.map((objective) => (
                            <Badge
                              key={objective.id}
                              variant="secondary"
                              className="max-w-xs truncate"
                              title={objective.title}
                            >
                              {objective.title}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    );
                  })
                  .filter(Boolean)}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}

