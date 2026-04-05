"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { Button, buttonVariants } from "@/components/ui/button";
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
  Loader2,
  Network,
  Pencil,
  Plus,
  Search,
  Trash2,
  WandSparkles,
} from "lucide-react";
import { PageLayout } from "@/components/layout/page-layout";
import {
  extractValueChainImport,
  isAcceptedValueChainImportFilename,
  type ValueChainStructuredRow,
} from "@/lib/cadeia-valor/extract-attachment";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import {
  BPM_STAGES,
  type BPMStage,
  type GeneralStatus,
  type Priority,
  type ProcessItem,
  type ProcessType,
  type StageStatus,
} from "@/types/cadeia-valor";
import {
  deleteValueChainOfficeProcess,
  deleteValueChainOfficeProcesses,
  importCadeiaValorFromLocalStorageJson,
  syncAllValueChainProcesses,
} from "@/app/escritorio/processos/value-chain-actions";

type ViewMode = "lista" | "hierarquia";
type CreationMode = "anexar" | "manual" | "ia";
type SortMode =
  | "atualizacao_desc"
  | "atualizacao_asc"
  | "macro_asc"
  | "macro_desc"
  | "prioridade";

interface ProcessFormData {
  tipo: string;
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
  filterType: string | "all";
  filterStatus: GeneralStatus | "all";
  filterPriority: Priority | "all";
  filterMacroprocesso: string;
  sortMode: SortMode;
  currentPage: number;
}

