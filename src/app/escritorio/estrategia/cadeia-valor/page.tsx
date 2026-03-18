"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Download,
  ExternalLink,
  FileImage,
  FileText,
  Network,
  Pencil,
  Plus,
  Search,
  Trash2,
  WandSparkles,
} from "lucide-react";
import { PageLayout } from "@/components/layout/page-layout";
import { cn } from "@/lib/utils";

type ProcessType = "Primário" | "Apoio" | "Gerencial";
type Priority = "Alta" | "Média" | "Baixa";
type GeneralStatus = "Não iniciado" | "Em andamento" | "Concluído" | "Em acompanhamento";
type StageStatus = "Não iniciado" | "Em andamento" | "Concluído";
type ViewMode = "lista" | "hierarquia";
type CreationMode = "anexar" | "manual" | "ia";
type SortMode =
  | "atualizacao_desc"
  | "atualizacao_asc"
  | "macro_asc"
  | "macro_desc"
  | "prioridade";

const BPM_STAGES = [
  "Levantamento",
  "Modelagem",
  "Validação",
  "Descritivo",
  "Proposição de melhorias",
  "Implantação",
  "Acompanhamento",
] as const;

type BPMStage = (typeof BPM_STAGES)[number];

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

interface ProcessFormData {
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

interface UploadedFileItem {
  id: string;
  nome: string;
  tipo: string;
  tamanhoKb: number;
  dataUpload: string;
}

interface UIState {
  viewMode: ViewMode;
  searchTerm: string;
  filterType: ProcessType | "all";
  filterStatus: GeneralStatus | "all";
  filterPriority: Priority | "all";
  filterMacroprocesso: string;
  sortMode: SortMode;
  currentPage: number;
}

interface CategoryGroup {
  label: string;
  tipo: ProcessType;
  macros: Array<{
    nome: string;
    processos: ProcessItem[];
  }>;
}

interface ProcessTreeNode {
  label: string;
  processes: ProcessItem[];
  children: ProcessTreeNode[];
}

const CATEGORY_ORDER: ProcessType[] = ["Primário", "Gerencial", "Apoio"];
const CATEGORY_LABELS: Record<ProcessType, string> = {
  Primário: "Processos de Negócio",
  Gerencial: "Processos de Gestão",
  Apoio: "Processos de Apoio",
};

const STORAGE_KEY_PROCESSES = "cadeia-valor-processos";
const STORAGE_KEY_UPLOADS = "cadeia-valor-anexos";
const STORAGE_KEY_UI = "cadeia-valor-ui-state";

const PAGE_SIZE = 20;
const PROCESS_TYPES: ProcessType[] = ["Primário", "Apoio", "Gerencial"];
const PRIORITIES: Priority[] = ["Alta", "Média", "Baixa"];
const GENERAL_STATUSES: GeneralStatus[] = [
  "Não iniciado",
  "Em andamento",
  "Concluído",
  "Em acompanhamento",
];
const STAGE_STATUSES: StageStatus[] = ["Não iniciado", "Em andamento", "Concluído"];
const SORT_OPTIONS: Array<{ value: SortMode; label: string }> = [
  { value: "atualizacao_desc", label: "Atualização mais recente" },
  { value: "atualizacao_asc", label: "Atualização mais antiga" },
  { value: "macro_asc", label: "Macroprocesso A-Z" },
  { value: "macro_desc", label: "Macroprocesso Z-A" },
  { value: "prioridade", label: "Prioridade (Alta > Baixa)" },
];

const AI_QUESTIONS = [
  { id: "segmento", label: "Qual o segmento principal da empresa?" },
  { id: "propostaValor", label: "Qual a proposta de valor principal ao cliente?" },
  { id: "publicoAlvo", label: "Quem são os principais públicos/clientes?" },
  { id: "canais", label: "Quais canais de entrega/comercialização são usados?" },
  { id: "operacao", label: "Como a operação é executada no dia a dia?" },
  { id: "suporte", label: "Quais áreas de apoio são essenciais?" },
  { id: "governanca", label: "Como ocorre governança, gestão e tomada de decisão?" },
] as const;

type AIQuestionId = (typeof AI_QUESTIONS)[number]["id"];

const AI_QUESTION_DEFAULTS: Record<AIQuestionId, string> = {
  segmento: "",
  propostaValor: "",
  publicoAlvo: "",
  canais: "",
  operacao: "",
  suporte: "",
  governanca: "",
};

const DEFAULT_UI_STATE: UIState = {
  viewMode: "lista",
  searchTerm: "",
  filterType: "all",
  filterStatus: "all",
  filterPriority: "all",
  filterMacroprocesso: "all",
  sortMode: "atualizacao_desc",
  currentPage: 1,
};

function createDefaultStages(status: StageStatus = "Não iniciado"): Record<BPMStage, StageStatus> {
  return {
    Levantamento: status,
    Modelagem: status,
    Validação: status,
    Descritivo: status,
    "Proposição de melhorias": status,
    Implantação: status,
    Acompanhamento: status,
  };
}

function getDefaultFormData(): ProcessFormData {
  return {
    tipo: "Primário",
    macroprocesso: "",
    nivel1: "",
    nivel2: "",
    nivel3: "",
    gestorProcesso: "",
    ultimaAtualizacao: new Date().toISOString().slice(0, 16),
    responsavelAtualizacao: "",
    prioridade: "Média",
    statusGeral: "Não iniciado",
    etapas: createDefaultStages("Não iniciado"),
  };
}

function normalizeLevel(value: string, fallback: string): string {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
}

function formatDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("pt-BR");
}

function toCSVCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function cleanFileName(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, "").replaceAll("_", " ").replaceAll("-", " ").trim();
}

function getPriorityWeight(priority: Priority): number {
  if (priority === "Alta") return 0;
  if (priority === "Média") return 1;
  return 2;
}

function getStageBadgeVariant(status: StageStatus): "outline" | "warning" | "success" {
  if (status === "Concluído") return "success";
  if (status === "Em andamento") return "warning";
  return "outline";
}

function getGeneralStatusVariant(status: GeneralStatus): "outline" | "warning" | "success" {
  if (status === "Concluído") return "success";
  if (status === "Em andamento" || status === "Em acompanhamento") return "warning";
  return "outline";
}

function formatProcessPath(process: ProcessItem, macroNome: string): string {
  const parts = [
    normalizeLevel(process.nivel1, ""),
    normalizeLevel(process.nivel2, ""),
    normalizeLevel(process.nivel3, ""),
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" › ") : macroNome;
}

function buildProcessTree(processes: ProcessItem[]): ProcessTreeNode[] {
  const roots: ProcessTreeNode[] = [];
  const rootByLabel = new Map<string, ProcessTreeNode>();

  for (const process of processes) {
    const path = [
      normalizeLevel(process.nivel1, ""),
      normalizeLevel(process.nivel2, ""),
      normalizeLevel(process.nivel3, ""),
    ].filter(Boolean);
    if (path.length === 0) continue;

    let parent: ProcessTreeNode | null = null;
    for (let i = 0; i < path.length; i++) {
      const label = path[i];
      let node: ProcessTreeNode | null = null;

      if (i === 0) {
        node = rootByLabel.get(label) ?? null;
        if (!node) {
          node = { label, processes: [], children: [] };
          rootByLabel.set(label, node);
          roots.push(node);
        }
      } else {
        node = parent!.children.find((c) => c.label === label) ?? null;
        if (!node) {
          node = { label, processes: [], children: [] };
          parent!.children.push(node);
          parent!.children.sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
        }
      }
      if (i === path.length - 1) {
        node!.processes.push(process);
      }
      parent = node;
    }
  }

  return roots.sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
}

function getBpmSummary(etapas: Record<BPMStage, StageStatus>) {
  let naoIniciado = 0;
  let emAndamento = 0;
  let concluido = 0;

  for (const stage of BPM_STAGES) {
    const status = etapas[stage];
    if (status === "Não iniciado") naoIniciado += 1;
    if (status === "Em andamento") emAndamento += 1;
    if (status === "Concluído") concluido += 1;
  }

  return { naoIniciado, emAndamento, concluido };
}

function parseLineToProcess(line: string, fallbackMacro: string): ProcessFormData {
  const segments = line
    .split(/>|;|\|/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  return {
    tipo: "Primário",
    macroprocesso: segments[0] || fallbackMacro,
    nivel1: segments[1] || "",
    nivel2: segments[2] || "",
    nivel3: segments[3] || "",
    gestorProcesso: "Definir gestor",
    ultimaAtualizacao: new Date().toISOString().slice(0, 16),
    responsavelAtualizacao: "Extração por anexo (revisar)",
    prioridade: "Média",
    statusGeral: "Não iniciado",
    etapas: createDefaultStages("Não iniciado"),
  };
}

async function extractProcessesFromAttachment(file: File): Promise<ProcessFormData[]> {
  const fallbackMacro = cleanFileName(file.name) || "Macroprocesso do anexo";

  try {
    const content = (await file.text()).replace(/\s+/g, " ").trim();
    if (!content) return [parseLineToProcess(fallbackMacro, fallbackMacro)];

    const candidates = content
      .split(/\r?\n|\. /)
      .map((line) => line.trim())
      .filter((line) => line.length >= 6)
      .slice(0, 12);

    if (candidates.length === 0) return [parseLineToProcess(fallbackMacro, fallbackMacro)];
    return candidates.map((line) => parseLineToProcess(line, fallbackMacro));
  } catch {
    return [parseLineToProcess(fallbackMacro, fallbackMacro)];
  }
}

function buildAISuggestions(answers: Record<AIQuestionId, string>): ProcessFormData[] {
  const segmento = answers.segmento.toLowerCase();
  const operacaoBase = segmento.includes("servi")
    ? "Atendimento e entrega do serviço"
    : segmento.includes("indústr") || segmento.includes("fábrica")
      ? "Planejamento e execução da produção"
      : "Execução da operação principal";

  const rows: Array<Pick<ProcessFormData, "tipo" | "macroprocesso" | "nivel1" | "nivel2" | "nivel3">> = [
    {
      tipo: "Gerencial",
      macroprocesso: "Direcionamento Estratégico",
      nivel1: "Gestão Estratégica",
      nivel2: "Desdobramento de Objetivos",
      nivel3: "Monitoramento de Indicadores",
    },
    {
      tipo: "Primário",
      macroprocesso: "Operação do Negócio",
      nivel1: operacaoBase,
      nivel2: "Execução do Processo-Fim",
      nivel3: "Controle de Qualidade",
    },
    {
      tipo: "Primário",
      macroprocesso: "Relacionamento com Clientes",
      nivel1: "Gestão de Canais e Jornada",
      nivel2: "Atendimento e Retenção",
      nivel3: "Tratativa de Demandas",
    },
    {
      tipo: "Apoio",
      macroprocesso: "Sustentação da Operação",
      nivel1: "Gestão de Pessoas e Capacitação",
      nivel2: "Suporte Administrativo",
      nivel3: "Infraestrutura e Sistemas",
    },
  ];

  return rows.map((row) => ({
    ...row,
    gestorProcesso: "Definir gestor",
    ultimaAtualizacao: new Date().toISOString().slice(0, 16),
    responsavelAtualizacao: "IA (revisão pendente)",
    prioridade: "Média",
    statusGeral: "Não iniciado",
    etapas: createDefaultStages("Não iniciado"),
  }));
}

function buildHierarchyByCategory(processes: ProcessItem[]): CategoryGroup[] {
  const tipoFallback: ProcessType = "Apoio";
  const byTipo = new Map<ProcessType, Map<string, ProcessItem[]>>();

  for (const process of processes) {
    const tipo = PROCESS_TYPES.includes(process.tipo) ? process.tipo : tipoFallback;
    const macro = normalizeLevel(process.macroprocesso, "Sem Macroprocesso");

    if (!byTipo.has(tipo)) byTipo.set(tipo, new Map());
    const mapMacro = byTipo.get(tipo)!;
    if (!mapMacro.has(macro)) mapMacro.set(macro, []);
    mapMacro.get(macro)!.push(process);
  }

  const result: CategoryGroup[] = [];
  for (const tipo of CATEGORY_ORDER) {
    const mapMacro = byTipo.get(tipo);
    if (!mapMacro || mapMacro.size === 0) continue;

    const macros = [...mapMacro.entries()]
      .map(([nome, processos]) => ({ nome, processos }))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

    result.push({
      label: CATEGORY_LABELS[tipo],
      tipo,
      macros,
    });
  }
  return result;
}

function FlowchartArrowDown({ className }: { className?: string }) {
  return (
    <div className={cn("flex justify-center", className)}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
        <line x1="12" y1="4" x2="12" y2="16" />
        <polyline points="8 12 12 16 16 12" />
      </svg>
    </div>
  );
}

function ProcessFlowchartNode({
  node,
  macroNome,
  onEdit,
}: {
  node: ProcessTreeNode;
  macroNome: string;
  onEdit: (process: ProcessItem) => void;
  isRoot?: boolean;
}) {
  const hasChildren = node.children.length > 0;
  const hasProcesses = node.processes.length > 0;

  return (
    <div className="flex flex-col items-center">
      <div className="rounded-lg border-2 border-muted bg-background p-3 min-w-[180px] max-w-[280px] hover:border-[var(--identity-primary)]/40 transition-colors">
        <div className="flex items-center justify-between gap-2">
          {hasProcesses ? (
            <Link
              href={`/escritorio/demandas?processo=${node.processes[0].id}`}
              className="flex-1 min-w-0 font-semibold text-sm text-[var(--identity-primary)] text-center break-words hover:underline"
              title={formatProcessPath(node.processes[0], macroNome)}
            >
              {node.label}
            </Link>
          ) : (
            <p className="flex-1 font-semibold text-sm text-[var(--identity-primary)] text-center break-words">
              {node.label}
            </p>
          )}
          {hasProcesses && (
            <div className="flex shrink-0 gap-0.5">
              {node.processes.map((process) => (
                <Button
                  key={process.id}
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onEdit(process);
                  }}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
      {hasChildren && (
        <>
          <FlowchartArrowDown className="my-1" />
          <div className="flex flex-row flex-wrap justify-center gap-4 md:gap-6 items-start">
            {node.children.map((child) => (
              <ProcessFlowchartNode
                key={child.label}
                node={child}
                macroNome={macroNome}
                onEdit={onEdit}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function CadeiaValorPage() {
  const [processes, setProcesses] = useState<ProcessItem[]>([]);
  const [uploads, setUploads] = useState<UploadedFileItem[]>([]);
  const [formData, setFormData] = useState<ProcessFormData>(getDefaultFormData);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creationMode, setCreationMode] = useState<CreationMode>("manual");
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [aiAnswers, setAiAnswers] = useState<Record<AIQuestionId, string>>(AI_QUESTION_DEFAULTS);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const [viewMode, setViewMode] = useState<ViewMode>(DEFAULT_UI_STATE.viewMode);
  const [searchTerm, setSearchTerm] = useState(DEFAULT_UI_STATE.searchTerm);
  const [filterType, setFilterType] = useState<ProcessType | "all">(DEFAULT_UI_STATE.filterType);
  const [filterStatus, setFilterStatus] = useState<GeneralStatus | "all">(DEFAULT_UI_STATE.filterStatus);
  const [filterPriority, setFilterPriority] = useState<Priority | "all">(DEFAULT_UI_STATE.filterPriority);
  const [filterMacroprocesso, setFilterMacroprocesso] = useState(DEFAULT_UI_STATE.filterMacroprocesso);
  const [sortMode, setSortMode] = useState<SortMode>(DEFAULT_UI_STATE.sortMode);
  const [currentPage, setCurrentPage] = useState(DEFAULT_UI_STATE.currentPage);
  const [expandedMacro, setExpandedMacro] = useState<string | null>(null);

  useEffect(() => {
    const storedProcesses = localStorage.getItem(STORAGE_KEY_PROCESSES);
    const storedUploads = localStorage.getItem(STORAGE_KEY_UPLOADS);
    const storedUI = localStorage.getItem(STORAGE_KEY_UI);

    if (storedProcesses) {
      try {
        setProcesses(JSON.parse(storedProcesses) as ProcessItem[]);
      } catch {
        setProcesses([]);
      }
    }

    if (storedUploads) {
      try {
        setUploads(JSON.parse(storedUploads) as UploadedFileItem[]);
      } catch {
        setUploads([]);
      }
    }

    if (storedUI) {
      try {
        const ui = JSON.parse(storedUI) as UIState;
        setViewMode(ui.viewMode ?? DEFAULT_UI_STATE.viewMode);
        setSearchTerm(ui.searchTerm ?? DEFAULT_UI_STATE.searchTerm);
        setFilterType(ui.filterType ?? DEFAULT_UI_STATE.filterType);
        setFilterStatus(ui.filterStatus ?? DEFAULT_UI_STATE.filterStatus);
        setFilterPriority(ui.filterPriority ?? DEFAULT_UI_STATE.filterPriority);
        setFilterMacroprocesso(ui.filterMacroprocesso ?? DEFAULT_UI_STATE.filterMacroprocesso);
        setSortMode(ui.sortMode ?? DEFAULT_UI_STATE.sortMode);
        setCurrentPage(ui.currentPage ?? DEFAULT_UI_STATE.currentPage);
      } catch {
        // no-op
      }
    }

    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY_PROCESSES, JSON.stringify(processes));
  }, [hydrated, processes]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY_UPLOADS, JSON.stringify(uploads));
  }, [hydrated, uploads]);

  useEffect(() => {
    if (!hydrated) return;
    const payload: UIState = {
      viewMode,
      searchTerm,
      filterType,
      filterStatus,
      filterPriority,
      filterMacroprocesso,
      sortMode,
      currentPage,
    };
    localStorage.setItem(STORAGE_KEY_UI, JSON.stringify(payload));
  }, [
    hydrated,
    viewMode,
    searchTerm,
    filterType,
    filterStatus,
    filterPriority,
    filterMacroprocesso,
    sortMode,
    currentPage,
  ]);

  const macroprocessOptions = useMemo(() => {
    const unique = new Set(
      processes
        .map((process) => process.macroprocesso.trim())
        .filter((value) => value.length > 0)
    );
    return [...unique].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [processes]);

  const filteredSortedProcesses = useMemo(() => {
    const text = searchTerm.trim().toLowerCase();
    const filtered = processes.filter((process) => {
      if (filterType !== "all" && process.tipo !== filterType) return false;
      if (filterStatus !== "all" && process.statusGeral !== filterStatus) return false;
      if (filterPriority !== "all" && process.prioridade !== filterPriority) return false;
      if (
        filterMacroprocesso !== "all" &&
        process.macroprocesso.trim().toLowerCase() !== filterMacroprocesso.trim().toLowerCase()
      ) {
        return false;
      }

      if (!text) return true;
      return [
        process.tipo,
        process.macroprocesso,
        process.nivel1,
        process.nivel2,
        process.nivel3,
        process.gestorProcesso,
        process.responsavelAtualizacao,
        process.statusGeral,
        process.prioridade,
      ]
        .join(" ")
        .toLowerCase()
        .includes(text);
    });

    return filtered.sort((a, b) => {
      if (sortMode === "macro_asc") {
        return a.macroprocesso.localeCompare(b.macroprocesso, "pt-BR");
      }
      if (sortMode === "macro_desc") {
        return b.macroprocesso.localeCompare(a.macroprocesso, "pt-BR");
      }
      if (sortMode === "prioridade") {
        const weightA = getPriorityWeight(a.prioridade);
        const weightB = getPriorityWeight(b.prioridade);
        if (weightA !== weightB) return weightA - weightB;
        return a.macroprocesso.localeCompare(b.macroprocesso, "pt-BR");
      }
      const dateA = new Date(a.ultimaAtualizacao).getTime();
      const dateB = new Date(b.ultimaAtualizacao).getTime();
      if (sortMode === "atualizacao_asc") return dateA - dateB;
      return dateB - dateA;
    });
  }, [
    processes,
    searchTerm,
    filterType,
    filterStatus,
    filterPriority,
    filterMacroprocesso,
    sortMode,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredSortedProcesses.length / PAGE_SIZE));

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const paginatedProcesses = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredSortedProcesses.slice(start, start + PAGE_SIZE);
  }, [filteredSortedProcesses, currentPage]);

  const hierarchyByCategory = useMemo(
    () => buildHierarchyByCategory(filteredSortedProcesses),
    [filteredSortedProcesses]
  );

  const kpis = useMemo(() => {
    const total = processes.length;
    const andamento = processes.filter((process) => process.statusGeral === "Em andamento").length;
    const altaPrioridade = processes.filter((process) => process.prioridade === "Alta").length;
    const concluidos = processes.filter((process) => process.statusGeral === "Concluído").length;
    const percentualConcluido = total === 0 ? 0 : Math.round((concluidos / total) * 100);
    return { total, andamento, altaPrioridade, percentualConcluido };
  }, [processes]);

  function clearMessages() {
    setError(null);
    setSuccess(null);
  }

  function resetForm() {
    setFormData(getDefaultFormData());
    setEditingId(null);
  }

  function openManageDialog(mode: CreationMode = "manual") {
    clearMessages();
    if (mode === "manual" && !editingId) {
      resetForm();
    }
    setCreationMode(mode);
    setManageDialogOpen(true);
  }

  function openEditDialog(process: ProcessItem) {
    clearMessages();
    setEditingId(process.id);
    setFormData({
      tipo: process.tipo,
      macroprocesso: process.macroprocesso,
      nivel1: process.nivel1,
      nivel2: process.nivel2,
      nivel3: process.nivel3,
      gestorProcesso: process.gestorProcesso,
      ultimaAtualizacao: process.ultimaAtualizacao,
      responsavelAtualizacao: process.responsavelAtualizacao,
      prioridade: process.prioridade,
      statusGeral: process.statusGeral,
      etapas: { ...process.etapas },
    });
    setCreationMode("manual");
    setManageDialogOpen(true);
  }

  function clearFilters() {
    setSearchTerm("");
    setFilterType("all");
    setFilterStatus("all");
    setFilterPriority("all");
    setFilterMacroprocesso("all");
    setSortMode("atualizacao_desc");
    setCurrentPage(1);
  }

  function handleBasicFieldChange<K extends keyof ProcessFormData>(
    key: K,
    value: ProcessFormData[K]
  ) {
    setFormData((current) => ({ ...current, [key]: value }));
  }

  function handleStageStatusChange(stage: BPMStage, status: StageStatus) {
    setFormData((current) => ({
      ...current,
      etapas: {
        ...current.etapas,
        [stage]: status,
      },
    }));
  }

  async function handleFileUpload(event: ChangeEvent<HTMLInputElement>) {
    clearMessages();
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const accepted = [".pdf", ".png", ".jpg", ".jpeg", ".webp", ".doc", ".docx", ".txt"];
    const invalid = Array.from(files).find((file) => {
      const name = file.name.toLowerCase();
      return !accepted.some((ext) => name.endsWith(ext));
    });
    if (invalid) {
      setError("Formato inválido. Use PDF, imagem ou documento (DOC/DOCX).");
      return;
    }

    const fileList = Array.from(files);
    const mapped: UploadedFileItem[] = fileList.map((file) => ({
      id: crypto.randomUUID(),
      nome: file.name,
      tipo: file.type || "documento",
      tamanhoKb: Math.max(1, Math.round(file.size / 1024)),
      dataUpload: new Date().toISOString(),
    }));

    const extractedByFile = await Promise.all(fileList.map((file) => extractProcessesFromAttachment(file)));
    const extractedProcesses: ProcessItem[] = extractedByFile
      .flat()
      .map((process) => ({ id: crypto.randomUUID(), ...process }));

    setUploads((prev) => [...mapped, ...prev]);
    setProcesses((prev) => [...extractedProcesses, ...prev]);
    setSuccess(
      `${mapped.length} arquivo(s) anexado(s). ${extractedProcesses.length} processo(s) incluído(s) para revisão.`
    );
    event.target.value = "";
  }

  function removeUpload(id: string) {
    clearMessages();
    setUploads((prev) => prev.filter((file) => file.id !== id));
  }

  function handleDelete(id: string) {
    clearMessages();
    if (!confirm("Excluir este processo da Cadeia de Valor?")) return;
    setProcesses((prev) => prev.filter((process) => process.id !== id));
    setSuccess("Processo removido com sucesso.");
    if (editingId === id) resetForm();
  }

  function handleSaveProcess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearMessages();

    const requiredFields: Array<[string, string]> = [
      ["Macroprocesso", formData.macroprocesso],
      ["Gestor do processo", formData.gestorProcesso],
      ["Última atualização", formData.ultimaAtualizacao],
      ["Responsável pela atualização", formData.responsavelAtualizacao],
    ];

    const emptyField = requiredFields.find(([, value]) => !value.trim());
    if (emptyField) {
      setError(`Preencha o campo obrigatório: ${emptyField[0]}.`);
      return;
    }

    if (editingId) {
      setProcesses((prev) =>
        prev.map((process) => (process.id === editingId ? { ...process, ...formData } : process))
      );
      setSuccess("Processo atualizado com sucesso.");
    } else {
      setProcesses((prev) => [{ id: crypto.randomUUID(), ...formData }, ...prev]);
      setSuccess("Processo adicionado com sucesso.");
    }

    resetForm();
    setManageDialogOpen(false);
  }

  function handleGenerateByAI(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearMessages();

    const firstMissing = AI_QUESTIONS.find((question) => !aiAnswers[question.id].trim());
    if (firstMissing) {
      setError(`Responda o questionário completo antes de gerar: ${firstMissing.label}`);
      return;
    }

    const suggestions = buildAISuggestions(aiAnswers);
    const generated = suggestions.map((item) => ({ id: crypto.randomUUID(), ...item }));
    setProcesses((prev) => [...generated, ...prev]);
    setSuccess(`${generated.length} processos sugeridos por IA incluídos. Revise e ajuste como quiser.`);
    setManageDialogOpen(false);
  }

  function exportProcessListCSV() {
    const headers = [
      "Tipo",
      "Macroprocesso",
      "Nível 1",
      "Nível 2",
      "Nível 3",
      "Gestor do processo",
      "Última atualização",
      "Responsável pela atualização",
      "Prioridade",
      "Status geral",
      ...BPM_STAGES,
    ];

    const rows = filteredSortedProcesses.map((process) => [
      process.tipo,
      process.macroprocesso,
      process.nivel1,
      process.nivel2,
      process.nivel3,
      process.gestorProcesso,
      process.ultimaAtualizacao,
      process.responsavelAtualizacao,
      process.prioridade,
      process.statusGeral,
      ...BPM_STAGES.map((stage) => process.etapas[stage]),
    ]);

    const csvContent = [
      headers.map((header) => toCSVCell(header)).join(";"),
      ...rows.map((row) => row.map((value) => toCSVCell(value)).join(";")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "cadeia-valor-processos.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function exportDiagramImage() {
    const categories = buildHierarchyByCategory(filteredSortedProcesses);
    const width = 1400;
    const padding = 40;
    const cardW = 180;
    const cardH = 56;
    const gap = 12;
    const cols = 5;
    let y = 60;

    let height = 100;

    const escape = (s: string) =>
      s
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");

    const parts: string[] = [];
    parts.push(`<text x="${padding}" y="${y}" font-family="Arial, sans-serif" font-size="22" font-weight="bold" fill="#111827">Diagrama da Cadeia de Valor</text>`);
    y += 50;

    for (const cat of categories) {
      parts.push(`<text x="${padding}" y="${y}" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#374151">${escape(cat.label)}</text>`);
      y += 32;

      let row = 0;
      let col = 0;
      for (const macro of cat.macros) {
        const x = padding + col * (cardW + gap);
        const cy = y + row * (cardH + gap);
        parts.push(`<rect x="${x}" y="${cy}" width="${cardW}" height="${cardH}" fill="#f3f4f6" stroke="#d1d5db" rx="6" />`);
        parts.push(`<text x="${x + cardW / 2}" y="${cy + cardH / 2 - 4}" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#0d9488" text-anchor="middle">${escape(macro.nome)}</text>`);
        parts.push(`<text x="${x + cardW / 2}" y="${cy + cardH / 2 + 10}" font-family="Arial, sans-serif" font-size="10" fill="#6b7280" text-anchor="middle">${macro.processos.length} processo(s)</text>`);
        col += 1;
        if (col >= cols) {
          col = 0;
          row += 1;
        }
      }
      const rowsUsed = Math.ceil(cat.macros.length / cols);
      y += rowsUsed * (cardH + gap) + 24;
    }

    height = Math.max(220, y + 40);

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
        <rect x="0" y="0" width="${width}" height="${height}" fill="#ffffff" />
        ${parts.join("\n        ")}
      </svg>
    `.trim();

    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "cadeia-valor-diagrama.svg";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function exportDiagramPDF() {
    window.print();
  }

  const showingFrom = filteredSortedProcesses.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const showingTo = Math.min(currentPage * PAGE_SIZE, filteredSortedProcesses.length);

  return (
    <PageLayout
      title="Cadeia de Valor"
      description="Visual operacional para alto volume de processos com navegação rápida e visão executiva."
      icon={Network}
      backHref="/escritorio/estrategia"
    >
      <div className="space-y-6">
      {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
      {success && (
        <div className="rounded-md border border-[var(--identity-primary)]/30 bg-[var(--identity-primary)]/10 p-3 text-sm text-foreground">
          {success}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Total de processos</p>
            <p className="text-2xl font-semibold">{kpis.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Em andamento</p>
            <p className="text-2xl font-semibold">{kpis.andamento}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Alta prioridade</p>
            <p className="text-2xl font-semibold">{kpis.altaPrioridade}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Concluído (%)</p>
            <p className="text-2xl font-semibold">{kpis.percentualConcluido}%</p>
          </CardContent>
        </Card>
      </div>

      <Card className="sticky top-0 z-10 border-border/70 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">Controle e Filtros</CardTitle>
              <CardDescription>
                Busque, filtre, ordene e alterne entre lista avançada e diagrama hierárquico.
              </CardDescription>
            </div>
            <Button onClick={() => openManageDialog("manual")}>
              <Plus className="h-4 w-4" />
              Adicionar Cadeia de Valor
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <div className="xl:col-span-2">
              <Label className="mb-1 block text-xs text-muted-foreground">Busca</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(event) => {
                    setSearchTerm(event.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Buscar por processo, gestor, status..."
                  className="pl-8"
                />
              </div>
            </div>

            <div>
              <Label className="mb-1 block text-xs text-muted-foreground">Tipo</Label>
              <Select
                value={filterType}
                onChange={(event) => {
                  setFilterType(event.target.value as ProcessType | "all");
                  setCurrentPage(1);
                }}
              >
                <option value="all">Todos</option>
                {PROCESS_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label className="mb-1 block text-xs text-muted-foreground">Status</Label>
              <Select
                value={filterStatus}
                onChange={(event) => {
                  setFilterStatus(event.target.value as GeneralStatus | "all");
                  setCurrentPage(1);
                }}
              >
                <option value="all">Todos</option>
                {GENERAL_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label className="mb-1 block text-xs text-muted-foreground">Prioridade</Label>
              <Select
                value={filterPriority}
                onChange={(event) => {
                  setFilterPriority(event.target.value as Priority | "all");
                  setCurrentPage(1);
                }}
              >
                <option value="all">Todas</option>
                {PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label className="mb-1 block text-xs text-muted-foreground">Macroprocesso</Label>
              <Select
                value={filterMacroprocesso}
                onChange={(event) => {
                  setFilterMacroprocesso(event.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="all">Todos</option>
                {macroprocessOptions.map((macro) => (
                  <option key={macro} value={macro}>
                    {macro}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Label className="text-xs text-muted-foreground">Ordenação</Label>
              <Select
                className="w-[230px]"
                value={sortMode}
                onChange={(event) => setSortMode(event.target.value as SortMode)}
              >
                {SORT_OPTIONS.map((sort) => (
                  <option key={sort.value} value={sort.value}>
                    {sort.label}
                  </option>
                ))}
              </Select>
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Limpar filtros
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)}>
                <TabsList>
                  <TabsTrigger value="lista">Lista Avançada</TabsTrigger>
                  <TabsTrigger value="hierarquia">Arquitetura Hierárquica</TabsTrigger>
                </TabsList>
              </Tabs>
              <Button variant="outline" size="sm" onClick={exportProcessListCSV}>
                <Download className="h-4 w-4" />
                Exportar planilha
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {viewMode === "lista" ? (
        <Card>
          <CardHeader>
            <CardTitle>Lista de Processos</CardTitle>
            <CardDescription>
              Exibindo {showingFrom}-{showingTo} de {filteredSortedProcesses.length} processos filtrados.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Processo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>BPM</TableHead>
                  <TableHead>Gestor</TableHead>
                  <TableHead>Atualização</TableHead>
                  <TableHead className="w-[220px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedProcesses.map((process) => {
                  const bpm = getBpmSummary(process.etapas);
                  return (
                    <TableRow key={process.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium">{normalizeLevel(process.macroprocesso, "Sem Macroprocesso")}</p>
                          <p className="text-xs text-muted-foreground">
                            {normalizeLevel(process.nivel1, "Sem Nível 1")} • {normalizeLevel(process.nivel2, "Sem Nível 2")} •{" "}
                            {normalizeLevel(process.nivel3, "Sem Nível 3")}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{process.tipo}</TableCell>
                      <TableCell>
                        <Badge variant={getGeneralStatusVariant(process.statusGeral)}>{process.statusGeral}</Badge>
                      </TableCell>
                      <TableCell>{process.prioridade}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="outline">NI: {bpm.naoIniciado}</Badge>
                          <Badge variant="warning">EA: {bpm.emAndamento}</Badge>
                          <Badge variant="success">C: {bpm.concluido}</Badge>
                        </div>
                      </TableCell>
                      <TableCell>{process.gestorProcesso}</TableCell>
                      <TableCell className="text-xs">
                        <p>{formatDateTime(process.ultimaAtualizacao)}</p>
                        <p className="text-muted-foreground">{process.responsavelAtualizacao}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          <Button size="sm" variant="ghost" onClick={() => openEditDialog(process)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(process.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Link href={`/escritorio/demandas?processo=${process.id}`}>
                            <Button size="sm" variant="outline">
                              <ExternalLink className="h-4 w-4" />
                              Acessar processo
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}

                {paginatedProcesses.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                      Nenhum processo encontrado para os filtros aplicados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Página {currentPage} de {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((current) => Math.max(1, current - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((current) => Math.min(totalPages, current + 1))}
                >
                  Próxima
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card id="cadeia-valor-diagrama">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle>Diagrama da Cadeia de Valor</CardTitle>
                <CardDescription>
                  Visão por categorias (Negócio, Gestão, Apoio) com grid de macroprocessos. Clique em um macro para ver os processos.
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={exportDiagramPDF}>
                  <FileText className="h-4 w-4" />
                  Exportar PDF
                </Button>
                <Button variant="outline" onClick={exportDiagramImage}>
                  <FileImage className="h-4 w-4" />
                  Exportar imagem
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {hierarchyByCategory.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum processo encontrado.</p>
            ) : (
              <div className="space-y-8">
                {hierarchyByCategory.map((category) => (
                  <div key={category.tipo} className="space-y-3">
                    <h3 className="text-base font-semibold text-foreground border-b pb-2">
                      {category.label}
                    </h3>
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                      {category.macros.map((macro) => {
                        const expandKey = `${category.tipo}::${macro.nome}`;
                        const isExpanded = expandedMacro === expandKey;
                        return (
                          <div
                            key={expandKey}
                            className={cn("space-y-2", isExpanded && "col-span-2 md:col-span-3 lg:col-span-4 xl:col-span-5")}
                          >
                            <button
                              type="button"
                              onClick={() => setExpandedMacro(isExpanded ? null : expandKey)}
                              className="w-full min-h-[72px] flex flex-col items-center justify-center gap-1 rounded-lg border bg-muted/30 hover:bg-muted/50 p-3 text-center transition-colors"
                            >
                              <p className="font-semibold text-sm text-[var(--identity-primary)] leading-tight break-words">
                                {macro.nome}
                              </p>
                              <Badge variant="outline" className="text-xs">
                                {macro.processos.length} processo{macro.processos.length !== 1 ? "s" : ""}
                              </Badge>
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              )}
                            </button>
                            {isExpanded && (
                              <div className="rounded-lg border p-4 space-y-4 bg-background">
                                <div className="flex flex-col items-center w-full">
                                  <div className="rounded-lg border-2 border-muted bg-background p-3 min-w-[180px] max-w-[280px]">
                                    <p className="font-semibold text-sm text-[var(--identity-primary)] text-center break-words">
                                      {macro.nome}
                                    </p>
                                  </div>
                                  <FlowchartArrowDown className="my-1" />
                                  <div className="w-full max-w-full border-t-2 border-muted my-1" />
                                  <div className="flex flex-row flex-wrap justify-center gap-6 py-4 rounded-lg border border-dashed border-muted/50 bg-muted/5 px-4 overflow-x-auto">
                                    {buildProcessTree(macro.processos).map((rootNode) => (
                                      <ProcessFlowchartNode
                                        key={rootNode.label}
                                        node={rootNode}
                                        macroNome={macro.nome}
                                        onEdit={openEditDialog}
                                      />
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={manageDialogOpen} onOpenChange={setManageDialogOpen}>
        <DialogContent className="max-h-[85vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar processo" : "Adicionar Cadeia de Valor"}</DialogTitle>
            <DialogDescription>
              Escolha o método de inclusão e mantenha a estrutura atualizada para acompanhamento dos módulos BPM.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={creationMode} onValueChange={(value) => setCreationMode(value as CreationMode)}>
            <TabsList className="w-full md:w-auto">
              <TabsTrigger value="anexar">Anexar arquivo</TabsTrigger>
              <TabsTrigger value="manual">Criar manualmente</TabsTrigger>
              <TabsTrigger value="ia">Gerar com IA</TabsTrigger>
            </TabsList>

            <TabsContent value="anexar" className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="arquivo-cadeia">
                  Cadeia existente (PDF, imagem ou documento). Os processos serão inseridos automaticamente.
                </Label>
                <Input
                  id="arquivo-cadeia"
                  type="file"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.txt"
                  onChange={handleFileUpload}
                />
              </div>

              <div className="space-y-2">
                {uploads.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum arquivo anexado.</p>
                ) : (
                  uploads.map((upload) => (
                    <div
                      key={upload.id}
                      className="flex items-center justify-between rounded-md border p-3 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{upload.nome}</p>
                        <p className="text-muted-foreground">
                          {upload.tamanhoKb} KB • {formatDateTime(upload.dataUpload)}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeUpload(upload.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="manual" className="mt-4">
              <form onSubmit={handleSaveProcess} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select
                      value={formData.tipo}
                      onChange={(event) => handleBasicFieldChange("tipo", event.target.value as ProcessType)}
                    >
                      {PROCESS_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Macroprocesso</Label>
                    <Input
                      value={formData.macroprocesso}
                      onChange={(event) => handleBasicFieldChange("macroprocesso", event.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Nível 1 (opcional)</Label>
                    <Input
                      value={formData.nivel1}
                      onChange={(event) => handleBasicFieldChange("nivel1", event.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Nível 2 (opcional)</Label>
                    <Input
                      value={formData.nivel2}
                      onChange={(event) => handleBasicFieldChange("nivel2", event.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Nível 3 (opcional)</Label>
                    <Input
                      value={formData.nivel3}
                      onChange={(event) => handleBasicFieldChange("nivel3", event.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Gestor do processo</Label>
                    <Input
                      value={formData.gestorProcesso}
                      onChange={(event) => handleBasicFieldChange("gestorProcesso", event.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Última atualização</Label>
                    <Input
                      type="datetime-local"
                      value={formData.ultimaAtualizacao}
                      onChange={(event) => handleBasicFieldChange("ultimaAtualizacao", event.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Responsável pela atualização</Label>
                    <Input
                      value={formData.responsavelAtualizacao}
                      onChange={(event) =>
                        handleBasicFieldChange("responsavelAtualizacao", event.target.value)
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Prioridade</Label>
                    <Select
                      value={formData.prioridade}
                      onChange={(event) => handleBasicFieldChange("prioridade", event.target.value as Priority)}
                    >
                      {PRIORITIES.map((priority) => (
                        <option key={priority} value={priority}>
                          {priority}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Status geral</Label>
                    <Select
                      value={formData.statusGeral}
                      onChange={(event) =>
                        handleBasicFieldChange("statusGeral", event.target.value as GeneralStatus)
                      }
                    >
                      {GENERAL_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>

                <div className="rounded-md border p-4 space-y-3">
                  <p className="font-medium">Etapas do ciclo BPM</p>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {BPM_STAGES.map((stage) => (
                      <div key={stage} className="space-y-1">
                        <Label>{stage}</Label>
                        <Select
                          value={formData.etapas[stage]}
                          onChange={(event) => handleStageStatusChange(stage, event.target.value as StageStatus)}
                        >
                          {STAGE_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </Select>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button type="submit">
                    {editingId ? (
                      <>
                        <Pencil className="h-4 w-4" />
                        Atualizar processo
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        Adicionar processo
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      resetForm();
                      setManageDialogOpen(false);
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="ia" className="mt-4">
              <form onSubmit={handleGenerateByAI} className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Responda o questionário para gerar uma sugestão estruturada de Cadeia de Valor.
                </p>
                <div className="grid gap-4">
                  {AI_QUESTIONS.map((question) => (
                    <div key={question.id} className="space-y-2">
                      <Label>{question.label}</Label>
                      <Textarea
                        value={aiAnswers[question.id]}
                        onChange={(event) =>
                          setAiAnswers((current) => ({ ...current, [question.id]: event.target.value }))
                        }
                        rows={3}
                        required
                      />
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button type="submit">
                    <WandSparkles className="h-4 w-4" />
                    Gerar sugestão por IA
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setManageDialogOpen(false)}>
                    Fechar
                  </Button>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
      </div>
    </PageLayout>
  );
}