interface CategoryGroup {
  label: string;
  tipo: string;
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

const CATEGORY_LABELS: Record<ProcessType, string> = {
  Primário: "Processos de Negócio",
  Gerencial: "Processos de Gestão",
  Apoio: "Processos de Suporte",
};

function categoryDisplayLabel(tipo: string): string {
  const t = tipo.trim();
  if (!t) return "Sem tipo";
  if (t === "Primário" || t === "Apoio" || t === "Gerencial") return CATEGORY_LABELS[t];
  return t;
}

const STORAGE_KEY_PROCESSES = "cadeia-valor-processos";
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

/** Título em destaque na lista: último nível preenchido (3 → 2 → 1), ou macroprocesso se todos vazios. */
function processHighlightTitle(process: ProcessItem): string {
  const n3 = process.nivel3.trim();
  const n2 = process.nivel2.trim();
  const n1 = process.nivel1.trim();
  if (n3) return n3;
  if (n2) return n2;
  if (n1) return n1;
  return normalizeLevel(process.macroprocesso, "Sem Macroprocesso");
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

function structuredRowToFormData(row: ValueChainStructuredRow): ProcessFormData {
  return {
    tipo: row.tipo,
    macroprocesso: row.macroprocesso,
    nivel1: row.nivel1,
    nivel2: row.nivel2,
    nivel3: row.nivel3,
    gestorProcesso: "Definir gestor",
    ultimaAtualizacao: new Date().toISOString().slice(0, 16),
    responsavelAtualizacao: "Extração por planilha (revisar)",
    prioridade: "Média",
    statusGeral: "Não iniciado",
    etapas: createDefaultStages("Não iniciado"),
  };
}

async function extractProcessesFromAttachment(file: File): Promise<ProcessFormData[]> {
  const fallbackMacro = cleanFileName(file.name) || "Macroprocesso do anexo";

  try {
    const result = await extractValueChainImport(file);
    if (result.mode === "structured") {
      return result.rows.map(structuredRowToFormData);
    }
    const lines = result.lines;
    const candidates = lines
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
  const byTipo = new Map<string, Map<string, ProcessItem[]>>();

  for (const process of processes) {
    const tipo = process.tipo.trim() || "Sem tipo";
    const macro = normalizeLevel(process.macroprocesso, "Sem Macroprocesso");

    if (!byTipo.has(tipo)) byTipo.set(tipo, new Map());
    const mapMacro = byTipo.get(tipo)!;
    if (!mapMacro.has(macro)) mapMacro.set(macro, []);
    mapMacro.get(macro)!.push(process);
  }

  const allTipos = [...byTipo.keys()];
  const orderedTipos = allTipos
    .filter((t) => t !== "Sem tipo")
    .sort((a, b) => a.localeCompare(b, "pt-BR"));
  if (allTipos.includes("Sem tipo")) orderedTipos.push("Sem tipo");

  const result: CategoryGroup[] = [];
  for (const tipo of orderedTipos) {
    const mapMacro = byTipo.get(tipo);
    if (!mapMacro || mapMacro.size === 0) continue;

    const macros = [...mapMacro.entries()]
      .map(([nome, processos]) => ({ nome, processos }))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

    result.push({
      label: tipo === "Sem tipo" ? "Sem tipo" : tipo,
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

function deleteServerIgnoredError(res: { success?: boolean; error?: string }): boolean {
  if (res.success === true) return true;
  return res.error === "Processo não encontrado.";
}

export function CadeiaValorClient({ initialProcesses }: { initialProcesses: ProcessItem[] }) {
  const router = useRouter();
  const [processes, setProcesses] = useState<ProcessItem[]>(initialProcesses);
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
  const [filterType, setFilterType] = useState<string | "all">(DEFAULT_UI_STATE.filterType);
  const [filterStatus, setFilterStatus] = useState<GeneralStatus | "all">(DEFAULT_UI_STATE.filterStatus);
  const [filterPriority, setFilterPriority] = useState<Priority | "all">(DEFAULT_UI_STATE.filterPriority);
  const [filterMacroprocesso, setFilterMacroprocesso] = useState(DEFAULT_UI_STATE.filterMacroprocesso);
  const [sortMode, setSortMode] = useState<SortMode>(DEFAULT_UI_STATE.sortMode);
  const [currentPage, setCurrentPage] = useState(DEFAULT_UI_STATE.currentPage);
  const [expandedMacro, setExpandedMacro] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const selectAllCheckboxRef = useRef<HTMLInputElement>(null);
  /** Evita corrida: o sync debounced (2s) não pode correr durante/após delete e regravar o registo no servidor. */
  const [syncPaused, setSyncPaused] = useState(false);
  const [bulkDeletePending, setBulkDeletePending] = useState(false);
  const [importFilePending, setImportFilePending] = useState(false);

  useEffect(() => {
    try {
      localStorage.removeItem("cadeia-valor-anexos");
    } catch {
      // no-op
    }

    const storedUI = localStorage.getItem(STORAGE_KEY_UI);

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
    if (!hydrated || syncPaused) return;
    const handle = setTimeout(() => {
      void syncAllValueChainProcesses(processes);
    }, 2000);
    return () => clearTimeout(handle);
  }, [hydrated, processes, syncPaused]);

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

  const tipoFilterOptions = useMemo(() => {
    const unique = new Set(processes.map((process) => process.tipo.trim()).filter((value) => value.length > 0));
    return [...unique].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [processes]);

  useEffect(() => {
    if (filterType === "all") return;
    if (!tipoFilterOptions.includes(filterType)) setFilterType("all");
  }, [filterType, tipoFilterOptions]);

  const filteredSortedProcesses = useMemo(() => {
    const text = searchTerm.trim().toLowerCase();
    const filtered = processes.filter((process) => {
      if (filterType !== "all" && process.tipo.trim() !== filterType) return false;
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

  const pageRowIds = useMemo(() => paginatedProcesses.map((p) => p.id), [paginatedProcesses]);

  const pageSelectionState = useMemo(() => {
    if (pageRowIds.length === 0) return { all: false, some: false };
    const n = pageRowIds.filter((id) => selectedIds.includes(id)).length;
    return { all: n === pageRowIds.length, some: n > 0 && n < pageRowIds.length };
  }, [pageRowIds, selectedIds]);

  useEffect(() => {
    const el = selectAllCheckboxRef.current;
    if (el) el.indeterminate = pageSelectionState.some;
  }, [pageSelectionState]);

  useEffect(() => {
    const valid = new Set(processes.map((p) => p.id));
    setSelectedIds((prev) => prev.filter((id) => valid.has(id)));
  }, [processes]);

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
    setUploads([]);
    setImportFilePending(false);
    resetForm();
    setCreationMode(mode);
    setManageDialogOpen(true);
  }

  function openEditDialog(process: ProcessItem) {
    clearMessages();
    setUploads([]);
    setImportFilePending(false);
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

  function handleManageDialogOpenChange(open: boolean) {
    setManageDialogOpen(open);
    if (!open) {
      setUploads([]);
      setImportFilePending(false);
      resetForm();
    }
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

    const invalid = Array.from(files).find((file) => !isAcceptedValueChainImportFilename(file.name));
    if (invalid) {
      setError("Formato inválido. Use planilha Excel (.xls, .xlsx), CSV ou TXT.");
      return;
    }

    const fileList = Array.from(files);
    setImportFilePending(true);
    try {
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

      setProcesses((prev) => [...extractedProcesses, ...prev]);
      setSuccess(
        `${mapped.length} arquivo(s) anexado(s). ${extractedProcesses.length} processo(s) incluído(s) para revisão.`
      );
      setUploads([]);
      setManageDialogOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível processar o ficheiro.");
    } finally {
      setImportFilePending(false);
      event.target.value = "";
    }
  }

  function removeUpload(id: string) {
    clearMessages();
    setUploads((prev) => prev.filter((file) => file.id !== id));
  }

  async function handleDelete(id: string) {
    clearMessages();
    if (!confirm("Excluir este processo da Cadeia de Valor?")) return;
    setSyncPaused(true);
    try {
      const res = await deleteValueChainOfficeProcess(id);
      if (!deleteServerIgnoredError(res)) {
        setError(
          typeof res.error === "string" ? res.error : "Não foi possível excluir o processo."
        );
        return;
      }
      setProcesses((prev) => prev.filter((process) => process.id !== id));
      setSelectedIds((prev) => prev.filter((x) => x !== id));
      setSuccess("Processo removido com sucesso.");
      if (editingId === id) resetForm();
      void router.refresh();
    } finally {
      setSyncPaused(false);
    }
  }

  function toggleProcessSelected(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function toggleSelectCurrentPage() {
    setSelectedIds((prev) => {
      if (pageRowIds.length === 0) return prev;
      const allSelected = pageRowIds.every((id) => prev.includes(id));
      if (allSelected) {
        return prev.filter((id) => !pageRowIds.includes(id));
      }
      return [...new Set([...prev, ...pageRowIds])];
    });
  }

  async function handleDeleteSelected() {
    if (selectedIds.length === 0) return;
    clearMessages();
    const n = selectedIds.length;
    if (
      !confirm(
        n === 1
          ? "Excluir este processo da Cadeia de Valor?"
          : `Excluir ${n} processos da Cadeia de Valor?`
      )
    ) {
      return;
    }
    const ids = [...selectedIds];
    setBulkDeletePending(true);
    setSyncPaused(true);
    try {
      const res = await deleteValueChainOfficeProcesses(ids);
      if (!deleteServerIgnoredError(res)) {
        setError(
          typeof res.error === "string" ? res.error : "Não foi possível excluir os processos."
        );
        return;
      }
      const toRemove = new Set(ids);
      setProcesses((prev) => prev.filter((p) => !toRemove.has(p.id)));
      setSelectedIds([]);
      setSuccess(n === 1 ? "Processo removido com sucesso." : `${n} processos removidos com sucesso.`);
      if (editingId && toRemove.has(editingId)) resetForm();
      void router.refresh();
    } finally {
      setBulkDeletePending(false);
      setSyncPaused(false);
    }
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
    const width = 1200;
    const padding = 40;
    const cardW = 220;
    const cardH = 36;
    const gap = 12;
    const indent = 24;
    let y = 50;

    const escape = (s: string) =>
      s
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");

    function wrapText(text: string, maxW: number): string[] {
      const words = text.split(/\s+/);
      const lines: string[] = [];
      let line = "";
      for (const w of words) {
        const test = line ? `${line} ${w}` : w;
        if (test.length * 7 <= maxW) line = test;
        else {
          if (line) lines.push(line);
          line = w;
        }
      }
      if (line) lines.push(line);
      return lines;
    }

    const parts: string[] = [];
    parts.push(`<text x="${padding}" y="${y}" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#111827">Diagrama da Cadeia de Valor</text>`);
    y += 44;

    for (const cat of categories) {
      parts.push(`<text x="${padding}" y="${y}" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#374151">${escape(cat.label)}</text>`);
      y += 28;

      for (const macro of cat.macros) {
        const mx = padding;
        parts.push(`<rect x="${mx}" y="${y}" width="${cardW}" height="${cardH}" fill="#f3f4f6" stroke="#0d9488" stroke-width="2" rx="6" />`);
        const macroLines = wrapText(macro.nome, cardW - 16);
        macroLines.forEach((line, i) => {
          parts.push(`<text x="${mx + cardW / 2}" y="${y + cardH / 2 - (macroLines.length - 1) * 6 + i * 12}" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#0d9488" text-anchor="middle">${escape(line)}</text>`);
        });
        y += cardH + 8;

        const roots = buildProcessTree(macro.processos);
        for (const root of roots) {
          parts.push(`<line x1="${mx + cardW / 2}" y1="${y - 8}" x2="${mx + cardW / 2}" y2="${y}" stroke="#9ca3af" stroke-width="1" />`);
          y += 4;
          const drawNode = (node: ProcessTreeNode, depth: number) => {
            const nx = mx + indent * depth;
            const nodeW = Math.max(120, cardW - indent * depth);
            parts.push(`<rect x="${nx}" y="${y}" width="${nodeW}" height="${cardH}" fill="#f9fafb" stroke="#d1d5db" rx="4" />`);
            const lines = wrapText(node.label, nodeW - 16);
            lines.forEach((line, i) => {
              parts.push(`<text x="${nx + nodeW / 2}" y="${y + cardH / 2 - (lines.length - 1) * 5 + i * 10}" font-family="Arial, sans-serif" font-size="10" fill="#374151" text-anchor="middle">${escape(line)}</text>`);
            });
            y += cardH + gap;
            for (const child of node.children) {
              const childNx = mx + indent * (depth + 1);
              const childW = Math.max(120, cardW - indent * (depth + 1));
              parts.push(`<line x1="${nx + nodeW / 2}" y1="${y - gap}" x2="${childNx + childW / 2}" y2="${y}" stroke="#9ca3af" stroke-width="1" />`);
              drawNode(child, depth + 1);
            }
          };
          drawNode(root, 0);
          y += 8;
        }
        y += 16;
      }
      y += 12;
    }

    const height = Math.max(400, y + 40);
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
    const categories = buildHierarchyByCategory(filteredSortedProcesses);
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 15;
    let y = 20;

    const drawTitle = (text: string, fontSize: number, bold: boolean) => {
      if (y > pageH - 20) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(fontSize);
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.text(text, margin, y);
      y += fontSize * 0.5 + 2;
    };

    const drawBox = (text: string, indentMm: number) => {
      if (y > pageH - 25) {
        doc.addPage();
        y = 20;
      }
      const x = margin + indentMm;
      const w = pageW - 2 * margin - indentMm;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(text, w - 4);
      const boxH = Math.max(10, lines.length * 5 + 4);
      doc.rect(x, y - 4, w, boxH);
      doc.text(lines, x + 2, y + 2);
      y += boxH + 4;
    };

    drawTitle("Diagrama da Cadeia de Valor", 16, true);
    y += 4;

    for (const cat of categories) {
      drawTitle(cat.label, 12, true);
      y += 2;

      for (const macro of cat.macros) {
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(13, 148, 136);
        doc.text(macro.nome, margin, y);
        doc.setTextColor(0, 0, 0);
        y += 8;

        const roots = buildProcessTree(macro.processos);
          const drawNode = (node: ProcessTreeNode, depth: number) => {
            if (y > pageH - 20) {
              doc.addPage();
              y = 20;
            }
            drawBox(node.label, depth * 8);
          for (const child of node.children) {
            drawNode(child, depth + 1);
          }
        };
        for (const root of roots) {
          drawNode(root, 0);
        }
        y += 6;
      }
      y += 8;
    }

    doc.save("cadeia-valor-diagrama.pdf");
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
                  setFilterType(event.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="all">Todos</option>
                {tipoFilterOptions.map((type) => (
                  <option key={type} value={type}>
                    {categoryDisplayLabel(type)}
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
            {selectedIds.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
                <span className="text-sm font-medium">
                  {selectedIds.length} processo(s) selecionado(s)
                </span>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={bulkDeletePending}
                  onClick={() => void handleDeleteSelected()}
                >
                  {bulkDeletePending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      Excluindo…
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" aria-hidden />
                      Excluir selecionados
                    </>
                  )}
                </Button>
                <Button size="sm" variant="ghost" type="button" onClick={() => setSelectedIds([])}>
                  Limpar seleção
                </Button>
              </div>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[44px]">
                    <span className="sr-only">Selecionar</span>
                    <input
                      ref={selectAllCheckboxRef}
                      type="checkbox"
                      checked={pageSelectionState.all && pageRowIds.length > 0}
                      onChange={toggleSelectCurrentPage}
                      disabled={paginatedProcesses.length === 0}
                      className="rounded border-input"
                      aria-label="Selecionar todos os processos desta página"
                    />
                  </TableHead>
                  <TableHead>Processo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Macroprocesso</TableHead>
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
                      <TableCell className="align-middle">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(process.id)}
                          onChange={() => toggleProcessSelected(process.id)}
                          className="rounded border-input"
                          aria-label={`Selecionar processo ${processHighlightTitle(process)}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium">{processHighlightTitle(process)}</p>
                          <p className="text-xs text-muted-foreground">
                            {normalizeLevel(process.nivel1, "Sem Nível 1")} • {normalizeLevel(process.nivel2, "Sem Nível 2")} •{" "}
                            {normalizeLevel(process.nivel3, "Sem Nível 3")}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{process.tipo}</TableCell>
                      <TableCell>{normalizeLevel(process.macroprocesso, "Sem Macroprocesso")}</TableCell>
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
                    <TableCell colSpan={10} className="py-10 text-center text-muted-foreground">
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
                  Agrupamento por tipo cadastrado e macroprocesso. Expanda um macro para ver a árvore de níveis dos processos.
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
                {hierarchyByCategory.map((category, categoryIndex) => (
                  <div key={`${category.tipo || "sem"}-${categoryIndex}`} className="space-y-3">
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

      <Dialog open={manageDialogOpen} onOpenChange={handleManageDialogOpenChange}>
        <DialogContent className="max-h-[85vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar processo na Cadeia de Valor" : "Adicionar Cadeia de Valor"}
            </DialogTitle>
            <DialogDescription>
              Inclusão de instâncias de processo na cadeia de valor do escritório e parametrização do ciclo BPM.
              Selecione o modo de entrada.
            </DialogDescription>
          </DialogHeader>

          <Tabs
            value={creationMode}
            onValueChange={(value) => {
              const v = value as CreationMode;
              setCreationMode(v);
              if (v === "manual") {
                setUploads([]);
                setImportFilePending(false);
              }
            }}
          >
            <TabsList className="w-full md:w-auto">
              <TabsTrigger value="anexar">Importação por ficheiro</TabsTrigger>
              <TabsTrigger value="manual">Registo unitário</TabsTrigger>
              <TabsTrigger value="ia">Geração assistida</TabsTrigger>
            </TabsList>

            <TabsContent value="anexar" className="mt-4 space-y-4">
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground leading-snug">
                  Importação estruturada em lote: cada linha de dados após o cabeçalho materializa uma instância de
                  processo na lista. Formatos suportados: .xls, .xlsx, .csv ou .txt. Utilize o modelo (primeira linha =
                  cabeçalhos).
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href="/modelo-importacao-cadeia-valor.csv"
                    download="modelo-importacao-cadeia-valor.csv"
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                  >
                    <Download className="h-4 w-4" aria-hidden />
                    Baixar modelo (CSV)
                  </a>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="arquivo-cadeia">Carregar ficheiro</Label>
                  <Input
                    id="arquivo-cadeia"
                    type="file"
                    multiple
                    disabled={importFilePending}
                    accept=".xls,.xlsx,.csv,.txt,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,text/plain"
                    onChange={handleFileUpload}
                  />
                </div>
                {importFilePending && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status" aria-live="polite">
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                    A processar ficheiro…
                  </div>
                )}
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

            <TabsContent value="manual" className="mt-4 space-y-6 pb-2">
              <form onSubmit={handleSaveProcess} className="space-y-8">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Registo unitário: uma instância de processo por submissão, com classificação (tipo, macroprocesso) e
                  níveis hierárquicos opcionais. Alterações e ciclo BPM aplicam-se ao processo corrente.
                </p>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Estrutura na cadeia</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Classificação e desdobramento do processo na cadeia de valor.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
                    <div className="space-y-2 min-w-0">
                      <Label htmlFor="form-tipo-cadeia">Tipo</Label>
                      <Input
                        id="form-tipo-cadeia"
                        list="cadeia-valor-tipos-sugestao"
                        value={formData.tipo}
                        onChange={(event) => handleBasicFieldChange("tipo", event.target.value)}
                        placeholder="Ex.: Gestão, Primário, Apoio…"
                        required
                        className="w-full"
                      />
                      <datalist id="cadeia-valor-tipos-sugestao">
                        {PROCESS_TYPES.map((type) => (
                          <option key={type} value={type} />
                        ))}
                      </datalist>
                    </div>

                    <div className="space-y-2 min-w-0">
                      <Label htmlFor="form-macro-cadeia">Macroprocesso</Label>
                      <Input
                        id="form-macro-cadeia"
                        value={formData.macroprocesso}
                        onChange={(event) => handleBasicFieldChange("macroprocesso", event.target.value)}
                        required
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Níveis do processo (opcional)
                    </p>
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="form-n1-cadeia">Nível 1</Label>
                        <Input
                          id="form-n1-cadeia"
                          value={formData.nivel1}
                          onChange={(event) => handleBasicFieldChange("nivel1", event.target.value)}
                          className="w-full"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="form-n2-cadeia">Nível 2</Label>
                        <Input
                          id="form-n2-cadeia"
                          value={formData.nivel2}
                          onChange={(event) => handleBasicFieldChange("nivel2", event.target.value)}
                          className="w-full"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="form-n3-cadeia">Nível 3</Label>
                        <Input
                          id="form-n3-cadeia"
                          value={formData.nivel3}
                          onChange={(event) => handleBasicFieldChange("nivel3", event.target.value)}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Gestão e acompanhamento</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Responsáveis, datas e estado geral do processo.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
                    <div className="space-y-2 min-w-0 md:col-span-2">
                      <Label htmlFor="form-gestor-cadeia">Gestor do processo</Label>
                      <Input
                        id="form-gestor-cadeia"
                        value={formData.gestorProcesso}
                        onChange={(event) => handleBasicFieldChange("gestorProcesso", event.target.value)}
                        required
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-2 min-w-0">
                      <Label htmlFor="form-atualizacao-cadeia">Última atualização</Label>
                      <Input
                        id="form-atualizacao-cadeia"
                        type="datetime-local"
                        value={formData.ultimaAtualizacao}
                        onChange={(event) => handleBasicFieldChange("ultimaAtualizacao", event.target.value)}
                        required
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-2 min-w-0">
                      <Label htmlFor="form-resp-cadeia">Responsável pela atualização</Label>
                      <Input
                        id="form-resp-cadeia"
                        value={formData.responsavelAtualizacao}
                        onChange={(event) =>
                          handleBasicFieldChange("responsavelAtualizacao", event.target.value)
                        }
                        required
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-2 min-w-0">
                      <Label htmlFor="form-prioridade-cadeia">Prioridade</Label>
                      <Select
                        id="form-prioridade-cadeia"
                        value={formData.prioridade}
                        onChange={(event) => handleBasicFieldChange("prioridade", event.target.value as Priority)}
                        className="w-full min-w-0"
                      >
                        {PRIORITIES.map((priority) => (
                          <option key={priority} value={priority}>
                            {priority}
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div className="space-y-2 min-w-0">
                      <Label htmlFor="form-status-cadeia">Status geral</Label>
                      <Select
                        id="form-status-cadeia"
                        value={formData.statusGeral}
                        onChange={(event) =>
                          handleBasicFieldChange("statusGeral", event.target.value as GeneralStatus)
                        }
                        className="w-full min-w-0"
                      >
                        {GENERAL_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-border/80 bg-muted/20 p-4 sm:p-5 space-y-4 min-w-0">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Etapas do ciclo BPM</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Estado de cada fase do ciclo neste processo.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-5 min-w-0">
                    {BPM_STAGES.map((stage, stageIndex) => (
                      <div key={stage} className="space-y-2 min-w-0">
                        <Label className="text-sm leading-tight" htmlFor={`cadeia-bpm-stage-${stageIndex}`}>
                          {stage}
                        </Label>
                        <Select
                          id={`cadeia-bpm-stage-${stageIndex}`}
                          value={formData.etapas[stage]}
                          onChange={(event) => handleStageStatusChange(stage, event.target.value as StageStatus)}
                          className="w-full min-w-0"
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

                <div className="flex flex-wrap gap-2 border-t border-border/60 pt-4">
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
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Geração assistida de um conjunto de processos a partir do questionário; exige revisão antes de
                  consolidar as entradas na lista da cadeia de valor.
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
