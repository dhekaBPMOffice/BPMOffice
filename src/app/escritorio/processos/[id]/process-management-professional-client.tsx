"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type {
  OfficeProcessAttachmentType,
  OfficeProcessEssentialDetails,
  OfficeProcessProfessionalAction,
  OfficeProcessProfessionalActionStatus,
  OfficeProcessProfessionalDetails,
  OfficeProcessProfessionalMaterial,
  OfficeProcessProfessionalOpportunity,
  OfficeProcessProfessionalProblem,
  OfficeProcessProfessionalProblemStatus,
  OfficeProcessProfessionalQuestion,
  OfficeProcessProfessionalRecord,
  OfficeProcessProfessionalRecordAnswer,
  OfficeProcessProfessionalRecordAttachment,
  OfficeProcessProfessionalRecordStatus,
  OfficeProcessProfessionalRecordType,
  OfficeProcessProfessionalScriptBlock,
  OfficeProcessProfessionalScriptQuestion,
  OfficeProcessProfessionalScriptStatus,
  OfficeProcessProfessionalSurveyScript,
  OfficeProcessStatus,
  ProcessFlowchartFile,
} from "@/types/database";
import { Document, Packer, Paragraph, TextRun } from "docx";
import {
  addOfficeProcessAttachment,
  deleteOfficeProcessAttachment,
  updateOfficeProcessDetails,
} from "../actions";
import { uploadOfficeProcessFileViaApi } from "@/lib/office-process-file-upload-client";
import { displayTemplateName, fileNameFromUrl } from "@/lib/process-file-display";
import { OFFICE_PROCESS_STATUS_META } from "@/lib/processes";
import { formatDateTimePtBr } from "@/lib/timezone";
import { useTimeZone } from "@/components/providers/timezone-provider";
import { useIdentity } from "@/components/providers/identity-provider";
import { runDocumentExport } from "@/lib/export/run-document-export";
import type { ConsolidationExportData } from "@/lib/export/consolidation-export-fields";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { ProcessTypeSelect } from "@/components/processes/process-type-select";
import { ProcessWorkspaceFormSection } from "./process-workspace-form-section";
import { ProcessWorkspaceShell } from "./process-workspace-shell";
import { ProcessWorkspaceJourneyBar, type JourneyBarTab } from "./process-workspace-journey-bar";
import { ProcessWorkspaceSidebar } from "./process-workspace-sidebar";
import { ProcessWorkspaceStageLayout } from "./process-workspace-stage-layout";
import { compactLevelsForPersist, draftLevelsForForm } from "@/lib/office-process-levels";
import {
  initialTipoLabelFromOfficeProcess,
  mergeProcessTypeOptionsForSelect,
} from "@/lib/process-type-options";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  BarChart2,
  BookOpen,
  ClipboardList,
  Download,
  Eye,
  ExternalLink,
  FileText,
  LayoutDashboard,
  Loader2,
  Lock,
  Paperclip,
  Pencil,
  Pin,
  Plus,
  Save,
  ScanSearch,
  Sparkles,
  Trash2,
  UserPlus,
  Workflow,
  Zap,
} from "lucide-react";

const PROCESS_SITUATION_OPTIONS: { value: OfficeProcessStatus; label: string }[] = [
  { value: "not_started", label: "Ativo" },
  { value: "in_progress", label: "Em revisão" },
  { value: "archived", label: "Inativo" },
  { value: "completed", label: "Pausado" },
];

const PROBLEM_STATUS_OPTIONS: { value: OfficeProcessProfessionalProblemStatus; label: string }[] = [
  { value: "identified", label: "Identificado" },
  { value: "in_analysis", label: "Em análise" },
  { value: "in_treatment", label: "Em tratativa" },
  { value: "resolved", label: "Resolvido" },
];

const ACTION_STATUS_OPTIONS: { value: OfficeProcessProfessionalActionStatus; label: string }[] = [
  { value: "not_started", label: "Não iniciada" },
  { value: "in_progress", label: "Em andamento" },
  { value: "completed", label: "Concluída" },
  { value: "paused", label: "Pausada" },
  { value: "cancelled", label: "Cancelada" },
];

const RECORD_TYPE_OPTIONS: { value: OfficeProcessProfessionalRecordType; label: string }[] = [
  { value: "interview", label: "Entrevista" },
  { value: "meeting", label: "Reunião" },
  { value: "workshop", label: "Workshop" },
  { value: "document_analysis", label: "Análise documental" },
  { value: "observation", label: "Observação" },
  { value: "other", label: "Outro" },
];

const RECORD_STATUS_OPTIONS: { value: OfficeProcessProfessionalRecordStatus; label: string }[] = [
  { value: "draft", label: "Rascunho" },
  { value: "filled", label: "Preenchido" },
  { value: "reviewed", label: "Revisado" },
  { value: "consolidated", label: "Consolidado" },
];

const SCRIPT_STATUS_OPTIONS: { value: OfficeProcessProfessionalScriptStatus; label: string }[] = [
  { value: "draft", label: "Rascunho" },
  { value: "ready", label: "Pronto para uso" },
  { value: "archived", label: "Arquivado" },
];

const DEFAULT_SCRIPT_BLOCKS = [
  "Contexto e objetivo do processo",
  "Início, fim e etapas principais",
  "Responsáveis e áreas envolvidas",
  "Sistemas, documentos e canais",
  "Entradas e saídas",
  "Regras, exceções e critérios",
  "Dificuldades percebidas",
  "Oportunidades percebidas",
  "Dúvidas para validação",
];

const RECORD_ATTACHMENT_TYPE_OPTIONS = [
  "Transcrição",
  "Ata",
  "Áudio",
  "Link",
  "Documento",
  "Outro",
] as const;

const SIMPLE_LEVEL_OPTIONS = [
  { value: "low", label: "Baixa" },
  { value: "medium", label: "Média" },
  { value: "high", label: "Alta" },
] as const;

const IMPROVEMENT_TYPES = [
  "Padronização",
  "Comunicação",
  "Controle",
  "Tecnologia",
  "Automação",
  "Treinamento",
  "Gestão",
];

const DEFAULT_DISCOVERY_QUESTIONS = [
  "Qual é o objetivo deste processo?",
  "Onde o processo começa e onde termina?",
  "Quem participa da execução?",
  "Quais são as principais etapas?",
  "Quais sistemas são utilizados?",
  "Quais documentos são gerados ou consultados?",
  "Quais problemas acontecem com mais frequência?",
  "Quais atividades geram retrabalho?",
  "O que poderia funcionar melhor?",
  "Há alguma regra, exceção ou cuidado importante?",
];

const LEVANTAMENTO_MODAL_WIDE = "w-full max-w-[min(96rem,calc(100vw-1.5rem))]";
const LEVANTAMENTO_MODAL_MEDIUM = "w-full max-w-2xl";
const LEVANTAMENTO_MODAL_COMPACT = "w-full max-w-xl";

const LEVANTAMENTO_MODAL_SHELL = "flex max-h-[88vh] flex-col overflow-hidden p-0";
const LEVANTAMENTO_MODAL_HEADER = "shrink-0 border-b px-6 py-5 pr-12";
const LEVANTAMENTO_MODAL_BODY = "min-h-0 flex-1 overflow-y-auto px-6 py-5";
const LEVANTAMENTO_MODAL_FOOTER = "mt-0 shrink-0 border-t bg-card px-6 py-4";

const WORKSPACE_SECTION_CARD_CLASS =
  "overflow-hidden border-border/80 border-l-[4px] border-l-[var(--identity-primary)] bg-card shadow-[var(--shadow-card)]";
const WORKSPACE_SECTION_HEADER_CLASS = "border-b border-border/50 bg-muted/20";
const WORKSPACE_SECTION_INTRO_CLASS = "space-y-2";
const WORKSPACE_SECTION_CONTENT_CLASS = "p-6 pt-5";

type ProfessionalWorkspaceTabId =
  | "visao-geral"
  | "levantamento"
  | "diagnostico"
  | "melhorias"
  | "acompanhamento";

const PROFESSIONAL_WORKSPACE_TABS: JourneyBarTab[] = [
  { id: "visao-geral", label: "Visão Geral", icon: LayoutDashboard, phases: [] },
  { id: "levantamento", label: "Levantamento", icon: ClipboardList, phases: [] },
  { id: "diagnostico", label: "Diagnóstico", icon: AlertTriangle, phases: [] },
  { id: "melhorias", label: "Ações", icon: Zap, phases: [] },
  { id: "acompanhamento", label: "Acompanhamento", icon: BarChart2, phases: [] },
];

const PROFESSIONAL_TAB_CONTENT: Record<
  ProfessionalWorkspaceTabId,
  { title: string; description: string; objective: string; hint: string }
> = {
  "visao-geral": {
    title: "Visão Geral",
    description: "Contexto, responsáveis, documentação e situação atual do processo.",
    objective:
      "Consolidar as informações essenciais do processo antes de avançar para o levantamento.",
    hint: "Plano Profissional · base de entendimento do processo",
  },
  levantamento: {
    title: "Levantamento",
    description: "Informações coletadas, roteiro de perguntas e registros de análise.",
    objective:
      "Organizar o levantamento básico para entender como o processo acontece na prática.",
    hint: "Plano Profissional · entrevistas, observações e registros",
  },
  diagnostico: {
    title: "Diagnóstico Inicial",
    description: "Problemas, pontos de atenção e oportunidades práticas de melhoria.",
    objective:
      "Registrar sinais percebidos no processo e transformar observações em oportunidades iniciais.",
    hint: "Plano Profissional · problemas e oportunidades",
  },
  melhorias: {
    title: "Ações",
    description: "Plano de ação simples para tratar problemas e organizar melhorias.",
    objective:
      "Definir ações práticas, responsáveis, prazos e evidências de conclusão.",
    hint: "Plano Profissional · execução simples e acompanhável",
  },
  acompanhamento: {
    title: "Acompanhamento",
    description: "Resumo de status e visão objetiva do andamento das ações.",
    objective:
      "Acompanhar problemas, oportunidades e ações para manter visibilidade da evolução.",
    hint: "Plano Profissional · evolução e pontos de atenção",
  },
};

function isProfessionalWorkspaceTabId(value: string | null): value is ProfessionalWorkspaceTabId {
  return PROFESSIONAL_WORKSPACE_TABS.some((tab) => tab.id === value);
}

type ProfessionalDraft = Required<
  Pick<
    OfficeProcessProfessionalDetails,
    | "objective"
    | "main_activities"
    | "how_it_works"
    | "responsible_area"
    | "participants"
    | "general_observations"
    | "survey_date"
    | "interviewed_people"
    | "current_execution"
    | "process_start"
    | "process_end"
    | "identified_steps"
    | "systems_used"
    | "documents_used"
    | "process_inputs"
    | "process_outputs"
    | "involved_areas"
    | "pending_questions"
    | "survey_observations"
    | "status_summary"
  >
> & {
  questions: OfficeProcessProfessionalQuestion[];
  survey_scripts: OfficeProcessProfessionalSurveyScript[];
  records: OfficeProcessProfessionalRecord[];
  materials: OfficeProcessProfessionalMaterial[];
  problems: OfficeProcessProfessionalProblem[];
  opportunities: OfficeProcessProfessionalOpportunity[];
  actions: OfficeProcessProfessionalAction[];
};

type AiDialogKind =
  | "rewrite"
  | "complements"
  | "questions"
  | "organize"
  | "consolidation"
  | "gaps"
  | "problems"
  | "opportunities"
  | "actions"
  | "summary";

type AiDialogState =
  | {
      kind: AiDialogKind;
      title: string;
      description: string;
      draft: string;
    }
  | null;

type ConsolidationFieldKey =
  | "current_execution"
  | "process_start"
  | "process_end"
  | "identified_steps"
  | "systems_used"
  | "documents_used"
  | "process_inputs"
  | "process_outputs"
  | "involved_areas"
  | "pending_questions"
  | "survey_observations";

type ConsolidationSuggestion = {
  id: string;
  field: ConsolidationFieldKey;
  suggestion: string;
  reason: string;
};

type GapSuggestion = {
  id: string;
  title: string;
  description: string;
  question: string;
};

type ScriptEditorMode = "view" | "edit" | "create" | "ai";

type ScriptEditorState = {
  mode: ScriptEditorMode;
  script: OfficeProcessProfessionalSurveyScript;
  sourceScriptId?: string;
};

type InterviewEditorInitialSection = "metadata" | "attachments" | "responses";

type InterviewEditorState = {
  record: OfficeProcessProfessionalRecord;
  sourceRecordId?: string;
  script: OfficeProcessProfessionalSurveyScript | null;
  initialSection?: InterviewEditorInitialSection;
  readOnlyResponses?: boolean;
};

type InterviewFillSessionState = {
  record: OfficeProcessProfessionalRecord;
  sourceRecordId: string;
  readOnly?: boolean;
};

const CONSOLIDATION_FIELDS: {
  key: ConsolidationFieldKey;
  label: string;
  rows?: number;
}[] = [
  { key: "current_execution", label: "Forma atual de execução do processo", rows: 5 },
  { key: "process_start", label: "Início do processo" },
  { key: "process_end", label: "Fim do processo" },
  { key: "identified_steps", label: "Principais etapas identificadas", rows: 5 },
  { key: "systems_used", label: "Sistemas utilizados" },
  { key: "documents_used", label: "Documentos utilizados" },
  { key: "process_inputs", label: "Entradas do processo" },
  { key: "process_outputs", label: "Saídas do processo" },
  { key: "involved_areas", label: "Áreas envolvidas" },
  { key: "pending_questions", label: "Dúvidas pendentes", rows: 4 },
  { key: "survey_observations", label: "Observações do levantamento", rows: 4 },
];

type ProcessManagementProfessionalClientProps = {
  officeProcess: {
    id: string;
    name: string;
    description: string | null;
    category: string | null;
    vc_macroprocesso?: string | null;
    vc_tipo_label?: string | null;
    template_url?: string | null;
    template_label?: string | null;
    flowchart_image_url?: string | null;
    template_files?: { url: string; label?: string }[];
    flowchart_files?: { url: string }[];
    status: OfficeProcessStatus;
    owner_profile_id: string | null;
    notes: string | null;
    vc_process_type?: string | null;
    vc_levels?: unknown;
    vc_level1?: string | null;
    vc_level2?: string | null;
    vc_level3?: string | null;
    vc_priority?: string | null;
    vc_gestor_label?: string | null;
    vc_general_status?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    essential_details?: OfficeProcessEssentialDetails | null;
    professional_details?: OfficeProcessProfessionalDetails | null;
  };
  processTypeOptions: string[];
  ownerOptions: { id: string; full_name: string }[];
  attachments: {
    id: string;
    title: string;
    attachment_url: string;
    attachment_type: OfficeProcessAttachmentType;
    created_at: string;
  }[];
};

function createId() {
  return crypto.randomUUID();
}

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function stripJsonFence(value: string) {
  return value
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function parseJsonObject(value: string): Record<string, any> {
  try {
    const parsed = JSON.parse(stripJsonFence(value));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function stableQuestions(questions: OfficeProcessProfessionalQuestion[] | undefined) {
  const list = questions?.length
    ? questions
    : DEFAULT_DISCOVERY_QUESTIONS.map((question) => ({ id: createId(), question, answer: "" }));
  return list.map((question) => ({
    id: question.id || createId(),
    question: text(question.question),
    answer: text(question.answer),
  }));
}

function nowIso() {
  return new Date().toISOString();
}

function getRecordAttachments(
  record: OfficeProcessProfessionalRecord
): OfficeProcessProfessionalRecordAttachment[] {
  if (record.attachments?.length) {
    return record.attachments.filter((item) => item.url?.trim());
  }
  const legacyUrl = record.attachment_url ?? record.related_links;
  if (legacyUrl?.trim()) {
    return [
      {
        id: createId(),
        name: fileNameFromUrl(legacyUrl),
        type: legacyUrl.startsWith("http") ? "Link" : "Documento",
        url: legacyUrl,
      },
    ];
  }
  return [];
}

function syncRecordAttachmentFields(
  record: OfficeProcessProfessionalRecord
): OfficeProcessProfessionalRecord {
  const attachments = getRecordAttachments(record);
  const primaryUrl = attachments[0]?.url ?? "";
  return {
    ...record,
    attachments,
    attachment_url: primaryUrl,
    related_links: primaryUrl,
  };
}

function recordAttachmentSummary(record: OfficeProcessProfessionalRecord): string | null {
  const attachments = getRecordAttachments(record);
  if (attachments.length === 0) return null;
  if (attachments.length === 1) {
    const type = attachments[0].type?.trim();
    if (type === "Transcrição") return "Transcrição vinculada";
    if (type === "Ata") return "Ata vinculada";
    if (type === "Áudio") return "Áudio vinculado";
    if (type === "Link") return "Link vinculado";
    return "Possui 1 anexo";
  }
  return `Possui ${attachments.length} anexos`;
}

function getRecordCollectionOrigin(
  record: OfficeProcessProfessionalRecord
): "system" | "external" {
  if (record.collection_origin === "system" || record.collection_origin === "external") {
    return record.collection_origin;
  }
  const scriptId = record.script_id ?? record.linked_questionnaire_id;
  return scriptId?.trim() ? "system" : "external";
}

function inferAttachmentTypeFromFile(file: File): string {
  if (file.type.startsWith("audio/")) return "Áudio";
  const lowerName = file.name.toLowerCase();
  if (lowerName.includes("transcri")) return "Transcrição";
  if (lowerName.includes("ata")) return "Ata";
  return "Documento";
}

function countScriptQuestions(script: OfficeProcessProfessionalSurveyScript) {
  return (script.blocks ?? []).reduce((total, block) => total + (block.questions ?? []).length, 0);
}

function sortByOrder<T extends { sort_order?: number }>(items: T[]) {
  return [...items].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
}

function normalizeScriptQuestion(
  question: OfficeProcessProfessionalScriptQuestion,
  index: number
): OfficeProcessProfessionalScriptQuestion {
  return {
    id: question.id || createId(),
    question: text(question.question),
    sort_order: Number.isFinite(question.sort_order) ? question.sort_order : index,
  };
}

function normalizeScriptBlock(
  block: OfficeProcessProfessionalScriptBlock,
  index: number
): OfficeProcessProfessionalScriptBlock {
  return {
    id: block.id || createId(),
    title: text(block.title) || DEFAULT_SCRIPT_BLOCKS[index] || `Bloco ${index + 1}`,
    sort_order: Number.isFinite(block.sort_order) ? block.sort_order : index,
    questions: sortByOrder(block.questions ?? []).map(normalizeScriptQuestion),
  };
}

function normalizeSurveyScript(
  script: OfficeProcessProfessionalSurveyScript,
  index: number
): OfficeProcessProfessionalSurveyScript {
  const createdAt = text(script.created_at) || nowIso();
  return {
    id: script.id || createId(),
    name: text(script.name) || `Roteiro de levantamento ${index + 1}`,
    description: text(script.description),
    status: script.status ?? "draft",
    created_at: createdAt,
    updated_at: text(script.updated_at) || createdAt,
    blocks: sortByOrder(script.blocks ?? []).map(normalizeScriptBlock),
  };
}

function scriptFromFlatQuestions(
  questions: OfficeProcessProfessionalQuestion[] | undefined,
  processName: string
): OfficeProcessProfessionalSurveyScript[] {
  const stable = stableQuestions(questions);
  if (stable.length === 0) return [];
  const timestamp = nowIso();
  return [
    {
      id: createId(),
      name: `Roteiro de levantamento - ${processName}`,
      description: "Roteiro criado a partir das perguntas já cadastradas.",
      status: "draft",
      created_at: timestamp,
      updated_at: timestamp,
      blocks: [
        {
          id: createId(),
          title: "Perguntas do roteiro",
          sort_order: 0,
          questions: stable.map((question, index) => ({
            id: question.id || createId(),
            question: question.question,
            sort_order: index,
          })),
        },
      ],
    },
  ];
}

function emptyScript(processName: string): OfficeProcessProfessionalSurveyScript {
  const timestamp = nowIso();
  return {
    id: createId(),
    name: `Roteiro de levantamento - ${processName}`,
    description: "",
    status: "draft",
    created_at: timestamp,
    updated_at: timestamp,
    blocks: DEFAULT_SCRIPT_BLOCKS.slice(0, 3).map((title, index) => ({
      id: createId(),
      title,
      sort_order: index,
      questions: [],
    })),
  };
}

function defaultAnswersForScript(script: OfficeProcessProfessionalSurveyScript) {
  return (script.blocks ?? []).flatMap((block) =>
    (block.questions ?? []).map((question) => ({
      question_id: question.id ?? "",
      answer: "",
    }))
  );
}

function getScriptQuestionIds(script: OfficeProcessProfessionalSurveyScript | null | undefined) {
  if (!script) return new Set<string>();
  return new Set(
    (script.blocks ?? []).flatMap((block) =>
      (block.questions ?? []).map((question) => question.id ?? "").filter(Boolean)
    )
  );
}

function getOrphanAnswers(
  script: OfficeProcessProfessionalSurveyScript | null | undefined,
  record: OfficeProcessProfessionalRecord
): OfficeProcessProfessionalRecordAnswer[] {
  const scriptQuestionIds = getScriptQuestionIds(script);
  return (record.answers ?? []).filter(
    (answer) => answer.question_id && !scriptQuestionIds.has(answer.question_id)
  );
}

function syncRecordAnswersWithScript(
  script: OfficeProcessProfessionalSurveyScript,
  record: OfficeProcessProfessionalRecord
): OfficeProcessProfessionalRecord {
  const existingAnswers = new Map(
    (record.answers ?? []).map((answer) => [answer.question_id, answer.answer])
  );
  const scriptQuestionIds = getScriptQuestionIds(script);
  const syncedFromScript = (script.blocks ?? []).flatMap((block) =>
    (block.questions ?? []).map((question) => ({
      question_id: question.id ?? "",
      answer: existingAnswers.get(question.id ?? "") ?? "",
    }))
  );
  const orphanAnswers = (record.answers ?? []).filter(
    (answer) => answer.question_id && !scriptQuestionIds.has(answer.question_id)
  );
  return {
    ...record,
    answers: [...syncedFromScript, ...orphanAnswers],
  };
}

function formatRecordStatusLabel(status?: OfficeProcessProfessionalRecordStatus) {
  return RECORD_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? "Rascunho";
}

function formatScriptStatusLabel(status?: OfficeProcessProfessionalScriptStatus) {
  return SCRIPT_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? "Rascunho";
}

function normalizeProfessionalDraft(
  details: OfficeProcessProfessionalDetails | null | undefined,
  essential: OfficeProcessEssentialDetails | null | undefined,
  notes: string | null,
  processName: string
): ProfessionalDraft {
  const legacyQuestions = stableQuestions(details?.questions);
  const surveyScripts = (details?.survey_scripts?.length
    ? details.survey_scripts.map(normalizeSurveyScript)
    : scriptFromFlatQuestions(legacyQuestions, processName)
  ).filter((script) => countScriptQuestions(script) > 0 || script.name);

  const rawMaterials = (details?.materials ?? []).map((material) => ({
    id: material.id || createId(),
    name: text(material.name),
    type: text(material.type),
    date: text(material.date),
    description: text(material.description),
    url: text(material.url),
    related_record_id: text(material.related_record_id),
  }));
  const linkedMaterials = rawMaterials.filter((material) => material.related_record_id);
  const generalMaterials = rawMaterials.filter((material) => !material.related_record_id);

  const records = (details?.records ?? []).map((record) => {
    const recordId = record.id || createId();
    const linkedForRecord = linkedMaterials.filter(
      (material) => material.related_record_id === recordId
    );
    const baseRecord: OfficeProcessProfessionalRecord = {
      id: recordId,
      title: text(record.title),
      date: text(record.date),
      source: text(record.source),
      description: text(record.description),
      people_involved: text(record.people_involved),
      related_links: text(record.related_links),
      type: record.type ?? "interview",
      participants: text(record.participants ?? record.people_involved),
      areas_involved: text(record.areas_involved),
      responsible: text(record.responsible),
      status: record.status ?? "draft",
      linked_questionnaire_id: text(record.linked_questionnaire_id),
      attachment_url: text(record.attachment_url ?? record.related_links),
      attachments: [
        ...(record.attachments ?? []).map((attachment) => ({
          id: attachment.id || createId(),
          name: text(attachment.name),
          type: text(attachment.type),
          url: text(attachment.url),
        })),
        ...linkedForRecord.map((material) => ({
          id: material.id,
          name: material.name || fileNameFromUrl(material.url),
          type: material.type || "Documento",
          url: material.url,
        })),
      ].filter((attachment) => attachment.url),
      observations: text(record.observations),
      use_in_consolidation: Boolean(record.use_in_consolidation),
      script_id: text(record.script_id ?? record.linked_questionnaire_id),
      answers: (record.answers ?? []).map((answer) => ({
        question_id: text(answer.question_id),
        answer: text(answer.answer),
      })),
      created_at: text(record.created_at),
      updated_at: text(record.updated_at),
      collection_origin:
        record.collection_origin === "external" || record.collection_origin === "system"
          ? record.collection_origin
          : text(record.script_id ?? record.linked_questionnaire_id)
            ? "system"
            : "external",
    };
    return syncRecordAttachmentFields(baseRecord);
  });

  return {
    objective: text(details?.objective ?? essential?.objective),
    main_activities: text(details?.main_activities ?? essential?.main_activities),
    how_it_works: text(details?.how_it_works ?? essential?.how_it_works),
    responsible_area: text(details?.responsible_area ?? essential?.responsible_area),
    participants: text(details?.participants ?? essential?.participants),
    general_observations: text(
      details?.general_observations ?? essential?.general_observations ?? notes
    ),
    survey_date: text(details?.survey_date),
    interviewed_people: text(details?.interviewed_people),
    current_execution: text(details?.current_execution),
    process_start: text(details?.process_start),
    process_end: text(details?.process_end),
    identified_steps: text(details?.identified_steps),
    systems_used: text(details?.systems_used),
    documents_used: text(details?.documents_used),
    process_inputs: text(details?.process_inputs),
    process_outputs: text(details?.process_outputs),
    involved_areas: text(details?.involved_areas),
    pending_questions: text(details?.pending_questions),
    survey_observations: text(details?.survey_observations),
    questions: legacyQuestions,
    survey_scripts: surveyScripts,
    records,
    materials: generalMaterials,
    problems: (details?.problems ?? []).map((problem) => ({
      id: problem.id || createId(),
      description: text(problem.description),
      process_step: text(problem.process_step),
      related_area_or_owner: text(problem.related_area_or_owner),
      perceived_frequency: text(problem.perceived_frequency),
      perceived_impact: text(problem.perceived_impact),
      evidence_or_comment: text(problem.evidence_or_comment),
      status: problem.status ?? "identified",
    })),
    opportunities: (details?.opportunities ?? []).map((opportunity) => ({
      id: opportunity.id || createId(),
      description: text(opportunity.description),
      related_problem_id: text(opportunity.related_problem_id),
      improvement_type: text(opportunity.improvement_type),
      expected_benefit: text(opportunity.expected_benefit),
      estimated_complexity: opportunity.estimated_complexity ?? "medium",
      priority: opportunity.priority ?? "medium",
      complementary_notes: text(opportunity.complementary_notes),
    })),
    actions: (details?.actions ?? []).map((action) => ({
      id: action.id || createId(),
      action: text(action.action),
      related_item: text(action.related_item),
      responsible: text(action.responsible),
      deadline: text(action.deadline),
      status: action.status ?? "not_started",
      notes: text(action.notes),
      completion_evidence: text(action.completion_evidence),
    })),
    status_summary: text(details?.status_summary),
  };
}

function normalizeFlowchartFilesFromRow(row: {
  flowchart_files?: unknown;
  flowchart_image_url?: string | null;
}): ProcessFlowchartFile[] {
  const arr = row.flowchart_files;
  if (Array.isArray(arr) && arr.length > 0) {
    return (arr as { url: string }[]).filter((file) => file?.url?.trim());
  }
  if (row.flowchart_image_url?.trim()) {
    return [{ url: row.flowchart_image_url.trim() }];
  }
  return [];
}

function FileExtBadge({ name }: { name: string }) {
  const dot = name.lastIndexOf(".");
  const ext = dot >= 0 ? name.slice(dot + 1).toUpperCase() : "";
  if (!ext) return null;
  return (
    <span className="inline-flex h-8 shrink-0 items-center rounded border border-border/60 bg-card px-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
      {ext}
    </span>
  );
}

function processAttachmentDisplayName(attachment: {
  title?: string;
  attachment_url: string;
}) {
  return attachment.title?.trim() || fileNameFromUrl(attachment.attachment_url) || "Documento sem nome";
}

function LevantamentoIconButton({
  title,
  onClick,
  disabled,
  variant = "outline",
  type = "button",
  children,
}: {
  title: string;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "outline" | "default" | "ghost";
  type?: "button" | "submit";
  children: ReactNode;
}) {
  return (
    <Button
      type={type}
      variant={variant}
      size="icon"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  readOnly = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  readOnly?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        readOnly={readOnly}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function TextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
  readOnly = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  readOnly?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Textarea
        id={id}
        rows={rows}
        value={value}
        readOnly={readOnly}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function ConsolidationField({
  id,
  label,
  value,
  onChange,
  rows = 3,
  readOnly = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  readOnly?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-background p-4 shadow-sm">
      <Label
        htmlFor={id}
        className="mb-2.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
      >
        {label}
      </Label>
      <Textarea
        id={id}
        rows={rows}
        value={value}
        readOnly={readOnly}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "min-h-[88px] border-border/80 bg-card read-only:cursor-default read-only:bg-muted/40 read-only:text-foreground/90",
          readOnly && "focus-visible:ring-0"
        )}
      />
    </div>
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function sanitizeFilename(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function docxHeading(textValue: string) {
  return new Paragraph({
    children: [new TextRun({ text: textValue, bold: true, size: 28 })],
    spacing: { after: 240 },
  });
}

function docxParagraph(textValue: string, bold = false) {
  return new Paragraph({
    children: [new TextRun({ text: textValue || "-", bold, size: 22 })],
    spacing: { after: 160 },
  });
}

function toProfessionalDetails(draft: ProfessionalDraft): OfficeProcessProfessionalDetails {
  return {
    objective: draft.objective,
    main_activities: draft.main_activities,
    how_it_works: draft.how_it_works,
    responsible_area: draft.responsible_area,
    participants: draft.participants,
    general_observations: draft.general_observations,
    survey_date: draft.survey_date,
    interviewed_people: draft.interviewed_people,
    current_execution: draft.current_execution,
    process_start: draft.process_start,
    process_end: draft.process_end,
    identified_steps: draft.identified_steps,
    systems_used: draft.systems_used,
    documents_used: draft.documents_used,
    process_inputs: draft.process_inputs,
    process_outputs: draft.process_outputs,
    involved_areas: draft.involved_areas,
    pending_questions: draft.pending_questions,
    survey_observations: draft.survey_observations,
    questions: draft.survey_scripts[0]?.blocks?.flatMap((block) =>
      (block.questions ?? []).map((question) => ({
        id: question.id,
        question: question.question,
        answer: "",
      }))
    ) ?? draft.questions,
    survey_scripts: draft.survey_scripts,
    records: draft.records,
    materials: draft.materials,
    problems: draft.problems,
    opportunities: draft.opportunities,
    actions: draft.actions,
    status_summary: draft.status_summary,
  };
}

export function ProcessManagementProfessionalClient({
  officeProcess,
  processTypeOptions,
  ownerOptions,
  attachments,
}: ProcessManagementProfessionalClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const timeZone = useTimeZone();
  const identity = useIdentity();
  const [activeTab, setActiveTab] = useState<ProfessionalWorkspaceTabId>(() => {
    const rawTab = searchParams.get("aba");
    return isProfessionalWorkspaceTabId(rawTab) ? rawTab : "visao-geral";
  });
  const [status, setStatus] = useState<OfficeProcessStatus>(officeProcess.status);
  const [description, setDescription] = useState(officeProcess.description ?? "");
  const [notes, setNotes] = useState(officeProcess.notes ?? "");
  const [vcMacro, setVcMacro] = useState(officeProcess.vc_macroprocesso ?? "");
  const [ownerProfileId, setOwnerProfileId] = useState(officeProcess.owner_profile_id ?? "");
  const [vcTipoLabel, setVcTipoLabel] = useState(() =>
    initialTipoLabelFromOfficeProcess(officeProcess)
  );
  const [vcLevelsDraft, setVcLevelsDraft] = useState<string[]>(() =>
    draftLevelsForForm(officeProcess, officeProcess.name)
  );
  const [draft, setDraft] = useState<ProfessionalDraft>(() =>
    normalizeProfessionalDraft(
      officeProcess.professional_details,
      officeProcess.essential_details,
      officeProcess.notes,
      officeProcess.name
    )
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState<AiDialogKind | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiDialog, setAiDialog] = useState<AiDialogState>(null);
  const [aiGuidanceOpen, setAiGuidanceOpen] = useState(false);
  const [aiGuidance, setAiGuidance] = useState("");
  const [consolidationSuggestions, setConsolidationSuggestions] = useState<
    ConsolidationSuggestion[]
  >([]);
  const [gapSuggestions, setGapSuggestions] = useState<GapSuggestion[]>([]);
  const [scriptEditor, setScriptEditor] = useState<ScriptEditorState | null>(null);
  const [scriptChoiceOpen, setScriptChoiceOpen] = useState(false);
  const [interviewEditor, setInterviewEditor] = useState<InterviewEditorState | null>(null);
  const [interviewFillSession, setInterviewFillSession] = useState<InterviewFillSessionState | null>(
    null
  );
  const interviewFillInitKeyRef = useRef<string | null>(null);
  const [interviewAddOpen, setInterviewAddOpen] = useState(false);
  const [addRecordPopoverOpen, setAddRecordPopoverOpen] = useState(false);
  const [newInterviewScriptId, setNewInterviewScriptId] = useState("");
  const fillAttachmentInputRef = useRef<HTMLInputElement>(null);
  const [fillAttachmentUploading, setFillAttachmentUploading] = useState(false);
  const [fillAttachmentError, setFillAttachmentError] = useState<string | null>(null);
  const [fillNewLinkUrl, setFillNewLinkUrl] = useState("");
  const [fillNewLinkType, setFillNewLinkType] = useState<string>("Link");
  const [consolidationEditing, setConsolidationEditing] = useState(false);
  const [consolidationExporting, setConsolidationExporting] = useState(false);
  const [interviewAttachmentUploading, setInterviewAttachmentUploading] = useState(false);
  const [interviewAttachmentError, setInterviewAttachmentError] = useState<string | null>(null);
  const [interviewNewLinkUrl, setInterviewNewLinkUrl] = useState("");
  const [interviewNewLinkType, setInterviewNewLinkType] = useState<string>("Link");
  const interviewAttachmentInputRef = useRef<HTMLInputElement>(null);

  const [newAttachmentFiles, setNewAttachmentFiles] = useState<File[]>([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [attachmentUploading, setAttachmentUploading] = useState(false);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<string | null>(null);
  const flowchartFileInputRef = useRef<HTMLInputElement>(null);
  const officeFlowchartFiles = useMemo(
    () => normalizeFlowchartFilesFromRow(officeProcess),
    [officeProcess]
  );
  const [editedFlowchartFiles, setEditedFlowchartFiles] = useState<ProcessFlowchartFile[]>(() =>
    officeFlowchartFiles.map((file) => ({ url: file.url }))
  );
  const [materialUploading, setMaterialUploading] = useState<"flowchart" | null>(null);
  const [materialError, setMaterialError] = useState<string | null>(null);
  const tipoSelectOptions = useMemo(
    () => mergeProcessTypeOptionsForSelect(processTypeOptions, vcTipoLabel),
    [processTypeOptions, vcTipoLabel]
  );

  const actionStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return {
      notStarted: draft.actions.filter((action) => action.status === "not_started").length,
      inProgress: draft.actions.filter((action) => action.status === "in_progress").length,
      completed: draft.actions.filter((action) => action.status === "completed").length,
      overdue: draft.actions.filter((action) => {
        if (!action.deadline || action.status === "completed" || action.status === "cancelled") {
          return false;
        }
        const deadline = new Date(`${action.deadline}T00:00:00`);
        return !Number.isNaN(deadline.getTime()) && deadline < today;
      }).length,
    };
  }, [draft.actions]);

  const aiContext = useMemo(
    () =>
      JSON.stringify(
        {
          processo: {
            nome: officeProcess.name,
            tipo: vcTipoLabel,
            area: vcMacro,
            descricao: description,
            objetivo: draft.objective,
            atividades_principais: draft.main_activities,
            funcionamento: draft.how_it_works,
            responsavel: ownerOptions.find((owner) => owner.id === ownerProfileId)?.full_name,
            observacoes: notes,
          },
          levantamento: {
            data: draft.survey_date,
            pessoas: draft.interviewed_people,
            execucao_atual: draft.current_execution,
            inicio: draft.process_start,
            fim: draft.process_end,
            etapas: draft.identified_steps,
            sistemas: draft.systems_used,
            documentos: draft.documents_used,
            entradas: draft.process_inputs,
            saidas: draft.process_outputs,
            areas: draft.involved_areas,
            duvidas: draft.pending_questions,
            observacoes: draft.survey_observations,
          },
          roteiros: draft.survey_scripts,
          entrevistas: draft.records,
          materiais_levantamento: draft.materials,
          problemas: draft.problems,
          oportunidades: draft.opportunities,
          acoes: draft.actions,
        },
        null,
        2
      ),
    [description, draft, notes, officeProcess.name, ownerOptions, ownerProfileId, vcMacro, vcTipoLabel]
  );

  useEffect(() => {
    const rawTab = searchParams.get("aba");
    if (isProfessionalWorkspaceTabId(rawTab)) {
      setActiveTab(rawTab);
    }
  }, [searchParams]);

  useEffect(() => {
    const scriptId = searchParams.get("roteiro");
    const scriptName = searchParams.get("roteiroNome");
    const interviewFillId = searchParams.get("entrevista");
    if (interviewFillId) return;
    if ((!scriptId && !scriptName) || scriptEditor) return;
    const script = draft.survey_scripts.find(
      (item) => item.id === scriptId || item.name === scriptName
    );
    if (script) {
      setScriptEditor({ mode: "view", script });
    }
  }, [draft.survey_scripts, scriptEditor, searchParams]);

  useEffect(() => {
    const entrevistaId = searchParams.get("entrevista");
    if (!entrevistaId) {
      interviewFillInitKeyRef.current = null;
      setInterviewFillSession(null);
      return;
    }

    const readOnly = searchParams.get("modo") === "leitura";
    const initKey = `${entrevistaId}|${readOnly ? "1" : "0"}`;
    if (interviewFillInitKeyRef.current === initKey) return;

    const record = draft.records.find((item) => item.id === entrevistaId);
    if (!record) return;

    const script =
      draft.survey_scripts.find(
        (item) => item.id === (record.script_id || record.linked_questionnaire_id)
      ) ?? null;
    const syncedRecord = script ? syncRecordAnswersWithScript(script, record) : record;

    interviewFillInitKeyRef.current = initKey;
    setInterviewFillSession({
      record: syncedRecord,
      sourceRecordId: entrevistaId,
      readOnly,
    });
  }, [draft.records, draft.survey_scripts, searchParams]);

  useEffect(() => {
    if (!interviewEditor?.initialSection) return;
    const sectionId =
      interviewEditor.initialSection === "attachments"
        ? "interview-attachments"
        : interviewEditor.initialSection === "responses"
          ? "interview-responses"
          : "interview-metadata";
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [interviewEditor?.initialSection, interviewEditor?.sourceRecordId]);

  useEffect(() => {
    setStatus(officeProcess.status);
    setDescription(officeProcess.description ?? "");
    setNotes(officeProcess.notes ?? "");
    setVcMacro(officeProcess.vc_macroprocesso ?? "");
    setOwnerProfileId(officeProcess.owner_profile_id ?? "");
    setVcTipoLabel(initialTipoLabelFromOfficeProcess(officeProcess));
    setVcLevelsDraft(draftLevelsForForm(officeProcess, officeProcess.name));
    setDraft(
      normalizeProfessionalDraft(
        officeProcess.professional_details,
        officeProcess.essential_details,
        officeProcess.notes,
        officeProcess.name
      )
    );
    setEditedFlowchartFiles(officeFlowchartFiles.map((file) => ({ url: file.url })));
  }, [officeFlowchartFiles, officeProcess]);

  function updateDraft<K extends keyof ProfessionalDraft>(key: K, value: ProfessionalDraft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function handleTabChange(value: string) {
    if (!isProfessionalWorkspaceTabId(value)) return;
    setActiveTab(value);
    const params = new URLSearchParams(window.location.search);
    params.set("aba", value);
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
  }

  function openInterviewFillPage(
    recordId: string,
    options?: { readOnly?: boolean; newTab?: boolean }
  ) {
    const params = new URLSearchParams(window.location.search);
    params.set("aba", "levantamento");
    params.set("entrevista", recordId);
    params.delete("visualizacaoRoteiro");
    params.delete("roteiro");
    params.delete("roteiroNome");
    if (options?.readOnly) params.set("modo", "leitura");
    else params.delete("modo");
    const url = `${window.location.pathname}?${params.toString()}`;
    if (options?.newTab) {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    router.push(url);
  }

  function closeScriptEditor() {
    setScriptEditor(null);
    const params = new URLSearchParams(window.location.search);
    params.delete("roteiro");
    params.delete("roteiroNome");
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
  }

  function closeInterviewFillView() {
    interviewFillInitKeyRef.current = null;
    setInterviewFillSession(null);
    setFillAttachmentError(null);
    setFillNewLinkUrl("");
    setFillNewLinkType("Link");
    router.push(`/escritorio/processos/${officeProcess.id}?aba=levantamento`);
  }

  async function handleSaveProcess(event: FormEvent) {
    event.preventDefault();
    setSaveError(null);
    const levelsCompact = compactLevelsForPersist(vcLevelsDraft);
    const macroTrim = vcMacro.trim();
    if (!macroTrim && !levelsCompact[0]) {
      setSaveError("Preencha o macroprocesso e/ou o nível 1.");
      return;
    }
    setSaving(true);

    const result = await updateOfficeProcessDetails({
      officeProcessId: officeProcess.id,
      description,
      flowchartFiles: editedFlowchartFiles,
      status,
      ownerProfileId: ownerProfileId || null,
      notes,
      vcTipoLabel: vcTipoLabel.trim() || null,
      vcMacroprocesso: macroTrim || null,
      vcLevels: vcLevelsDraft,
      professionalDetails: toProfessionalDetails(draft),
    });

    if ("error" in result && result.error) {
      setSaveError(result.error);
      setSaving(false);
      return;
    }

    setSaving(false);
    router.refresh();
  }

  async function handleFlowchartFileSelected(files: FileList | null) {
    const file = files?.[0];
    if (!file?.size) return;
    setMaterialError(null);
    setMaterialUploading("flowchart");
    const result = await uploadOfficeProcessFileViaApi({
      officeProcessId: officeProcess.id,
      kind: "flowchart",
      file,
    });
    setMaterialUploading(null);
    if ("error" in result && result.error) {
      setMaterialError(result.error);
      return;
    }
    if ("success" in result && result.success && result.url) {
      setEditedFlowchartFiles((prev) => [...prev, { url: result.url }]);
    }
  }

  async function handleDeleteAttachment(attachmentId: string) {
    if (!window.confirm("Remover este documento do processo?")) return;
    setAttachmentError(null);
    setDeletingAttachmentId(attachmentId);
    const result = await deleteOfficeProcessAttachment(attachmentId);
    setDeletingAttachmentId(null);
    if ("error" in result && result.error) {
      setAttachmentError(result.error);
      return;
    }
    router.refresh();
  }

  async function handleAttachmentAdd() {
    setAttachmentError(null);
    const toAdd = newAttachmentFiles.filter((file) => file.size);
    if (toAdd.length === 0) {
      setAttachmentError("Selecione um ou mais arquivos.");
      return;
    }

    setAttachmentUploading(true);
    for (const file of toAdd) {
      const uploadResult = await uploadOfficeProcessFileViaApi({
        officeProcessId: officeProcess.id,
        kind: "attachment",
        file,
      });
      if ("error" in uploadResult) {
        setAttachmentError(uploadResult.error ?? null);
        setAttachmentUploading(false);
        return;
      }

      const result = await addOfficeProcessAttachment({
        officeProcessId: officeProcess.id,
        title: file.name,
        attachmentUrl: uploadResult.url,
        attachmentType: "other",
      });

      if ("error" in result && result.error) {
        setAttachmentError(result.error ?? null);
        setAttachmentUploading(false);
        return;
      }
    }

    setNewAttachmentFiles([]);
    setAttachmentUploading(false);
    router.refresh();
  }

  function addAttachmentFiles(files: FileList | null) {
    if (!files?.length) return;
    setNewAttachmentFiles((prev) => [...prev, ...Array.from(files)]);
  }

  async function generateAiText(kind: AiDialogKind, phase: string, extraContext?: string) {
    setAiError(null);
    setAiLoading(kind);
    try {
      const input = extraContext ? `${aiContext}\n\n${extraContext}` : aiContext;
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase, input }),
      });
      const data = await response.json();
      if (!response.ok || data?.error) {
        throw new Error(data?.error || "Não foi possível gerar a sugestão com IA.");
      }
      return String(data.text ?? "");
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "Erro ao gerar sugestão com IA.");
      return null;
    } finally {
      setAiLoading(null);
    }
  }

  async function openAiDialog(
    kind: AiDialogKind,
    phase: string,
    title: string,
    description: string,
    extraContext?: string
  ) {
    const result = await generateAiText(kind, phase, extraContext);
    if (!result) return;
    setAiDialog({ kind, title, description, draft: stripJsonFence(result) });
  }

  async function generateQuestionsWithGuidance() {
    const guidance = aiGuidance.trim();
    setAiGuidanceOpen(false);
    const result = await generateAiText(
      "questions",
      "levantamento",
      guidance
        ? `Orientações adicionais do usuário para a criação do roteiro:\n${guidance}`
        : "Gerar roteiro com base nas informações do processo."
    );
    if (!result) return;
    const parsed = parseJsonObject(result);
    const script = scriptFromAiResponse(parsed);
    setScriptEditor({ mode: "ai", script });
  }

  function scriptFromAiResponse(parsed: Record<string, any>): OfficeProcessProfessionalSurveyScript {
    const timestamp = nowIso();
    const rawBlocks = Array.isArray(parsed.blocks) ? parsed.blocks : [];
    const blocks = rawBlocks.length
      ? rawBlocks
          .map((block, blockIndex): OfficeProcessProfessionalScriptBlock => {
            const rawQuestions = Array.isArray(block.questions) ? block.questions : [];
            return {
              id: createId(),
              title: text(block.title) || DEFAULT_SCRIPT_BLOCKS[blockIndex] || `Bloco ${blockIndex + 1}`,
              sort_order: blockIndex,
              questions: rawQuestions
                .map((item: unknown, questionIndex: number): OfficeProcessProfessionalScriptQuestion => ({
                  id: createId(),
                  question: typeof item === "string" ? item : text((item as { question?: unknown }).question),
                  sort_order: questionIndex,
                }))
                .filter((question: OfficeProcessProfessionalScriptQuestion) => question.question),
            };
          })
          .filter((block) => (block.questions ?? []).length > 0)
      : [
          {
            id: createId(),
            title: "Perguntas sugeridas",
            sort_order: 0,
            questions: (Array.isArray(parsed.questions) ? parsed.questions : [])
              .map((item: unknown, questionIndex: number): OfficeProcessProfessionalScriptQuestion => ({
                id: createId(),
                question: typeof item === "string" ? item : text((item as { question?: unknown }).question),
                sort_order: questionIndex,
              }))
              .filter((question) => question.question),
          },
        ];

    return {
      id: createId(),
      name: text(parsed.name) || `Roteiro de levantamento - ${officeProcess.name}`,
      description: text(parsed.description),
      status: "draft",
      created_at: timestamp,
      updated_at: timestamp,
      blocks: blocks.length ? blocks : emptyScript(officeProcess.name).blocks,
    };
  }

  async function openConsolidationSuggestions() {
    const result = await generateAiText(
      "consolidation",
      "process_professional_consolidate_discovery"
    );
    if (!result) return;
    const parsed = parseJsonObject(result);
    const fields = Array.isArray(parsed.fields) ? parsed.fields : [];
    const validKeys = new Set(CONSOLIDATION_FIELDS.map((field) => field.key));
    setConsolidationSuggestions(
      fields
        .map((item): ConsolidationSuggestion | null => {
          const field = text(item.field) as ConsolidationFieldKey;
          const suggestion = text(item.suggestion);
          if (!validKeys.has(field) || !suggestion) return null;
          return {
            id: createId(),
            field,
            suggestion,
            reason: text(item.reason),
          };
        })
        .filter((item): item is ConsolidationSuggestion => Boolean(item))
    );
  }

  async function openGapSuggestions() {
    const result = await generateAiText("gaps", "process_professional_identify_discovery_gaps");
    if (!result) return;
    const parsed = parseJsonObject(result);
    const gaps = Array.isArray(parsed.gaps) ? parsed.gaps : [];
    setGapSuggestions(
      gaps
        .map((item): GapSuggestion => ({
          id: createId(),
          title: text(item.title),
          description: text(item.description),
          question: text(item.question),
        }))
        .filter((item) => item.title || item.description || item.question)
    );
  }

  function applyAiDialog() {
    if (!aiDialog) return;
    const parsed = parseJsonObject(aiDialog.draft);

    if (aiDialog.kind === "rewrite") {
      setDescription(text(parsed.description) || description);
      setNotes(text(parsed.notes) || notes);
      setDraft((prev) => ({
        ...prev,
        objective: text(parsed.objective) || prev.objective,
        main_activities: text(parsed.mainActivities) || prev.main_activities,
        how_it_works: text(parsed.howItWorks) || prev.how_it_works,
        general_observations: text(parsed.generalObservations) || prev.general_observations,
      }));
    }

    if (aiDialog.kind === "complements") {
      const suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];
      const textToAppend = suggestions
        .map((item) => [text(item.title), text(item.text)].filter(Boolean).join(": "))
        .filter(Boolean)
        .join("\n\n");
      if (textToAppend) {
        setDraft((prev) => ({
          ...prev,
          general_observations: [prev.general_observations, textToAppend].filter(Boolean).join("\n\n"),
        }));
      }
    }

    if (aiDialog.kind === "questions") {
      const questions = Array.isArray(parsed.questions) ? parsed.questions : [];
      setDraft((prev) => ({
        ...prev,
        questions: [
          ...prev.questions,
          ...questions
            .map((item) => (typeof item === "string" ? item : text(item.question)))
            .filter(Boolean)
            .map((question) => ({ id: createId(), question, answer: "" })),
        ],
      }));
    }

    if (aiDialog.kind === "organize") {
      setDraft((prev) => ({
        ...prev,
        current_execution: text(parsed.currentExecution) || prev.current_execution,
        identified_steps: text(parsed.identifiedSteps) || prev.identified_steps,
        responsible_area: text(parsed.responsibleArea) || prev.responsible_area,
        participants: text(parsed.participants) || prev.participants,
        systems_used: text(parsed.systemsUsed) || prev.systems_used,
        documents_used: text(parsed.documentsUsed) || prev.documents_used,
        pending_questions: text(parsed.pendingQuestions) || prev.pending_questions,
        survey_observations: text(parsed.observations) || prev.survey_observations,
      }));
    }

    if (aiDialog.kind === "problems") {
      const problems = Array.isArray(parsed.problems) ? parsed.problems : [];
      setDraft((prev) => ({
        ...prev,
        problems: [
          ...prev.problems,
          ...problems
            .map((problem): OfficeProcessProfessionalProblem => ({
              id: createId(),
              description: text(problem.description),
              process_step: text(problem.processStep),
              related_area_or_owner: text(problem.relatedAreaOrOwner),
              perceived_frequency: text(problem.perceivedFrequency),
              perceived_impact: text(problem.perceivedImpact),
              evidence_or_comment: text(problem.evidenceOrComment),
              status: "identified",
            }))
            .filter((problem) => problem.description),
        ],
      }));
    }

    if (aiDialog.kind === "opportunities") {
      const opportunities = Array.isArray(parsed.opportunities) ? parsed.opportunities : [];
      setDraft((prev) => ({
        ...prev,
        opportunities: [
          ...prev.opportunities,
          ...opportunities
            .map((opportunity): OfficeProcessProfessionalOpportunity => ({
              id: createId(),
              description: text(opportunity.description),
              related_problem_id: text(opportunity.relatedProblemId),
              improvement_type: text(opportunity.improvementType),
              expected_benefit: text(opportunity.expectedBenefit),
              estimated_complexity: opportunity.estimatedComplexity ?? "medium",
              priority: opportunity.priority ?? "medium",
              complementary_notes: text(opportunity.complementaryNotes),
            }))
            .filter((opportunity) => opportunity.description),
        ],
      }));
    }

    if (aiDialog.kind === "actions") {
      const actions = Array.isArray(parsed.actions) ? parsed.actions : [];
      setDraft((prev) => ({
        ...prev,
        actions: [
          ...prev.actions,
          ...actions
            .map((action): OfficeProcessProfessionalAction => ({
              id: createId(),
              action: text(action.action),
              related_item: text(action.relatedItem),
              responsible: text(action.responsible) || "Responsável a definir",
              deadline: text(action.deadline),
              status: "not_started",
              notes: text(action.notes),
              completion_evidence: "",
            }))
            .filter((action) => action.action),
        ],
      }));
    }

    if (aiDialog.kind === "summary") {
      updateDraft("status_summary", text(parsed.summary) || aiDialog.draft);
    }

    setAiDialog(null);
  }

  const renderAiButton = (
    kind: AiDialogKind,
    phase: string,
    label: string,
    title: string,
    description: string,
    iconOnly = false
  ) => (
    <Button
      type="button"
      variant="outline"
      size={iconOnly ? "icon" : "sm"}
      className={iconOnly ? undefined : "gap-1.5"}
      disabled={aiLoading !== null}
      title={iconOnly ? label : undefined}
      aria-label={iconOnly ? label : undefined}
      onClick={() => void openAiDialog(kind, phase, title, description)}
    >
      {aiLoading === kind ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : (
        <Sparkles className="h-4 w-4" aria-hidden />
      )}
      {iconOnly ? null : label}
    </Button>
  );

  function saveScript(script: OfficeProcessProfessionalSurveyScript, sourceScriptId?: string) {
    const normalized = normalizeSurveyScript(
      {
        ...script,
        status: script.status ?? "draft",
        updated_at: nowIso(),
      },
      draft.survey_scripts.length
    );

    updateDraft(
      "survey_scripts",
      sourceScriptId
        ? draft.survey_scripts.map((item) => (item.id === sourceScriptId ? normalized : item))
        : [...draft.survey_scripts, normalized]
    );
    setScriptEditor(null);
  }

  function duplicateScript(script: OfficeProcessProfessionalSurveyScript) {
    const timestamp = nowIso();
    return normalizeSurveyScript(
      {
        ...script,
        id: createId(),
        name: `${script.name || "Roteiro"} - nova versão`,
        status: "draft",
        created_at: timestamp,
        updated_at: timestamp,
        blocks: (script.blocks ?? []).map((block, blockIndex) => ({
          ...block,
          id: createId(),
          sort_order: blockIndex,
          questions: (block.questions ?? []).map((question, questionIndex) => ({
            ...question,
            id: createId(),
            sort_order: questionIndex,
          })),
        })),
      },
      draft.survey_scripts.length
    );
  }

  function openCreateScript() {
    if (draft.survey_scripts.length > 0) {
      setScriptChoiceOpen(true);
      return;
    }
    setScriptEditor({ mode: "create", script: emptyScript(officeProcess.name) });
  }

  async function createInterviewFromScript(script: OfficeProcessProfessionalSurveyScript) {
    const id = createId();
    const timestamp = nowIso();
    const record: OfficeProcessProfessionalRecord = {
      id,
      title: `Entrevista - ${script.name || "roteiro"}`,
      date: "",
      source: "",
      description: "",
      people_involved: "",
      related_links: "",
      type: "interview",
      participants: "",
      areas_involved: "",
      responsible: "",
      status: "draft",
      linked_questionnaire_id: script.id,
      script_id: script.id,
      attachment_url: "",
      observations: "",
      use_in_consolidation: true,
      answers: defaultAnswersForScript(script),
      created_at: timestamp,
      updated_at: timestamp,
      collection_origin: "system",
    };
    const updatedRecords = [...draft.records, record];
    updateDraft("records", updatedRecords);
    setSaveError(null);
    setSaving(true);
    const result = await updateOfficeProcessDetails({
      officeProcessId: officeProcess.id,
      description: officeProcess.description ?? "",
      flowchartFiles: officeFlowchartFiles,
      status: officeProcess.status,
      ownerProfileId: officeProcess.owner_profile_id ?? null,
      notes: officeProcess.notes ?? "",
      vcTipoLabel: initialTipoLabelFromOfficeProcess(officeProcess),
      vcMacroprocesso: officeProcess.vc_macroprocesso ?? null,
      vcLevels: draftLevelsForForm(officeProcess, officeProcess.name),
      professionalDetails: toProfessionalDetails({ ...draft, records: updatedRecords }),
    });
    setSaving(false);
    if ("error" in result && result.error) {
      setSaveError(result.error);
      return;
    }
    router.refresh();
    openInterviewFillPage(id);
  }

  function createInterviewWithoutScript() {
    const id = createId();
    const timestamp = nowIso();
    const record: OfficeProcessProfessionalRecord = {
      id,
      title: "",
      date: "",
      source: "",
      description: "",
      people_involved: "",
      related_links: "",
      type: "interview",
      participants: "",
      areas_involved: "",
      responsible: "",
      status: "draft",
      linked_questionnaire_id: "",
      script_id: "",
      attachment_url: "",
      observations: "",
      use_in_consolidation: true,
      answers: [],
      created_at: timestamp,
      updated_at: timestamp,
      collection_origin: "system",
    };
    updateDraft("records", [...draft.records, record]);
    setInterviewAddOpen(false);
    setNewInterviewScriptId("");
    openInterviewEditor(record, null, { initialSection: "metadata" });
  }

  function handleAddInterviewFromDialog() {
    if (!newInterviewScriptId) {
      createInterviewWithoutScript();
      return;
    }
    const script = draft.survey_scripts.find((item) => item.id === newInterviewScriptId);
    if (!script) return;
    setInterviewAddOpen(false);
    setNewInterviewScriptId("");
    void createInterviewFromScript(script);
  }

  function saveInterview(record: OfficeProcessProfessionalRecord, sourceRecordId?: string) {
    const timestamp = nowIso();
    const normalizedRecord = syncRecordAttachmentFields({
      ...record,
      people_involved: record.participants ?? record.people_involved,
      linked_questionnaire_id: record.script_id ?? record.linked_questionnaire_id,
      updated_at: timestamp,
      created_at: record.created_at || timestamp,
    });
    updateDraft(
      "records",
      sourceRecordId
        ? draft.records.map((item) => (item.id === sourceRecordId ? normalizedRecord : item))
        : [...draft.records, normalizedRecord]
    );
    setInterviewEditor(null);
    setInterviewNewLinkUrl("");
    setInterviewNewLinkType("Link");
    setInterviewAttachmentError(null);
  }

  function updateInterviewAnswer(
    questionId: string | undefined,
    answer: string,
    record: OfficeProcessProfessionalRecord
  ) {
    if (!questionId) return record;
    const answers = record.answers ?? [];
    const exists = answers.some((item) => item.question_id === questionId);
    return {
      ...record,
      answers: exists
        ? answers.map((item) => (item.question_id === questionId ? { ...item, answer } : item))
        : [...answers, { question_id: questionId, answer }],
    };
  }

  function updateInterviewFillSession(
    updater: (session: InterviewFillSessionState) => InterviewFillSessionState
  ) {
    setInterviewFillSession((prev) => (prev ? updater(prev) : prev));
  }

  function updateInterviewFillAnswer(questionId: string | undefined, answer: string) {
    updateInterviewFillSession((session) => ({
      ...session,
      record: updateInterviewAnswer(questionId, answer, session.record),
    }));
  }

  function appendFillAttachment(attachment: OfficeProcessProfessionalRecordAttachment) {
    if (!attachment.url?.trim()) return;
    updateInterviewFillSession((session) => ({
      ...session,
      record: syncRecordAttachmentFields({
        ...session.record,
        attachments: [
          ...getRecordAttachments(session.record),
          {
            id: attachment.id || createId(),
            name: attachment.name || fileNameFromUrl(attachment.url ?? ""),
            type: attachment.type || "Documento",
            url: attachment.url,
          },
        ],
      }),
    }));
  }

  function removeFillAttachment(attachmentId: string | undefined) {
    if (!attachmentId) return;
    updateInterviewFillSession((session) => ({
      ...session,
      record: syncRecordAttachmentFields({
        ...session.record,
        attachments: getRecordAttachments(session.record).filter(
          (item) => item.id !== attachmentId
        ),
      }),
    }));
  }

  async function uploadFillAttachment(file: File | null | undefined) {
    if (!file?.size || !interviewFillSession) return;
    setFillAttachmentError(null);
    setFillAttachmentUploading(true);
    const result = await uploadOfficeProcessFileViaApi({
      officeProcessId: officeProcess.id,
      kind: "attachment",
      file,
    });
    setFillAttachmentUploading(false);
    if ("error" in result && result.error) {
      setFillAttachmentError(result.error);
      return;
    }
    if ("success" in result && result.success && result.url) {
      appendFillAttachment({
        id: createId(),
        name: file.name,
        type: inferAttachmentTypeFromFile(file),
        url: result.url,
      });
    }
  }

  function addFillLinkAttachment() {
    const url = fillNewLinkUrl.trim();
    if (!url) {
      setFillAttachmentError("Informe o link antes de adicionar.");
      return;
    }
    setFillAttachmentError(null);
    appendFillAttachment({
      id: createId(),
      name: url,
      type: fillNewLinkType || "Link",
      url,
    });
    setFillNewLinkUrl("");
    setFillNewLinkType("Link");
  }

  async function saveInterviewFillSession(
    recordStatus: OfficeProcessProfessionalRecordStatus = "draft"
  ) {
    if (!interviewFillSession) return;
    setSaveError(null);
    setSaving(true);

    const normalizedRecord = syncRecordAttachmentFields({
      ...interviewFillSession.record,
      status: recordStatus,
      people_involved:
        interviewFillSession.record.participants ?? interviewFillSession.record.people_involved,
      linked_questionnaire_id:
        interviewFillSession.record.script_id ??
        interviewFillSession.record.linked_questionnaire_id,
      updated_at: nowIso(),
      created_at: interviewFillSession.record.created_at || nowIso(),
    });

    const recordExists = draft.records.some(
      (item) => item.id === interviewFillSession.sourceRecordId
    );
    const updatedRecords = recordExists
      ? draft.records.map((item) =>
          item.id === interviewFillSession.sourceRecordId ? normalizedRecord : item
        )
      : [...draft.records, normalizedRecord];

    const updatedDraft: ProfessionalDraft = {
      ...draft,
      records: updatedRecords,
    };

    const result = await updateOfficeProcessDetails({
      officeProcessId: officeProcess.id,
      description: officeProcess.description ?? "",
      flowchartFiles: officeFlowchartFiles,
      status: officeProcess.status,
      ownerProfileId: officeProcess.owner_profile_id ?? null,
      notes: officeProcess.notes ?? "",
      vcTipoLabel: initialTipoLabelFromOfficeProcess(officeProcess),
      vcMacroprocesso: officeProcess.vc_macroprocesso ?? null,
      vcLevels: draftLevelsForForm(officeProcess, officeProcess.name),
      professionalDetails: toProfessionalDetails(updatedDraft),
    });

    if ("error" in result && result.error) {
      setSaveError(result.error);
      setSaving(false);
      return;
    }

    setDraft(updatedDraft);
    setInterviewFillSession((prev) =>
      prev ? { ...prev, record: normalizedRecord } : null
    );
    setSaving(false);
    router.refresh();
  }

  function updateScriptEditorScript(
    updater: (script: OfficeProcessProfessionalSurveyScript) => OfficeProcessProfessionalSurveyScript
  ) {
    setScriptEditor((prev) => (prev ? { ...prev, script: updater(prev.script) } : prev));
  }

  function updateScriptBlock(
    blockId: string | undefined,
    changes: Partial<OfficeProcessProfessionalScriptBlock>
  ) {
    updateScriptEditorScript((script) => ({
      ...script,
      blocks: (script.blocks ?? []).map((block) =>
        block.id === blockId ? { ...block, ...changes } : block
      ),
    }));
  }

  function addScriptBlock() {
    updateScriptEditorScript((script) => ({
      ...script,
      blocks: [
        ...(script.blocks ?? []),
        {
          id: createId(),
          title: `Novo bloco ${(script.blocks ?? []).length + 1}`,
          sort_order: (script.blocks ?? []).length,
          questions: [],
        },
      ],
    }));
  }

  function addScriptQuestion(blockId: string | undefined) {
    updateScriptEditorScript((script) => ({
      ...script,
      blocks: (script.blocks ?? []).map((block) =>
        block.id === blockId
          ? {
              ...block,
              questions: [
                ...(block.questions ?? []),
                {
                  id: createId(),
                  question: "",
                  sort_order: (block.questions ?? []).length,
                },
              ],
            }
          : block
      ),
    }));
  }

  function updateScriptQuestion(
    blockId: string | undefined,
    questionId: string | undefined,
    changes: Partial<OfficeProcessProfessionalScriptQuestion>
  ) {
    updateScriptEditorScript((script) => ({
      ...script,
      blocks: (script.blocks ?? []).map((block) =>
        block.id === blockId
          ? {
              ...block,
              questions: (block.questions ?? []).map((question) =>
                question.id === questionId ? { ...question, ...changes } : question
              ),
            }
          : block
      ),
    }));
  }

  function removeScriptQuestion(blockId: string | undefined, questionId: string | undefined) {
    updateScriptEditorScript((script) => ({
      ...script,
      blocks: (script.blocks ?? []).map((block) =>
        block.id === blockId
          ? {
              ...block,
              questions: (block.questions ?? []).filter((question) => question.id !== questionId),
            }
          : block
      ),
    }));
  }

  function duplicateScriptQuestion(
    blockId: string | undefined,
    question: OfficeProcessProfessionalScriptQuestion
  ) {
    updateScriptEditorScript((script) => ({
      ...script,
      blocks: (script.blocks ?? []).map((block) =>
        block.id === blockId
          ? {
              ...block,
              questions: [
                ...(block.questions ?? []),
                {
                  ...question,
                  id: createId(),
                  question: `${question.question ?? ""} (cópia)`,
                  sort_order: (block.questions ?? []).length,
                },
              ],
            }
          : block
      ),
    }));
  }

  function moveScriptQuestion(
    blockId: string | undefined,
    questionIndex: number,
    direction: -1 | 1
  ) {
    updateScriptEditorScript((script) => ({
      ...script,
      blocks: (script.blocks ?? []).map((block) => {
        if (block.id !== blockId) return block;
        const questions = [...(block.questions ?? [])];
        const targetIndex = questionIndex + direction;
        if (targetIndex < 0 || targetIndex >= questions.length) return block;
        [questions[questionIndex], questions[targetIndex]] = [
          questions[targetIndex],
          questions[questionIndex],
        ];
        return {
          ...block,
          questions: questions.map((question, index) => ({ ...question, sort_order: index })),
        };
      }),
    }));
  }

  function moveQuestionToBlock(
    fromBlockId: string | undefined,
    question: OfficeProcessProfessionalScriptQuestion,
    targetBlockId: string
  ) {
    if (!question.id || fromBlockId === targetBlockId) return;
    updateScriptEditorScript((script) => ({
      ...script,
      blocks: (script.blocks ?? []).map((block) => {
        if (block.id === fromBlockId) {
          return {
            ...block,
            questions: (block.questions ?? []).filter((item) => item.id !== question.id),
          };
        }
        if (block.id === targetBlockId) {
          return {
            ...block,
            questions: [
              ...(block.questions ?? []),
              { ...question, sort_order: (block.questions ?? []).length },
            ],
          };
        }
        return block;
      }),
    }));
  }

  function addRecord() {
    const id = createId();
    const timestamp = nowIso();
    updateDraft("records", [
      ...draft.records,
      {
        id,
        title: "",
        date: "",
        source: "",
        description: "",
        people_involved: "",
        related_links: "",
        type: "interview",
        participants: "",
        areas_involved: "",
        responsible: "",
        status: "draft",
        linked_questionnaire_id: "",
        attachment_url: "",
        observations: "",
        use_in_consolidation: true,
        created_at: timestamp,
        updated_at: timestamp,
        collection_origin: "external",
      },
    ]);
    setInterviewEditor({
      record: {
        id,
        title: "",
        date: "",
        type: "interview",
        participants: "",
        areas_involved: "",
        responsible: "",
        status: "draft",
        attachment_url: "",
        observations: "",
        use_in_consolidation: true,
        answers: [],
        created_at: timestamp,
        updated_at: timestamp,
        collection_origin: "external",
      },
      sourceRecordId: id,
      script: null,
      initialSection: "attachments",
    });
  }

  function openInterviewEditor(
    record: OfficeProcessProfessionalRecord,
    script: OfficeProcessProfessionalSurveyScript | null,
    options?: {
      initialSection?: InterviewEditorInitialSection;
      readOnlyResponses?: boolean;
    }
  ) {
    const resolvedScript =
      script ??
      draft.survey_scripts.find(
        (item) => item.id === (record.script_id || record.linked_questionnaire_id)
      ) ??
      null;
    const syncedRecord = resolvedScript
      ? syncRecordAnswersWithScript(resolvedScript, record)
      : record;
    setInterviewEditor({
      record: syncedRecord,
      sourceRecordId: record.id,
      script: resolvedScript,
      initialSection: options?.initialSection,
      readOnlyResponses: options?.readOnlyResponses,
    });
  }

  function updateRecord(index: number, changes: Partial<OfficeProcessProfessionalRecord>) {
    updateDraft(
      "records",
      draft.records.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...changes, updated_at: nowIso() } : item
      )
    );
  }

  function appendInterviewAttachment(attachment: OfficeProcessProfessionalRecordAttachment) {
    if (!attachment.url?.trim()) return;
    setInterviewEditor((prev) =>
      prev
        ? {
            ...prev,
            record: syncRecordAttachmentFields({
              ...prev.record,
              attachments: [
                ...getRecordAttachments(prev.record),
                {
                  id: attachment.id || createId(),
                  name: attachment.name || fileNameFromUrl(attachment.url ?? ""),
                  type: attachment.type || "Documento",
                  url: attachment.url,
                },
              ],
            }),
          }
        : prev
    );
  }

  function removeInterviewAttachment(attachmentId: string | undefined) {
    if (!attachmentId) return;
    setInterviewEditor((prev) =>
      prev
        ? {
            ...prev,
            record: syncRecordAttachmentFields({
              ...prev.record,
              attachments: getRecordAttachments(prev.record).filter(
                (item) => item.id !== attachmentId
              ),
            }),
          }
        : prev
    );
  }

  async function uploadInterviewAttachment(file: File | null | undefined) {
    if (!file?.size || !interviewEditor) return;
    setInterviewAttachmentError(null);
    setInterviewAttachmentUploading(true);
    const result = await uploadOfficeProcessFileViaApi({
      officeProcessId: officeProcess.id,
      kind: "attachment",
      file,
    });
    setInterviewAttachmentUploading(false);
    if ("error" in result && result.error) {
      setInterviewAttachmentError(result.error);
      return;
    }
    if ("success" in result && result.success && result.url) {
      appendInterviewAttachment({
        id: createId(),
        name: file.name,
        type: inferAttachmentTypeFromFile(file),
        url: result.url,
      });
    }
  }

  function addInterviewLinkAttachment() {
    const url = interviewNewLinkUrl.trim();
    if (!url) {
      setInterviewAttachmentError("Informe o link antes de adicionar.");
      return;
    }
    setInterviewAttachmentError(null);
    appendInterviewAttachment({
      id: createId(),
      name: url,
      type: interviewNewLinkType || "Link",
      url,
    });
    setInterviewNewLinkUrl("");
    setInterviewNewLinkType("Link");
  }

  async function exportScriptDocx(script: OfficeProcessProfessionalSurveyScript) {
    const title = script.name || `Roteiro de levantamento - ${officeProcess.name}`;
    const children: Paragraph[] = [docxHeading(title)];

    sortByOrder(script.blocks ?? []).forEach((block) => {
      children.push(docxParagraph(block.title || "Bloco sem título", true));
      sortByOrder(block.questions ?? []).forEach((question, index) => {
        children.push(
          docxParagraph(`${index + 1}. ${question.question || "Pergunta sem texto"}`)
        );
      });
    });

    const docxDoc = new Document({
      sections: [
        {
          children,
        },
      ],
    });
    const blob = await Packer.toBlob(docxDoc);
    downloadBlob(blob, `${sanitizeFilename(title) || "roteiro-levantamento"}.docx`);
  }

  async function exportInterviewAnswersDocx(
    record: OfficeProcessProfessionalRecord,
    script: OfficeProcessProfessionalSurveyScript | null
  ) {
    const title = record.title || `Respostas - ${officeProcess.name}`;
    const children: Paragraph[] = [docxHeading(title)];
    children.push(docxParagraph(`Roteiro: ${script?.name || "Sem roteiro vinculado"}`));
    children.push(docxParagraph(`Participantes: ${record.participants || record.people_involved || "-"}`));
    children.push(docxParagraph(`Data: ${record.date || "-"}`));

    if (script) {
      sortByOrder(script.blocks ?? []).forEach((block) => {
        children.push(docxParagraph(block.title || "Bloco sem título", true));
        sortByOrder(block.questions ?? []).forEach((question, index) => {
          const answer =
            (record.answers ?? []).find((item) => item.question_id === question.id)?.answer ??
            "Sem resposta preenchida.";
          children.push(docxParagraph(`${index + 1}. ${question.question || "Pergunta sem texto"}`, true));
          children.push(docxParagraph(answer));
        });
      });
    } else {
      children.push(docxParagraph(record.observations || record.description || "Sem respostas estruturadas."));
    }

    const docxDoc = new Document({ sections: [{ children }] });
    const blob = await Packer.toBlob(docxDoc);
    downloadBlob(blob, `${sanitizeFilename(title) || "respostas-entrevista"}.docx`);
  }

  function buildConsolidationExportData(): ConsolidationExportData {
    const fields = {} as ConsolidationExportData["fields"];
    CONSOLIDATION_FIELDS.forEach((field) => {
      fields[field.key] = draft[field.key] ?? "";
    });
    return {
      processName: officeProcess.name,
      fields,
    };
  }

  async function exportConsolidationDocument(format: "pdf" | "docx") {
    setConsolidationExporting(true);
    try {
      const data = buildConsolidationExportData();
      const baseName =
        sanitizeFilename(`consolidacao-levantamento-${officeProcess.name}`) ||
        "consolidacao-levantamento";
      await runDocumentExport({
        data,
        filename: `${baseName}.${format}`,
        format,
        documentType: "consolidacao_levantamento",
        branding: identity?.branding ?? null,
      });
    } finally {
      setConsolidationExporting(false);
    }
  }

  function applyConsolidationSuggestion(suggestion: ConsolidationSuggestion) {
    updateDraft(suggestion.field, suggestion.suggestion);
    setConsolidationSuggestions((prev) => prev.filter((item) => item.id !== suggestion.id));
  }

  function discardConsolidationSuggestion(id: string) {
    setConsolidationSuggestions((prev) => prev.filter((item) => item.id !== id));
  }

  function acceptGapAsPending(gap: GapSuggestion) {
    const textToAppend = [gap.title, gap.description, gap.question ? `Pergunta: ${gap.question}` : ""]
      .filter(Boolean)
      .join("\n");
    updateDraft(
      "pending_questions",
      [draft.pending_questions, textToAppend].filter(Boolean).join("\n\n")
    );
    setGapSuggestions((prev) => prev.filter((item) => item.id !== gap.id));
  }

  function acceptGapAsQuestion(gap: GapSuggestion) {
    if (gap.question) {
      const scripts = draft.survey_scripts.length
        ? draft.survey_scripts
        : [emptyScript(officeProcess.name)];
      const [firstScript, ...otherScripts] = scripts;
      const blocks = firstScript.blocks?.length
        ? firstScript.blocks
        : [
            {
              id: createId(),
              title: "Dúvidas para validação",
              sort_order: 0,
              questions: [],
            },
          ];
      const targetBlockIndex = blocks.findIndex((block) =>
        (block.title ?? "").toLowerCase().includes("dúvidas")
      );
      const indexToUse = targetBlockIndex >= 0 ? targetBlockIndex : blocks.length - 1;
      const updatedBlocks = blocks.map((block, index) =>
        index === indexToUse
          ? {
              ...block,
              questions: [
                ...(block.questions ?? []),
                {
                  id: createId(),
                  question: gap.question,
                  sort_order: (block.questions ?? []).length,
                },
              ],
            }
          : block
      );
      updateDraft("survey_scripts", [
        {
          ...firstScript,
          updated_at: nowIso(),
          blocks: updatedBlocks,
        },
        ...otherScripts,
      ]);
    }
    setGapSuggestions((prev) => prev.filter((item) => item.id !== gap.id));
  }

  const statusLabel =
    PROCESS_SITUATION_OPTIONS.find((option) => option.value === status)?.label ??
    OFFICE_PROCESS_STATUS_META[status].label;
  const statusVariant = OFFICE_PROCESS_STATUS_META[status].variant;
  const totalActions = draft.actions.length;
  const completedActions = actionStats.completed;
  const actionProgressPercent = totalActions
    ? Math.round((completedActions / totalActions) * 100)
    : 0;
  const openProblems = draft.problems.filter((problem) => problem.status !== "resolved").length;
  const currentTabContent = PROFESSIONAL_TAB_CONTENT[activeTab];
  const professionalInsightHints = [
    actionStats.overdue > 0
      ? `${actionStats.overdue} ação(ões) atrasada(s) precisam de atenção.`
      : null,
    openProblems > 0 ? `${openProblems} problema(s) ainda não foram resolvidos.` : null,
    draft.opportunities.length > 0 && draft.actions.length === 0
      ? "Transforme oportunidades registradas em ações simples para avançar."
      : null,
    draft.records.length === 0
      ? "Registre ao menos uma reunião, entrevista ou observação no levantamento."
      : null,
  ].filter(Boolean) as string[];

  const workspaceSidebar = (
    <ProcessWorkspaceSidebar
      statusLabel={statusLabel}
      statusVariant={statusVariant}
      recentEvents={[]}
      onViewFullHistory={() => handleTabChange("acompanhamento")}
      checklistSummary={`${completedActions}/${totalActions} ações concluídas`}
      attachmentsCount={attachments.length}
      materialsCount={editedFlowchartFiles.length}
      insightHints={professionalInsightHints}
    />
  );

  const renderSaveFooter = () => (
    <div className="flex flex-col gap-3 border-t border-border/40 pt-6 sm:flex-row sm:items-center sm:justify-end">
      {saveError ? (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{saveError}</div>
      ) : null}
      {aiError ? (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{aiError}</div>
      ) : null}
      <Button type="submit" disabled={saving}>
        {saving ? "Salvando..." : "Salvar alterações"}
      </Button>
    </div>
  );

  const renderProcessDocumentsSection = () => (
    <Card className={WORKSPACE_SECTION_CARD_CLASS}>
      <CardHeader className={WORKSPACE_SECTION_HEADER_CLASS}>
        <div className={WORKSPACE_SECTION_INTRO_CLASS}>
          <CardTitle>Documentos do processo</CardTitle>
          <CardDescription>
            Documentos de apoio, evidências e arquivos úteis para a análise e operação do processo.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className={cn(WORKSPACE_SECTION_CONTENT_CLASS, "space-y-6")}>
        <div className="space-y-3">
          {attachments.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="Nenhum documento cadastrado"
              description="Envie documentos para formar a base de conhecimento deste processo."
            />
          ) : (
            attachments.map((attachment) => {
              const fileName = processAttachmentDisplayName(attachment);
              return (
                <div
                  key={attachment.id}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-background p-3 md:flex-row md:items-center"
                >
                  <FileExtBadge name={fileName} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium" title={fileName}>
                      {fileName}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={attachment.attachment_url}
                      target="_blank"
                      rel="noreferrer"
                      download
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      Baixar
                    </a>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={deletingAttachmentId === attachment.id}
                      onClick={() => void handleDeleteAttachment(attachment.id)}
                      aria-label="Remover documento"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="space-y-4 rounded-xl border border-border/70 bg-muted/20 p-4">
          <div className={WORKSPACE_SECTION_INTRO_CLASS}>
            <h3 className="text-sm font-semibold">Novo documento</h3>
            <p className="text-sm text-muted-foreground">
              Envie um ou mais arquivos para o repositório.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Arquivos</Label>
            {newAttachmentFiles.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center gap-2 rounded-lg border bg-background p-2"
              >
                <FileExtBadge name={file.name} />
                <p className="min-w-0 flex-1 truncate text-sm" title={file.name}>
                  {file.name}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setNewAttachmentFiles((prev) => prev.filter((_, itemIndex) => itemIndex !== index))
                  }
                  aria-label={`Remover ${file.name}`}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            <Input
              type="file"
              multiple
              accept="*/*"
              onChange={(event) => {
                const files = event.target.files;
                if (!files?.length) return;
                addAttachmentFiles(files);
                event.target.value = "";
              }}
            />
          </div>
          {attachmentError ? (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {attachmentError}
            </div>
          ) : null}
          <Button
            type="button"
            disabled={attachmentUploading || newAttachmentFiles.length === 0}
            onClick={() => void handleAttachmentAdd()}
          >
            {attachmentUploading
              ? "Enviando..."
              : `Adicionar ${newAttachmentFiles.length > 0 ? newAttachmentFiles.length : ""} documento(s)`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const interviewFillId = searchParams.get("entrevista");
  const isInterviewFillView = Boolean(interviewFillId);

  if (isInterviewFillView) {
    const fillRecordLookup = interviewFillId
      ? draft.records.find((item) => item.id === interviewFillId)
      : null;

    if (!fillRecordLookup) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
          <Card className="max-w-lg">
            <CardHeader>
              <div className={WORKSPACE_SECTION_INTRO_CLASS}>
                <CardTitle>Entrevista não encontrada</CardTitle>
                <CardDescription>
                  O registro solicitado não existe ou foi removido deste processo.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <Button type="button" variant="outline" onClick={closeInterviewFillView}>
                Voltar ao levantamento
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (!interviewFillSession) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Carregando entrevista...
          </div>
        </div>
      );
    }

    const fillScript =
      draft.survey_scripts.find(
        (item) =>
          item.id ===
          (interviewFillSession.record.script_id || interviewFillSession.record.linked_questionnaire_id)
      ) ?? null;
    const fillReadOnly = interviewFillSession.readOnly ?? false;
    const fillOrphanAnswers = getOrphanAnswers(fillScript, interviewFillSession.record);
    const fillAnsweredCount = (interviewFillSession.record.answers ?? []).filter((answer) =>
      answer.answer?.trim()
    ).length;
    const fillTotalQuestions = fillScript ? countScriptQuestions(fillScript) : 0;

    return (
      <div className="min-h-screen bg-background px-4 py-6 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex flex-col gap-3 border-b border-border/60 pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Entrevista / levantamento realizado
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight">
                {interviewFillSession.record.title || "Entrevista sem título"}
              </h1>
              {fillScript ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  Roteiro utilizado: {fillScript.name || "Sem nome"}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={closeInterviewFillView}>
                Voltar ao levantamento
              </Button>
              {!fillReadOnly ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={saving}
                    onClick={() => void saveInterviewFillSession("draft")}
                  >
                    {saving ? "Salvando..." : "Salvar rascunho"}
                  </Button>
                  <Button
                    type="button"
                    disabled={saving}
                    onClick={() => void saveInterviewFillSession("filled")}
                  >
                    Concluir entrevista
                  </Button>
                </>
              ) : null}
            </div>
          </div>

          {saveError ? (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {saveError}
            </div>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Identificação da coleta</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-3">
              <Field
                id="fill-interview-title"
                label="Título do registro"
                value={interviewFillSession.record.title ?? ""}
                readOnly={fillReadOnly}
                onChange={(value) =>
                  updateInterviewFillSession((session) => ({
                    ...session,
                    record: { ...session.record, title: value },
                  }))
                }
              />
              <Field
                id="fill-interview-date"
                type="date"
                label="Data da entrevista"
                value={interviewFillSession.record.date ?? ""}
                readOnly={fillReadOnly}
                onChange={(value) =>
                  updateInterviewFillSession((session) => ({
                    ...session,
                    record: { ...session.record, date: value },
                  }))
                }
              />
              <div className="space-y-2">
                <Label>Tipo de levantamento</Label>
                <Select
                  value={interviewFillSession.record.type ?? "interview"}
                  disabled={fillReadOnly}
                  onChange={(event) =>
                    updateInterviewFillSession((session) => ({
                      ...session,
                      record: {
                        ...session.record,
                        type: event.target.value as OfficeProcessProfessionalRecordType,
                      },
                    }))
                  }
                >
                  {RECORD_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
              <Field
                id="fill-interview-participants"
                label="Entrevistado(s) ou participantes"
                value={
                  interviewFillSession.record.participants ??
                  interviewFillSession.record.people_involved ??
                  ""
                }
                readOnly={fillReadOnly}
                onChange={(value) =>
                  updateInterviewFillSession((session) => ({
                    ...session,
                    record: {
                      ...session.record,
                      participants: value,
                      people_involved: value,
                    },
                  }))
                }
              />
              <Field
                id="fill-interview-areas"
                label="Área(s) envolvida(s)"
                value={interviewFillSession.record.areas_involved ?? ""}
                readOnly={fillReadOnly}
                onChange={(value) =>
                  updateInterviewFillSession((session) => ({
                    ...session,
                    record: { ...session.record, areas_involved: value },
                  }))
                }
              />
              <Field
                id="fill-interview-responsible"
                label="Responsável pelo registro"
                value={interviewFillSession.record.responsible ?? ""}
                readOnly={fillReadOnly}
                onChange={(value) =>
                  updateInterviewFillSession((session) => ({
                    ...session,
                    record: { ...session.record, responsible: value },
                  }))
                }
              />
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={interviewFillSession.record.status ?? "draft"}
                  disabled={fillReadOnly}
                  onChange={(event) =>
                    updateInterviewFillSession((session) => ({
                      ...session,
                      record: {
                        ...session.record,
                        status: event.target.value as OfficeProcessProfessionalRecordStatus,
                      },
                    }))
                  }
                >
                  {RECORD_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
            </CardContent>
          </Card>

          {fillScript ? (
            <>
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                <p className="text-sm font-semibold">Respostas do roteiro</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Progresso: {fillAnsweredCount}/{fillTotalQuestions} respostas preenchidas
                </p>
              </div>
              <div className="space-y-4">
                {sortByOrder(fillScript.blocks ?? []).map((block) => (
                  <Card key={block.id}>
                    <CardHeader>
                      <div className={WORKSPACE_SECTION_INTRO_CLASS}>
                        <CardTitle>{block.title || "Bloco sem título"}</CardTitle>
                        <CardDescription>
                          {sortByOrder(block.questions ?? []).length} pergunta(s)
                        </CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {sortByOrder(block.questions ?? []).map((question, index) => {
                        const answer =
                          (interviewFillSession.record.answers ?? []).find(
                            (item) => item.question_id === question.id
                          )?.answer ?? "";
                        return (
                          <div
                            key={question.id}
                            className="space-y-3 rounded-lg border border-border/60 bg-card p-4"
                          >
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              Pergunta {index + 1}
                            </p>
                            <p className="text-sm leading-relaxed">
                              {question.question || "Pergunta sem texto"}
                            </p>
                            {fillReadOnly ? (
                              <p className="whitespace-pre-wrap rounded-md bg-muted/30 p-3 text-sm text-muted-foreground">
                                {answer.trim() || "Sem resposta"}
                              </p>
                            ) : (
                              <TextField
                                id={`fill-answer-${question.id}`}
                                label="Resposta"
                                value={answer}
                                rows={4}
                                onChange={(value) => updateInterviewFillAnswer(question.id, value)}
                              />
                            )}
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          ) : null}

          {fillOrphanAnswers.length > 0 ? (
            <Card>
              <CardHeader>
                <div className={WORKSPACE_SECTION_INTRO_CLASS}>
                  <CardTitle className="text-base">Respostas de perguntas anteriores</CardTitle>
                  <CardDescription>
                    Estas respostas pertencem a perguntas que não existem mais no roteiro atual.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {fillOrphanAnswers.map((orphan, index) => (
                  <div
                    key={orphan.question_id ?? index}
                    className="space-y-3 rounded-lg border border-dashed border-border/60 bg-muted/20 p-4"
                  >
                    <p className="text-xs text-muted-foreground">
                      Pergunta removida do roteiro (ID: {orphan.question_id})
                    </p>
                    {fillReadOnly ? (
                      <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                        {orphan.answer?.trim() || "Sem resposta"}
                      </p>
                    ) : (
                      <TextField
                        id={`fill-orphan-${orphan.question_id}`}
                        label="Resposta preservada"
                        value={orphan.answer ?? ""}
                        rows={3}
                        onChange={(value) =>
                          updateInterviewFillAnswer(orphan.question_id, value)
                        }
                      />
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Anexos da entrevista</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {getRecordAttachments(interviewFillSession.record).length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum anexo vinculado.</p>
              ) : (
                <div className="space-y-2">
                  {getRecordAttachments(interviewFillSession.record).map((attachment) => {
                    const attachmentName =
                      attachment.name?.trim() ||
                      fileNameFromUrl(attachment.url ?? "") ||
                      "Anexo sem nome";
                    return (
                      <div
                        key={attachment.id}
                        className="flex flex-wrap items-center gap-2 rounded-lg border border-border/70 bg-muted/20 px-3 py-3"
                      >
                        <FileExtBadge name={attachmentName} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium" title={attachmentName}>
                            {attachmentName}
                          </p>
                          {attachment.type ? (
                            <p className="text-xs text-muted-foreground">{attachment.type}</p>
                          ) : null}
                        </div>
                        {attachment.url ? (
                          <a
                            href={attachment.url}
                            target="_blank"
                            rel="noreferrer"
                            className={cn(
                              buttonVariants({ variant: "ghost", size: "icon" }),
                              "shrink-0"
                            )}
                            title="Abrir anexo"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        ) : null}
                        {!fillReadOnly ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeFillAttachment(attachment.id)}
                            title="Remover anexo"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
              {!fillReadOnly ? (
                <>
                  <input
                    ref={fillAttachmentInputRef}
                    type="file"
                    className="hidden"
                    accept="*/*"
                    onChange={(event) => {
                      void uploadFillAttachment(event.target.files?.[0]);
                      event.target.value = "";
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={fillAttachmentUploading}
                    onClick={() => fillAttachmentInputRef.current?.click()}
                  >
                    {fillAttachmentUploading ? "Enviando arquivo..." : "Selecionar arquivo"}
                  </Button>
                  <div className="grid gap-4 lg:grid-cols-[1fr_auto_auto] lg:items-end">
                    <Field
                      id="fill-link-url"
                      label="Link relacionado"
                      value={fillNewLinkUrl}
                      onChange={setFillNewLinkUrl}
                      placeholder="https://..."
                    />
                    <div className="space-y-2">
                      <Label>Tipo</Label>
                      <Select
                        value={fillNewLinkType}
                        onChange={(event) => setFillNewLinkType(event.target.value)}
                      >
                        {RECORD_ATTACHMENT_TYPE_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <Button type="button" variant="outline" onClick={addFillLinkAttachment}>
                      Adicionar link
                    </Button>
                  </div>
                  {fillAttachmentError ? (
                    <p className="text-sm text-destructive">{fillAttachmentError}</p>
                  ) : null}
                </>
              ) : null}
            </CardContent>
          </Card>

          <TextField
            id="fill-observations"
            label="Observações"
            value={
              interviewFillSession.record.observations ??
              interviewFillSession.record.description ??
              ""
            }
            rows={3}
            readOnly={fillReadOnly}
            onChange={(value) =>
              updateInterviewFillSession((session) => ({
                ...session,
                record: {
                  ...session.record,
                  observations: value,
                  description: value,
                },
              }))
            }
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(interviewFillSession.record.use_in_consolidation)}
              disabled={fillReadOnly}
              onChange={(event) =>
                updateInterviewFillSession((session) => ({
                  ...session,
                  record: {
                    ...session.record,
                    use_in_consolidation: event.target.checked,
                  },
                }))
              }
            />
            Usar na consolidação
          </label>

          {!fillReadOnly ? (
            <div className="flex flex-col gap-3 border-t border-border/40 pt-6 sm:flex-row sm:items-center sm:justify-end">
              <Button type="button" variant="outline" onClick={closeInterviewFillView}>
                Voltar ao levantamento
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => void saveInterviewFillSession("draft")}
              >
                {saving ? "Salvando..." : "Salvar rascunho"}
              </Button>
              <Button
                type="button"
                disabled={saving}
                onClick={() => void saveInterviewFillSession("filled")}
              >
                Concluir entrevista
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <ProcessWorkspaceShell>
      <div className="space-y-6">
        <Card className="overflow-hidden border-border/80 border-l-[4px] border-l-[var(--identity-primary)] shadow-[var(--shadow-card)]">
          <CardContent className="grid gap-6 p-5 lg:grid-cols-10 lg:p-6">
            <div className="space-y-4 lg:col-span-7">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Gestão Profissional do Processo
                  </p>
                  <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                    {officeProcess.name}
                  </h1>
                  <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
                    Analise o processo, organize informações de levantamento e acompanhe ações de
                    melhoria de forma prática.
                  </p>
                </div>
                <Badge variant={statusVariant}>{statusLabel}</Badge>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Problemas abertos" value={openProblems} />
                <StatCard label="Ações em andamento" value={actionStats.inProgress} />
                <StatCard label="Ações atrasadas" value={actionStats.overdue} />
                <StatCard
                  label="Última atualização"
                  value={
                    officeProcess.updated_at
                      ? formatDateTimePtBr(officeProcess.updated_at, timeZone)
                      : "-"
                  }
                />
              </div>
            </div>
            <div className="space-y-4 rounded-xl border border-border/70 bg-muted/25 p-4 lg:col-span-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Avanço das ações
                </p>
                <p className="mt-1 text-2xl font-semibold text-foreground">
                  {actionProgressPercent}%
                </p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-border/70">
                  <div
                    className="h-full rounded-full bg-[var(--identity-primary)] transition-all"
                    style={{ width: `${actionProgressPercent}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {completedActions}/{totalActions} ações concluídas
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-lg border border-border/60 bg-card p-3">
                  <p className="text-xs text-muted-foreground">Oportunidades</p>
                  <p className="text-lg font-semibold">{draft.opportunities.length}</p>
                </div>
                <div className="rounded-lg border border-border/60 bg-card p-3">
                  <p className="text-xs text-muted-foreground">Documentos</p>
                  <p className="text-lg font-semibold">{attachments.length}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <form onSubmit={handleSaveProcess} className="space-y-6">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
            <ProcessWorkspaceJourneyBar
              tabs={PROFESSIONAL_WORKSPACE_TABS}
              activeTab={activeTab}
              secondaryHighlightTabId={null}
              bpmPhaseRows={[]}
            />

            <TabsContent value="visao-geral" className="mt-0">
              <ProcessWorkspaceStageLayout
                moduleTitle={currentTabContent.title}
                moduleDescription={currentTabContent.description}
                stageObjective={currentTabContent.objective}
                contextHint={currentTabContent.hint}
                sidebar={workspaceSidebar}
                workPanelClassName="space-y-8"
              >
                <div className="space-y-0">
              <ProcessWorkspaceFormSection
                isFirst
                title="1. Visão geral do processo"
                description="Dados principais para identificar o processo e sua situação atual."
              >
                <div className="grid gap-4 lg:grid-cols-2">
                  <Field id="professional-name" label="Nome do processo" value={officeProcess.name} onChange={() => undefined} />
                  <ProcessTypeSelect
                    id="professional-vc-tipo"
                    label="Tipo ou categoria"
                    options={tipoSelectOptions}
                    value={vcTipoLabel}
                    onChange={setVcTipoLabel}
                    placeholderOption="Não definido"
                  />
                  <Field id="professional-vc-macro" label="Área relacionada" value={vcMacro} onChange={setVcMacro} placeholder="Área ou macroprocesso relacionado." />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field id="professional-created-at" label="Data de criação" value={officeProcess.created_at ? formatDateTimePtBr(officeProcess.created_at, timeZone) : ""} onChange={() => undefined} />
                    <Field id="professional-updated-at" label="Última atualização" value={officeProcess.updated_at ? formatDateTimePtBr(officeProcess.updated_at, timeZone) : ""} onChange={() => undefined} />
                  </div>
                </div>
              </ProcessWorkspaceFormSection>

              <ProcessWorkspaceFormSection
                title="2. Como este processo funciona"
                description="Descreva como o processo acontece hoje e quais etapas são mais relevantes."
              >
                <div className="flex flex-wrap gap-2">
                  {renderAiButton("rewrite", "process_essential_rewrite", "Melhorar redação com IA", "Revisar redação", "Revise os textos sugeridos antes de aplicar aos campos.")}
                  {renderAiButton("complements", "process_essential_complements", "Sugerir complementos com IA", "Complementos sugeridos", "Revise os complementos e aplique somente o que fizer sentido.")}
                </div>
                <TextField id="professional-description" label="Descrição textual do processo" value={description} onChange={setDescription} rows={5} />
                <TextField id="professional-main-activities" label="Principais atividades ou etapas" value={draft.main_activities} onChange={(value) => updateDraft("main_activities", value)} />
                <TextField id="professional-how-it-works" label="Informações gerais sobre o funcionamento" value={draft.how_it_works} onChange={(value) => updateDraft("how_it_works", value)} />
              </ProcessWorkspaceFormSection>

              <ProcessWorkspaceFormSection
                title="3. Responsáveis e áreas envolvidas"
                description="Registre quem acompanha, executa ou participa do processo."
              >
                <div className="grid gap-4 lg:grid-cols-2">
                  <Field id="professional-responsible-area" label="Área responsável pelo processo" value={draft.responsible_area} onChange={(value) => updateDraft("responsible_area", value)} />
                  <div className="space-y-2">
                    <Label>Responsável principal</Label>
                    <Select value={ownerProfileId} onChange={(event) => setOwnerProfileId(event.target.value)}>
                      <option value="">Não definido</option>
                      {ownerOptions.map((owner) => (
                        <option key={owner.id} value={owner.id}>{owner.full_name}</option>
                      ))}
                    </Select>
                  </div>
                </div>
                <TextField id="professional-participants" label="Participantes ou áreas envolvidas" value={draft.participants} onChange={(value) => updateDraft("participants", value)} />
              </ProcessWorkspaceFormSection>

              <ProcessWorkspaceFormSection
                title="4. Objetivo do processo"
                description="Mantenha o objetivo separado da descrição geral."
              >
                <TextField id="professional-objective" label="Objetivo do processo" value={draft.objective} onChange={(value) => updateDraft("objective", value)} rows={3} />
              </ProcessWorkspaceFormSection>

              <ProcessWorkspaceFormSection
                title="5. Documentos e materiais de apoio"
                description="A seção de documentos fica logo abaixo do formulário e preserva todos os anexos já cadastrados."
              >
                <p className="text-sm text-muted-foreground">
                  Use o repositório de documentos no final da página para anexar arquivos, imagens,
                  PDFs, links ou materiais de apoio relacionados ao processo.
                </p>
              </ProcessWorkspaceFormSection>

              <ProcessWorkspaceFormSection
                title="6. Representação visual do processo"
                description="Anexe ou vincule o fluxograma do processo sem necessidade de modelagem avançada."
              >
                <div className="space-y-3">
                  {materialError ? <p className="text-sm text-destructive">{materialError}</p> : null}
                  {editedFlowchartFiles.length > 0 ? (
                    <div className="divide-y overflow-hidden rounded-lg border">
                      {editedFlowchartFiles.map((file, index) => {
                        const fileName = fileNameFromUrl(file.url);
                        return (
                          <div key={`${file.url}-${index}`} className="flex flex-wrap items-center gap-2 bg-background px-3 py-3">
                            <FileExtBadge name={fileName} />
                            <p className="min-w-0 flex-1 truncate text-sm font-medium" title={fileName}>{fileName}</p>
                            <a href={file.url} target="_blank" rel="noreferrer" className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "shrink-0")} title="Abrir arquivo">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                            <Button type="button" variant="ghost" size="icon" onClick={() => setEditedFlowchartFiles((prev) => prev.filter((_, itemIdx) => itemIdx !== index))} title="Remover">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <EmptyState icon={Workflow} title="Nenhum fluxograma cadastrado" description="Adicione um arquivo, imagem, PDF ou link visual do processo." />
                  )}
                  <input
                    ref={flowchartFileInputRef}
                    type="file"
                    className="hidden"
                    accept="*/*"
                    onChange={(event) => {
                      void handleFlowchartFileSelected(event.target.files);
                      event.target.value = "";
                    }}
                  />
                  <Button type="button" variant="outline" size="sm" disabled={materialUploading === "flowchart"} onClick={() => flowchartFileInputRef.current?.click()}>
                    {materialUploading === "flowchart" ? "Enviando..." : "Adicionar fluxograma"}
                  </Button>
                </div>
              </ProcessWorkspaceFormSection>

              <ProcessWorkspaceFormSection
                title="7. Informações complementares"
                description="Use este campo para observações gerais e informações antigas sem correspondência direta."
              >
                <TextField id="professional-general-observations" label="Observações gerais" value={draft.general_observations} onChange={(value) => updateDraft("general_observations", value)} rows={5} />
              </ProcessWorkspaceFormSection>

              <ProcessWorkspaceFormSection
                title="8. Situação atual do processo"
                description="Indique a situação operacional de acompanhamento do processo."
              >
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Situação</Label>
                    <Select value={status} onChange={(event) => setStatus(event.target.value as OfficeProcessStatus)}>
                      {PROCESS_SITUATION_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-3">
                    {vcLevelsDraft.map((value, index) => (
                      <div key={index} className="flex gap-2">
                        <Input value={value} onChange={(event) => setVcLevelsDraft((prev) => prev.map((item, itemIndex) => (itemIndex === index ? event.target.value : item)))} placeholder={`Nível ${index + 1}`} />
                        {index > 0 ? (
                          <Button type="button" variant="outline" onClick={() => setVcLevelsDraft((prev) => prev.filter((_, itemIndex) => itemIndex !== index))}>Remover</Button>
                        ) : null}
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => setVcLevelsDraft((prev) => [...prev, ""])}>Adicionar nível</Button>
                  </div>
                </div>
              </ProcessWorkspaceFormSection>
              {renderSaveFooter()}
                </div>
              </ProcessWorkspaceStageLayout>
            </TabsContent>

            <TabsContent value="levantamento" className="mt-0">
              <ProcessWorkspaceStageLayout
                moduleTitle={currentTabContent.title}
                moduleDescription={currentTabContent.description}
                stageObjective={currentTabContent.objective}
                contextHint={currentTabContent.hint}
                sidebar={workspaceSidebar}
                workPanelClassName="space-y-8"
              >
                <div className="space-y-6">
                  <Card className={WORKSPACE_SECTION_CARD_CLASS}>
                    <CardHeader className={WORKSPACE_SECTION_HEADER_CLASS}>
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className={WORKSPACE_SECTION_INTRO_CLASS}>
                          <CardTitle>Consolidação do levantamento</CardTitle>
                          <CardDescription>
                            Consolide as informações levantadas para formar uma visão clara sobre o
                            funcionamento atual do processo.
                          </CardDescription>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <LevantamentoIconButton
                            title="Consolidar informações com IA"
                            disabled={aiLoading !== null}
                            onClick={() => void openConsolidationSuggestions()}
                          >
                            {aiLoading === "consolidation" ? (
                              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                            ) : (
                              <Sparkles className="h-4 w-4" aria-hidden />
                            )}
                          </LevantamentoIconButton>
                          <LevantamentoIconButton
                            title="Identificar lacunas com IA"
                            disabled={aiLoading !== null}
                            onClick={() => void openGapSuggestions()}
                          >
                            {aiLoading === "gaps" ? (
                              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                            ) : (
                              <ScanSearch className="h-4 w-4" aria-hidden />
                            )}
                          </LevantamentoIconButton>
                          <LevantamentoIconButton
                            title={consolidationEditing ? "Bloquear edição" : "Editar manualmente"}
                            onClick={() => setConsolidationEditing((value) => !value)}
                          >
                            {consolidationEditing ? (
                              <Lock className="h-4 w-4" aria-hidden />
                            ) : (
                              <Pencil className="h-4 w-4" aria-hidden />
                            )}
                          </LevantamentoIconButton>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                title="Exportar consolidação"
                                aria-label="Exportar consolidação"
                                disabled={consolidationExporting}
                              >
                                {consolidationExporting ? (
                                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                                ) : (
                                  <Download className="h-4 w-4" aria-hidden />
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent align="end" className="w-48 p-2">
                              <div className="flex flex-col gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  className="justify-start"
                                  disabled={consolidationExporting}
                                  onClick={() => void exportConsolidationDocument("docx")}
                                >
                                  Exportar DOCX
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  className="justify-start"
                                  disabled={consolidationExporting}
                                  onClick={() => void exportConsolidationDocument("pdf")}
                                >
                                  Exportar PDF
                                </Button>
                              </div>
                            </PopoverContent>
                          </Popover>
                          <LevantamentoIconButton
                            title={saving ? "Salvando..." : "Salvar alterações"}
                            type="submit"
                            disabled={saving}
                          >
                            {saving ? (
                              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                            ) : (
                              <Save className="h-4 w-4" aria-hidden />
                            )}
                          </LevantamentoIconButton>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-5 bg-muted/10 p-6">
                      <div className="grid gap-5 lg:grid-cols-2">
                        {CONSOLIDATION_FIELDS.map((field) => (
                          <div
                            key={field.key}
                            className={
                              field.rows && field.rows > 4 ? "lg:col-span-2" : undefined
                            }
                          >
                            <ConsolidationField
                              id={`consolidation-${field.key}`}
                              label={field.label}
                              value={draft[field.key]}
                              rows={field.rows ?? 3}
                              readOnly={!consolidationEditing}
                              onChange={(value) => updateDraft(field.key, value)}
                            />
                          </div>
                        ))}
                      </div>
                      {!consolidationEditing ? (
                        <p className="rounded-lg border border-border/60 bg-background px-4 py-3 text-sm text-muted-foreground shadow-sm">
                          Os campos estão bloqueados para evitar alterações acidentais. Use o ícone
                          de lápis para editar manualmente.
                        </p>
                      ) : null}
                    </CardContent>
                  </Card>

                  <Card className={WORKSPACE_SECTION_CARD_CLASS}>
                    <CardHeader className={WORKSPACE_SECTION_HEADER_CLASS}>
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className={WORKSPACE_SECTION_INTRO_CLASS}>
                          <CardTitle>Roteiros de levantamento</CardTitle>
                          <CardDescription>
                            Modelo de perguntas reutilizável — edite aqui o roteiro, não preencha
                            respostas.
                          </CardDescription>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            disabled={aiLoading !== null}
                            title="Gerar roteiro com IA"
                            aria-label="Gerar roteiro com IA"
                            onClick={() => setAiGuidanceOpen(true)}
                          >
                            <Sparkles className="h-4 w-4" aria-hidden />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            title="Criar roteiro"
                            aria-label="Criar roteiro"
                            onClick={openCreateScript}
                          >
                            <Plus className="h-4 w-4" aria-hidden />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className={cn(WORKSPACE_SECTION_CONTENT_CLASS, "space-y-4")}>
                      {draft.survey_scripts.length === 0 ? (
                        <EmptyState
                          icon={ClipboardList}
                          title="Nenhum roteiro cadastrado"
                          description="Crie ou gere um roteiro para usar em entrevistas e levantamentos."
                        />
                      ) : (
                        <div className="space-y-3">
                          {draft.survey_scripts.map((script) => {
                            const updatedAt = script.updated_at
                              ? formatDateTimePtBr(script.updated_at, timeZone)
                              : "-";
                            const questionCount = countScriptQuestions(script);
                            return (
                            <div
                              key={script.id}
                              className="flex w-full flex-col gap-3 rounded-xl border border-border/70 bg-background p-4 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="truncate text-sm font-semibold">
                                    {script.name || "Roteiro sem nome"}
                                  </h4>
                                  <Badge variant="outline">
                                    {formatScriptStatusLabel(script.status)}
                                  </Badge>
                                </div>
                                <p className="mt-1 text-sm text-muted-foreground">
                                  {questionCount} pergunta(s) · Atualizado em {updatedAt}
                                </p>
                              </div>
                              <div className="flex shrink-0 flex-wrap gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  title="Visualizar roteiro"
                                  aria-label="Visualizar roteiro"
                                  onClick={() => setScriptEditor({ mode: "view", script })}
                                >
                                  <Eye className="h-4 w-4" aria-hidden />
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  title="Editar roteiro"
                                  aria-label="Editar roteiro"
                                  onClick={() =>
                                    setScriptEditor({
                                      mode: "edit",
                                      script,
                                      sourceScriptId: script.id,
                                    })
                                  }
                                >
                                  <Pencil className="h-4 w-4" aria-hidden />
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  title="Usar em nova entrevista"
                                  aria-label="Usar em nova entrevista"
                                  disabled={saving}
                                  onClick={() => void createInterviewFromScript(script)}
                                >
                                  <UserPlus className="h-4 w-4" aria-hidden />
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  title="Exportar roteiro"
                                  aria-label="Exportar roteiro"
                                  onClick={() => void exportScriptDocx(script)}
                                >
                                  <Download className="h-4 w-4" aria-hidden />
                                </Button>
                              </div>
                            </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className={WORKSPACE_SECTION_CARD_CLASS}>
                    <CardHeader className={WORKSPACE_SECTION_HEADER_CLASS}>
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className={WORKSPACE_SECTION_INTRO_CLASS}>
                          <CardTitle>Entrevistas e levantamentos realizados</CardTitle>
                          <CardDescription>
                            Coletas realizadas — cada registro tem suas próprias respostas, anexos e
                            metadados.
                          </CardDescription>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {renderAiButton(
                            "organize",
                            "process_professional_organize_notes",
                            "Organizar anotações com IA",
                            "Anotações organizadas",
                            "Revise a estrutura antes de aplicar ao levantamento.",
                            true
                          )}
                          <Popover open={addRecordPopoverOpen} onOpenChange={setAddRecordPopoverOpen}>
                            <PopoverTrigger>
                              <LevantamentoIconButton title="Adicionar registro">
                                <Plus className="h-4 w-4" aria-hidden />
                              </LevantamentoIconButton>
                            </PopoverTrigger>
                            <PopoverContent className="p-1" align="end">
                              <button
                                type="button"
                                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
                                onClick={() => {
                                  setAddRecordPopoverOpen(false);
                                  setInterviewAddOpen(true);
                                }}
                              >
                                <UserPlus className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                                Adicionar entrevista
                              </button>
                              <button
                                type="button"
                                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
                                onClick={() => {
                                  setAddRecordPopoverOpen(false);
                                  addRecord();
                                }}
                              >
                                <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                                Registrar coleta externa
                              </button>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className={cn(WORKSPACE_SECTION_CONTENT_CLASS, "space-y-4")}>
                      {draft.records.length === 0 ? (
                        <EmptyState
                          icon={FileText}
                          title="Nenhum levantamento registrado"
                          description="Adicione entrevistas, reuniões, workshops, análises documentais ou observações."
                        />
                      ) : (
                        draft.records.map((record, index) => {
                          const script = draft.survey_scripts.find(
                            (item) => item.id === (record.script_id || record.linked_questionnaire_id)
                          );
                          const isExternal = getRecordCollectionOrigin(record) === "external";
                          const displayDate = record.date?.trim()
                            ? record.date
                            : record.updated_at
                              ? formatDateTimePtBr(record.updated_at, timeZone)
                              : "-";
                          const participantsLine = [
                            record.participants ?? record.people_involved,
                            record.areas_involved,
                          ]
                            .map((value) => value?.trim())
                            .filter(Boolean)
                            .join(" · ");
                          const scriptLine = isExternal
                            ? "Coleta externa"
                            : script
                              ? `Roteiro: ${script.name}`
                              : "Sem roteiro";
                          const attachmentLine = recordAttachmentSummary(record);
                          return (
                            <div
                              key={record.id}
                              className="flex w-full flex-col gap-3 rounded-xl border border-border/70 bg-background p-4 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="truncate text-sm font-semibold">
                                    {record.title || `Entrevista ${index + 1}`}
                                  </h4>
                                  <Badge variant={isExternal ? "outline" : "secondary"}>
                                    {formatRecordStatusLabel(record.status)}
                                  </Badge>
                                </div>
                                <p className="mt-1 text-sm text-muted-foreground">
                                  Data: {displayDate}
                                </p>
                                {participantsLine ? (
                                  <p className="mt-1 truncate text-xs text-muted-foreground">
                                    {participantsLine}
                                  </p>
                                ) : null}
                                <p className="mt-1 text-xs text-muted-foreground">{scriptLine}</p>
                                {attachmentLine ? (
                                  <p className="mt-1 text-xs text-muted-foreground">{attachmentLine}</p>
                                ) : null}
                              </div>
                              <div className="flex shrink-0 flex-wrap gap-2">
                                {!isExternal && record.id ? (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    title="Visualizar respostas"
                                    aria-label="Visualizar respostas"
                                    onClick={() =>
                                      openInterviewFillPage(record.id!, { readOnly: true })
                                    }
                                  >
                                    <Eye className="h-4 w-4" aria-hidden />
                                  </Button>
                                ) : null}
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  title={isExternal ? "Editar coleta externa" : "Editar entrevista"}
                                  aria-label={isExternal ? "Editar coleta externa" : "Editar entrevista"}
                                  onClick={() => {
                                    if (isExternal) {
                                      openInterviewEditor(record, script ?? null, {
                                        initialSection: "metadata",
                                      });
                                    } else if (record.id) {
                                      openInterviewFillPage(record.id);
                                    }
                                  }}
                                >
                                  <Pencil className="h-4 w-4" aria-hidden />
                                </Button>
                                {isExternal ? (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    title="Anexar transcrição ou ata"
                                    aria-label="Anexar transcrição ou ata"
                                    onClick={() =>
                                      openInterviewEditor(record, script ?? null, {
                                        initialSection: "attachments",
                                      })
                                    }
                                  >
                                    <Paperclip className="h-4 w-4" aria-hidden />
                                  </Button>
                                ) : null}
                                <LevantamentoIconButton
                                  title={
                                    record.use_in_consolidation
                                      ? "Remover da consolidação"
                                      : "Consolidar este levantamento"
                                  }
                                  variant={record.use_in_consolidation ? "default" : "outline"}
                                  onClick={() =>
                                    updateRecord(index, {
                                      use_in_consolidation: !record.use_in_consolidation,
                                    })
                                  }
                                >
                                  <Pin className="h-4 w-4" aria-hidden />
                                </LevantamentoIconButton>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  title="Remover entrevista"
                                  aria-label="Remover entrevista"
                                  onClick={() =>
                                    updateDraft(
                                      "records",
                                      draft.records.filter((_, itemIndex) => itemIndex !== index)
                                    )
                                  }
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" aria-hidden />
                                </Button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </CardContent>
                  </Card>
                  {renderProcessDocumentsSection()}
                  {renderSaveFooter()}
                </div>
              </ProcessWorkspaceStageLayout>
            </TabsContent>

            <TabsContent value="diagnostico" className="mt-0">
              <ProcessWorkspaceStageLayout
                moduleTitle={currentTabContent.title}
                moduleDescription={currentTabContent.description}
                stageObjective={currentTabContent.objective}
                contextHint={currentTabContent.hint}
                sidebar={workspaceSidebar}
                workPanelClassName="space-y-8"
              >
                <div className="space-y-0">

              <ProcessWorkspaceFormSection
                title="12. Problemas identificados"
                description="Registre os problemas e pontos de atenção identificados no processo, facilitando a análise e a definição de ações de melhoria."
              >
                <div>{renderAiButton("problems", "process_professional_identify_problems", "Identificar problemas com IA", "Problemas sugeridos", "Revise cada problema antes de adicionar ao cadastro.")}</div>
                {draft.problems.map((problem, index) => (
                  <div key={problem.id} className="space-y-4 rounded-xl border border-border/70 p-4">
                    <div className="flex justify-between gap-3">
                      <h4 className="text-sm font-semibold">Problema {index + 1}</h4>
                      <Button type="button" variant="ghost" size="sm" onClick={() => updateDraft("problems", draft.problems.filter((_, itemIndex) => itemIndex !== index))}>Remover</Button>
                    </div>
                    <TextField id={`problem-description-${problem.id}`} label="Descrição do problema" value={problem.description ?? ""} onChange={(value) => updateDraft("problems", draft.problems.map((item, itemIndex) => itemIndex === index ? { ...item, description: value } : item))} />
                    <div className="grid gap-4 lg:grid-cols-2">
                      <Field id={`problem-step-${problem.id}`} label="Etapa em que ocorre" value={problem.process_step ?? ""} onChange={(value) => updateDraft("problems", draft.problems.map((item, itemIndex) => itemIndex === index ? { ...item, process_step: value } : item))} />
                      <Field id={`problem-owner-${problem.id}`} label="Área ou responsável relacionado" value={problem.related_area_or_owner ?? ""} onChange={(value) => updateDraft("problems", draft.problems.map((item, itemIndex) => itemIndex === index ? { ...item, related_area_or_owner: value } : item))} />
                      <Field id={`problem-frequency-${problem.id}`} label="Frequência percebida" value={problem.perceived_frequency ?? ""} onChange={(value) => updateDraft("problems", draft.problems.map((item, itemIndex) => itemIndex === index ? { ...item, perceived_frequency: value } : item))} />
                      <Field id={`problem-impact-${problem.id}`} label="Impacto percebido" value={problem.perceived_impact ?? ""} onChange={(value) => updateDraft("problems", draft.problems.map((item, itemIndex) => itemIndex === index ? { ...item, perceived_impact: value } : item))} />
                    </div>
                    <TextField id={`problem-evidence-${problem.id}`} label="Evidência ou comentário complementar" value={problem.evidence_or_comment ?? ""} onChange={(value) => updateDraft("problems", draft.problems.map((item, itemIndex) => itemIndex === index ? { ...item, evidence_or_comment: value } : item))} />
                    <div className="space-y-2">
                      <Label>Status do problema</Label>
                      <Select value={problem.status ?? "identified"} onChange={(event) => updateDraft("problems", draft.problems.map((item, itemIndex) => itemIndex === index ? { ...item, status: event.target.value as OfficeProcessProfessionalProblemStatus } : item))}>
                        {PROBLEM_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </Select>
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => updateDraft("problems", [...draft.problems, { id: createId(), description: "", status: "identified" }])}>
                  <Plus className="mr-1.5 h-4 w-4" />Adicionar problema
                </Button>
              </ProcessWorkspaceFormSection>

              <ProcessWorkspaceFormSection
                title="13. Oportunidades de melhoria"
                description="Organize as oportunidades de melhoria percebidas no processo e registre os benefícios esperados para a operação."
              >
                <div>{renderAiButton("opportunities", "process_professional_suggest_improvements", "Sugerir oportunidades com IA", "Oportunidades sugeridas", "Revise as oportunidades antes de adicionar ao cadastro.")}</div>
                {draft.opportunities.map((opportunity, index) => (
                  <div key={opportunity.id} className="space-y-4 rounded-xl border border-border/70 p-4">
                    <div className="flex justify-between gap-3">
                      <h4 className="text-sm font-semibold">Oportunidade {index + 1}</h4>
                      <Button type="button" variant="ghost" size="sm" onClick={() => updateDraft("opportunities", draft.opportunities.filter((_, itemIndex) => itemIndex !== index))}>Remover</Button>
                    </div>
                    <TextField id={`opportunity-description-${opportunity.id}`} label="Descrição da oportunidade" value={opportunity.description ?? ""} onChange={(value) => updateDraft("opportunities", draft.opportunities.map((item, itemIndex) => itemIndex === index ? { ...item, description: value } : item))} />
                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Problema relacionado</Label>
                        <Select value={opportunity.related_problem_id ?? ""} onChange={(event) => updateDraft("opportunities", draft.opportunities.map((item, itemIndex) => itemIndex === index ? { ...item, related_problem_id: event.target.value } : item))}>
                          <option value="">Sem vínculo direto</option>
                          {draft.problems.map((problem) => <option key={problem.id} value={problem.id}>{problem.description || "Problema sem descrição"}</option>)}
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Tipo de melhoria</Label>
                        <Select value={opportunity.improvement_type ?? ""} onChange={(event) => updateDraft("opportunities", draft.opportunities.map((item, itemIndex) => itemIndex === index ? { ...item, improvement_type: event.target.value } : item))}>
                          <option value="">Não definido</option>
                          {IMPROVEMENT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                        </Select>
                      </div>
                    </div>
                    <TextField id={`opportunity-benefit-${opportunity.id}`} label="Benefício esperado" value={opportunity.expected_benefit ?? ""} onChange={(value) => updateDraft("opportunities", draft.opportunities.map((item, itemIndex) => itemIndex === index ? { ...item, expected_benefit: value } : item))} />
                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Complexidade estimada</Label>
                        <Select value={opportunity.estimated_complexity ?? "medium"} onChange={(event) => updateDraft("opportunities", draft.opportunities.map((item, itemIndex) => itemIndex === index ? { ...item, estimated_complexity: event.target.value as "low" | "medium" | "high" } : item))}>
                          {SIMPLE_LEVEL_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Prioridade simples</Label>
                        <Select value={opportunity.priority ?? "medium"} onChange={(event) => updateDraft("opportunities", draft.opportunities.map((item, itemIndex) => itemIndex === index ? { ...item, priority: event.target.value as "low" | "medium" | "high" } : item))}>
                          {SIMPLE_LEVEL_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </Select>
                      </div>
                    </div>
                    <TextField id={`opportunity-notes-${opportunity.id}`} label="Observações complementares" value={opportunity.complementary_notes ?? ""} onChange={(value) => updateDraft("opportunities", draft.opportunities.map((item, itemIndex) => itemIndex === index ? { ...item, complementary_notes: value } : item))} />
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => updateDraft("opportunities", [...draft.opportunities, { id: createId(), description: "", estimated_complexity: "medium", priority: "medium" }])}>
                  <Plus className="mr-1.5 h-4 w-4" />Adicionar oportunidade
                </Button>
              </ProcessWorkspaceFormSection>
              {renderSaveFooter()}
                </div>
              </ProcessWorkspaceStageLayout>
            </TabsContent>

            <TabsContent value="melhorias" className="mt-0">
              <ProcessWorkspaceStageLayout
                moduleTitle={currentTabContent.title}
                moduleDescription={currentTabContent.description}
                stageObjective={currentTabContent.objective}
                contextHint={currentTabContent.hint}
                sidebar={workspaceSidebar}
                workPanelClassName="space-y-8"
              >
                <div className="space-y-0">

              <ProcessWorkspaceFormSection
                title="14. Plano de ação simples"
                description="Defina ações simples para tratar problemas, organizar melhorias e acompanhar o avanço das iniciativas relacionadas ao processo."
              >
                <div>{renderAiButton("actions", "process_professional_suggest_actions", "Sugerir ações simples com IA", "Ações sugeridas", "Revise as ações antes de adicionar ao plano.")}</div>
                {draft.actions.map((action, index) => (
                  <div key={action.id} className="space-y-4 rounded-xl border border-border/70 p-4">
                    <div className="flex justify-between gap-3">
                      <h4 className="text-sm font-semibold">Ação {index + 1}</h4>
                      <Button type="button" variant="ghost" size="sm" onClick={() => updateDraft("actions", draft.actions.filter((_, itemIndex) => itemIndex !== index))}>Remover</Button>
                    </div>
                    <TextField id={`action-title-${action.id}`} label="Ação" value={action.action ?? ""} onChange={(value) => updateDraft("actions", draft.actions.map((item, itemIndex) => itemIndex === index ? { ...item, action: value } : item))} rows={3} />
                    <div className="grid gap-4 lg:grid-cols-2">
                      <Field id={`action-related-${action.id}`} label="Problema ou oportunidade relacionada" value={action.related_item ?? ""} onChange={(value) => updateDraft("actions", draft.actions.map((item, itemIndex) => itemIndex === index ? { ...item, related_item: value } : item))} />
                      <Field id={`action-responsible-${action.id}`} label="Responsável" value={action.responsible ?? ""} onChange={(value) => updateDraft("actions", draft.actions.map((item, itemIndex) => itemIndex === index ? { ...item, responsible: value } : item))} />
                      <Field id={`action-deadline-${action.id}`} type="date" label="Prazo" value={action.deadline ?? ""} onChange={(value) => updateDraft("actions", draft.actions.map((item, itemIndex) => itemIndex === index ? { ...item, deadline: value } : item))} />
                      <div className="space-y-2">
                        <Label>Status da ação</Label>
                        <Select value={action.status ?? "not_started"} onChange={(event) => updateDraft("actions", draft.actions.map((item, itemIndex) => itemIndex === index ? { ...item, status: event.target.value as OfficeProcessProfessionalActionStatus } : item))}>
                          {ACTION_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </Select>
                      </div>
                    </div>
                    <TextField id={`action-notes-${action.id}`} label="Observações" value={action.notes ?? ""} onChange={(value) => updateDraft("actions", draft.actions.map((item, itemIndex) => itemIndex === index ? { ...item, notes: value } : item))} />
                    <TextField id={`action-evidence-${action.id}`} label="Evidência de conclusão" value={action.completion_evidence ?? ""} onChange={(value) => updateDraft("actions", draft.actions.map((item, itemIndex) => itemIndex === index ? { ...item, completion_evidence: value } : item))} />
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => updateDraft("actions", [...draft.actions, { id: createId(), action: "", status: "not_started" }])}>
                  <Plus className="mr-1.5 h-4 w-4" />Adicionar ação
                </Button>
              </ProcessWorkspaceFormSection>
              {renderSaveFooter()}
                </div>
              </ProcessWorkspaceStageLayout>
            </TabsContent>

            <TabsContent value="acompanhamento" className="mt-0">
              <ProcessWorkspaceStageLayout
                moduleTitle={currentTabContent.title}
                moduleDescription={currentTabContent.description}
                stageObjective={currentTabContent.objective}
                contextHint={currentTabContent.hint}
                sidebar={workspaceSidebar}
                workPanelClassName="space-y-8"
              >
                <div className="space-y-0">

              <ProcessWorkspaceFormSection
                title="15. Acompanhamento de status"
                description="Acompanhe o andamento das ações e mantenha visibilidade sobre os principais pontos em evolução no processo."
              >
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <StatCard label="Problemas identificados" value={draft.problems.length} />
                  <StatCard label="Oportunidades de melhoria" value={draft.opportunities.length} />
                  <StatCard label="Ações não iniciadas" value={actionStats.notStarted} />
                  <StatCard label="Ações em andamento" value={actionStats.inProgress} />
                  <StatCard label="Ações concluídas" value={actionStats.completed} />
                  <StatCard label="Ações atrasadas" value={actionStats.overdue} />
                  <StatCard label="Última atualização" value={officeProcess.updated_at ? formatDateTimePtBr(officeProcess.updated_at, timeZone) : "-"} />
                </div>
                <div className="flex flex-wrap gap-2">
                  {renderAiButton("summary", "process_professional_status_summary", "Gerar resumo de status com IA", "Resumo de status sugerido", "Revise o resumo antes de aplicar ao acompanhamento.")}
                </div>
                <TextField id="professional-status-summary" label="Resumo simples do andamento" value={draft.status_summary} onChange={(value) => updateDraft("status_summary", value)} rows={4} />
              </ProcessWorkspaceFormSection>
              {renderSaveFooter()}
                </div>
              </ProcessWorkspaceStageLayout>
            </TabsContent>
          </Tabs>
        </form>
      </div>

      <Dialog
        open={scriptChoiceOpen}
        onOpenChange={setScriptChoiceOpen}
        containerClassName={LEVANTAMENTO_MODAL_COMPACT}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar roteiro</DialogTitle>
            <DialogDescription>
              Já existe ao menos um roteiro para este processo. Escolha como deseja continuar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Button
              type="button"
              className="w-full justify-start"
              variant="outline"
              onClick={() => {
                const firstScript = draft.survey_scripts[0];
                if (!firstScript) return;
                setScriptChoiceOpen(false);
                setScriptEditor({ mode: "edit", script: firstScript, sourceScriptId: firstScript.id });
              }}
            >
              Editar roteiro existente
            </Button>
            <Button
              type="button"
              className="w-full justify-start"
              variant="outline"
              onClick={() => {
                const firstScript = draft.survey_scripts[0];
                if (!firstScript) return;
                setScriptChoiceOpen(false);
                setScriptEditor({ mode: "create", script: duplicateScript(firstScript) });
              }}
            >
              Criar nova versão do roteiro
            </Button>
            <Button
              type="button"
              className="w-full justify-start"
              variant="outline"
              onClick={() => {
                setScriptChoiceOpen(false);
                setScriptEditor({ mode: "create", script: emptyScript(officeProcess.name) });
              }}
            >
              Criar novo roteiro
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(scriptEditor)}
        onOpenChange={(open) => !open && closeScriptEditor()}
        containerClassName={LEVANTAMENTO_MODAL_WIDE}
      >
        <DialogContent className={LEVANTAMENTO_MODAL_SHELL}>
          <div className={LEVANTAMENTO_MODAL_HEADER}>
            <DialogHeader className="mb-0">
              <DialogTitle>
                {scriptEditor?.mode === "view"
                  ? "Visualizar roteiro"
                  : scriptEditor?.mode === "ai"
                    ? "Revisar roteiro sugerido"
                    : "Editar roteiro"}
              </DialogTitle>
              <DialogDescription>
                Modelo de perguntas reutilizável. Para preencher respostas, use &quot;Usar em nova
                entrevista&quot; no card do roteiro.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className={LEVANTAMENTO_MODAL_BODY}>
          {scriptEditor ? (
            <div className="space-y-6">
              <div className="grid gap-4 lg:grid-cols-2">
                <Field
                  id="script-name"
                  label="Nome do roteiro"
                  value={scriptEditor.script.name ?? ""}
                  readOnly={scriptEditor.mode === "view"}
                  onChange={(value) =>
                    updateScriptEditorScript((script) => ({ ...script, name: value }))
                  }
                />
                <div className="space-y-2">
                  <Label>Status do roteiro</Label>
                  <Select
                    value={scriptEditor.script.status ?? "draft"}
                    disabled={scriptEditor.mode === "view"}
                    onChange={(event) =>
                      updateScriptEditorScript((script) => ({
                        ...script,
                        status: event.target.value as OfficeProcessProfessionalScriptStatus,
                      }))
                    }
                  >
                    {SCRIPT_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              <TextField
                id="script-description"
                label="Descrição opcional"
                value={scriptEditor.script.description ?? ""}
                readOnly={scriptEditor.mode === "view"}
                rows={3}
                onChange={(value) =>
                  updateScriptEditorScript((script) => ({ ...script, description: value }))
                }
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">
                  {countScriptQuestions(scriptEditor.script)} pergunta(s) em{" "}
                  {(scriptEditor.script.blocks ?? []).length} bloco(s)
                </p>
                {scriptEditor.mode !== "view" ? (
                  <Button type="button" variant="outline" size="sm" onClick={addScriptBlock}>
                    <Plus className="mr-1.5 h-4 w-4" />
                    Adicionar bloco
                  </Button>
                ) : null}
              </div>
              <div className="space-y-5">
                {sortByOrder(scriptEditor.script.blocks ?? []).map((block) => (
                  <div key={block.id} className="space-y-4 rounded-xl border border-border/70 p-5">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <Field
                        id={`block-${block.id}`}
                        label="Bloco temático"
                        value={block.title ?? ""}
                        readOnly={scriptEditor.mode === "view"}
                        onChange={(value) => updateScriptBlock(block.id, { title: value })}
                      />
                      {scriptEditor.mode !== "view" ? (
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addScriptQuestion(block.id)}
                          >
                            Adicionar pergunta
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              updateScriptEditorScript((script) => ({
                                ...script,
                                blocks: (script.blocks ?? []).filter((item) => item.id !== block.id),
                              }))
                            }
                          >
                            Remover bloco
                          </Button>
                        </div>
                      ) : null}
                    </div>
                    <div className="space-y-3">
                      {sortByOrder(block.questions ?? []).length === 0 ? (
                        <p className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">
                          Nenhuma pergunta neste bloco.
                        </p>
                      ) : (
                        sortByOrder(block.questions ?? []).map((question, questionIndex) => (
                          <div key={question.id} className="space-y-2 rounded-lg border bg-background p-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline">Pergunta {questionIndex + 1}</Badge>
                              {scriptEditor.mode !== "view" ? (
                                <>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => moveScriptQuestion(block.id, questionIndex, -1)}
                                  >
                                    Subir
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => moveScriptQuestion(block.id, questionIndex, 1)}
                                  >
                                    Descer
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => duplicateScriptQuestion(block.id, question)}
                                  >
                                    Duplicar
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeScriptQuestion(block.id, question.id)}
                                  >
                                    Remover
                                  </Button>
                                </>
                              ) : null}
                            </div>
                            <TextField
                              id={`script-question-${question.id}`}
                              label="Pergunta"
                              value={question.question ?? ""}
                              readOnly={scriptEditor.mode === "view"}
                              rows={2}
                              onChange={(value) =>
                                updateScriptQuestion(block.id, question.id, { question: value })
                              }
                            />
                            {scriptEditor.mode !== "view" ? (
                              <div className="space-y-2">
                                <Label>Associar a outro bloco</Label>
                                <Select
                                  value={block.id ?? ""}
                                  onChange={(event) =>
                                    moveQuestionToBlock(block.id, question, event.target.value)
                                  }
                                >
                                  {sortByOrder(scriptEditor.script.blocks ?? []).map((targetBlock) => (
                                    <option key={targetBlock.id} value={targetBlock.id}>
                                      {targetBlock.title || "Bloco sem título"}
                                    </option>
                                  ))}
                                </Select>
                              </div>
                            ) : null}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          </div>
          <DialogFooter className={cn(LEVANTAMENTO_MODAL_FOOTER, "flex-wrap")}>
            <Button type="button" variant="outline" onClick={closeScriptEditor}>
              {scriptEditor?.mode === "view" ? "Fechar" : "Descartar"}
            </Button>
            {scriptEditor?.mode !== "view" && scriptEditor ? (
              <Button
                type="button"
                onClick={() => saveScript(scriptEditor.script, scriptEditor.sourceScriptId)}
              >
                {scriptEditor.mode === "ai" ? "Aceitar roteiro" : "Salvar roteiro"}
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(interviewEditor)}
        onOpenChange={(open) => {
          if (!open) {
            setInterviewEditor(null);
            setInterviewAttachmentError(null);
            setInterviewAttachmentUploading(false);
            setInterviewNewLinkUrl("");
            setInterviewNewLinkType("Link");
          }
        }}
        containerClassName={LEVANTAMENTO_MODAL_WIDE}
      >
        <DialogContent className={LEVANTAMENTO_MODAL_SHELL}>
          <div className={LEVANTAMENTO_MODAL_HEADER}>
            <DialogHeader className="mb-0">
              <DialogTitle>
                {interviewEditor &&
                getRecordCollectionOrigin(interviewEditor.record) === "external"
                  ? "Registrar coleta externa"
                  : "Entrevista no sistema"}
              </DialogTitle>
              <DialogDescription>
                {interviewEditor &&
                getRecordCollectionOrigin(interviewEditor.record) === "external"
                  ? "Anexe transcrição, ata, áudio ou link da entrevista realizada fora do sistema."
                  : "Respostas vinculadas ao roteiro. As respostas pertencem a esta entrevista, mesmo quando o roteiro for reutilizado."}
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className={LEVANTAMENTO_MODAL_BODY}>
          {interviewEditor ? (() => {
            const isExternal =
              getRecordCollectionOrigin(interviewEditor.record) === "external";
            const readOnlyResponses = interviewEditor.readOnlyResponses ?? false;

            const metadataSection = (
              <div id="interview-metadata" className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold">Identificação da coleta</h4>
                  {!isExternal ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Metadados do registro preenchido no sistema.
                    </p>
                  ) : null}
                </div>
                <div className="grid gap-4 lg:grid-cols-3">
                  <Field
                    id="interview-title"
                    label="Título do registro"
                    value={interviewEditor.record.title ?? ""}
                    onChange={(value) =>
                      setInterviewEditor((prev) =>
                        prev ? { ...prev, record: { ...prev.record, title: value } } : prev
                      )
                    }
                  />
                  <Field
                    id="interview-date"
                    type="date"
                    label="Data da entrevista"
                    value={interviewEditor.record.date ?? ""}
                    onChange={(value) =>
                      setInterviewEditor((prev) =>
                        prev ? { ...prev, record: { ...prev.record, date: value } } : prev
                      )
                    }
                  />
                  <div className="space-y-2">
                    <Label>Tipo de levantamento</Label>
                    <Select
                      value={interviewEditor.record.type ?? "interview"}
                      onChange={(event) =>
                        setInterviewEditor((prev) =>
                          prev
                            ? {
                                ...prev,
                                record: {
                                  ...prev.record,
                                  type: event.target.value as OfficeProcessProfessionalRecordType,
                                },
                              }
                            : prev
                        )
                      }
                    >
                      {RECORD_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  <Field
                    id="interview-participants"
                    label="Entrevistado(s) ou participantes"
                    value={
                      interviewEditor.record.participants ??
                      interviewEditor.record.people_involved ??
                      ""
                    }
                    onChange={(value) =>
                      setInterviewEditor((prev) =>
                        prev
                          ? {
                              ...prev,
                              record: {
                                ...prev.record,
                                participants: value,
                                people_involved: value,
                              },
                            }
                          : prev
                      )
                    }
                  />
                  <Field
                    id="interview-areas"
                    label="Área(s) envolvida(s)"
                    value={interviewEditor.record.areas_involved ?? ""}
                    onChange={(value) =>
                      setInterviewEditor((prev) =>
                        prev ? { ...prev, record: { ...prev.record, areas_involved: value } } : prev
                      )
                    }
                  />
                  <Field
                    id="interview-responsible"
                    label="Responsável pelo registro"
                    value={interviewEditor.record.responsible ?? ""}
                    onChange={(value) =>
                      setInterviewEditor((prev) =>
                        prev ? { ...prev, record: { ...prev.record, responsible: value } } : prev
                      )
                    }
                  />
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={interviewEditor.record.status ?? "draft"}
                      onChange={(event) =>
                        setInterviewEditor((prev) =>
                          prev
                            ? {
                                ...prev,
                                record: {
                                  ...prev.record,
                                  status: event.target.value as OfficeProcessProfessionalRecordStatus,
                                },
                              }
                            : prev
                        )
                      }
                    >
                      {RECORD_STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
              </div>
            );

            const attachmentsSection = (prominent: boolean) => (
              <div
                id="interview-attachments"
                className={cn(
                  "space-y-4 rounded-xl border p-5",
                  prominent
                    ? "border-primary/30 bg-primary/5"
                    : "border-border/70 bg-muted/20"
                )}
              >
                <div>
                  <h4 className="text-sm font-semibold">
                    {prominent ? "Material da coleta externa" : "Anexos complementares"}
                  </h4>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {prominent
                      ? "Use quando a entrevista foi feita fora do sistema."
                      : "Anexos opcionais vinculados a este registro."}
                  </p>
                </div>
                {getRecordAttachments(interviewEditor.record).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum anexo vinculado.</p>
                ) : (
                  <div className="space-y-2">
                    {getRecordAttachments(interviewEditor.record).map((attachment) => {
                      const attachmentName =
                        attachment.name?.trim() ||
                        fileNameFromUrl(attachment.url ?? "") ||
                        "Anexo sem nome";
                      return (
                        <div
                          key={attachment.id}
                          className="flex flex-wrap items-center gap-2 rounded-lg border border-border/70 bg-background px-3 py-3"
                        >
                          <FileExtBadge name={attachmentName} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium" title={attachmentName}>
                              {attachmentName}
                            </p>
                            {attachment.type ? (
                              <p className="text-xs text-muted-foreground">{attachment.type}</p>
                            ) : null}
                          </div>
                          {attachment.url ? (
                            <a
                              href={attachment.url}
                              target="_blank"
                              rel="noreferrer"
                              className={cn(
                                buttonVariants({ variant: "ghost", size: "icon" }),
                                "shrink-0"
                              )}
                              title="Abrir anexo"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          ) : null}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeInterviewAttachment(attachment.id)}
                            title="Remover anexo"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
                <input
                  ref={interviewAttachmentInputRef}
                  type="file"
                  className="hidden"
                  accept="*/*"
                  onChange={(event) => {
                    void uploadInterviewAttachment(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={interviewAttachmentUploading}
                    onClick={() => interviewAttachmentInputRef.current?.click()}
                  >
                    {interviewAttachmentUploading ? "Enviando arquivo..." : "Selecionar arquivo"}
                  </Button>
                </div>
                <div className="grid gap-4 lg:grid-cols-[1fr_auto_auto] lg:items-end">
                  <Field
                    id="interview-link-url"
                    label="Link relacionado"
                    value={interviewNewLinkUrl}
                    onChange={setInterviewNewLinkUrl}
                    placeholder="https://..."
                  />
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select
                      value={interviewNewLinkType}
                      onChange={(event) => setInterviewNewLinkType(event.target.value)}
                    >
                      {RECORD_ATTACHMENT_TYPE_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <Button type="button" variant="outline" onClick={addInterviewLinkAttachment}>
                    Adicionar link
                  </Button>
                </div>
                {interviewAttachmentError ? (
                  <p className="text-sm text-destructive">{interviewAttachmentError}</p>
                ) : null}
              </div>
            );

            const responsesSection = (prominent: boolean) =>
              interviewEditor.script ? (
                <div
                  id="interview-responses"
                  className={cn(
                    "space-y-5",
                    prominent ? "rounded-xl border border-primary/30 bg-primary/5 p-5" : ""
                  )}
                >
                  <div
                    className={cn(
                      "rounded-xl border border-border/70 bg-muted/20 p-4",
                      prominent ? "border-primary/20 bg-background/80" : ""
                    )}
                  >
                    <p className="text-sm font-semibold">
                      Roteiro utilizado: {interviewEditor.script.name}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Progresso:{" "}
                      {(interviewEditor.record.answers ?? []).filter((answer) =>
                        answer.answer?.trim()
                      ).length}
                      /{countScriptQuestions(interviewEditor.script)} respostas preenchidas
                    </p>
                  </div>
                  {sortByOrder(interviewEditor.script.blocks ?? []).map((block) => (
                    <details
                      key={block.id}
                      open
                      className="rounded-xl border border-border/70 bg-background p-5"
                    >
                      <summary className="cursor-pointer text-sm font-semibold">
                        {block.title || "Bloco sem título"}
                      </summary>
                      <div className="mt-5 space-y-5">
                        {sortByOrder(block.questions ?? []).map((question, index) => {
                          const answer =
                            (interviewEditor.record.answers ?? []).find(
                              (item) => item.question_id === question.id
                            )?.answer ?? "";
                          return (
                            <div
                              key={question.id}
                              className="space-y-3 rounded-lg border border-border/60 bg-card p-4"
                            >
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                  Pergunta {index + 1}
                                </p>
                                <p className="mt-2 text-sm leading-relaxed">
                                  {question.question || "Pergunta sem texto"}
                                </p>
                              </div>
                              {readOnlyResponses ? (
                                <p className="whitespace-pre-wrap rounded-md bg-muted/30 p-3 text-sm text-muted-foreground">
                                  {answer.trim() || "Sem resposta"}
                                </p>
                              ) : (
                                <TextField
                                  id={`interview-answer-${question.id}`}
                                  label="Resposta"
                                  value={answer}
                                  rows={4}
                                  onChange={(value) =>
                                    setInterviewEditor((prev) =>
                                      prev
                                        ? {
                                            ...prev,
                                            record: updateInterviewAnswer(
                                              question.id,
                                              value,
                                              prev.record
                                            ),
                                          }
                                        : prev
                                    )
                                  }
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </details>
                  ))}
                </div>
              ) : (
                <div
                  id="interview-responses"
                  className="rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground"
                >
                  Este registro não possui roteiro vinculado.
                </div>
              );

            const orphanAnswers = getOrphanAnswers(
              interviewEditor.script,
              interviewEditor.record
            );

            const orphanAnswersSection =
              orphanAnswers.length > 0 ? (
                <div className="space-y-4 rounded-xl border border-dashed border-border/60 p-5">
                  <div>
                    <h4 className="text-sm font-semibold">Respostas de perguntas anteriores</h4>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Perguntas que não existem mais no roteiro atual.
                    </p>
                  </div>
                  {orphanAnswers.map((orphan, orphanIndex) => (
                    <div
                      key={orphan.question_id ?? orphanIndex}
                      className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-4"
                    >
                      <p className="text-xs text-muted-foreground">
                        Pergunta removida (ID: {orphan.question_id})
                      </p>
                      {readOnlyResponses ? (
                        <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                          {orphan.answer?.trim() || "Sem resposta"}
                        </p>
                      ) : (
                        <TextField
                          id={`interview-orphan-${orphan.question_id}`}
                          label="Resposta preservada"
                          value={orphan.answer ?? ""}
                          rows={3}
                          onChange={(value) =>
                            setInterviewEditor((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    record: updateInterviewAnswer(
                                      orphan.question_id,
                                      value,
                                      prev.record
                                    ),
                                  }
                                : prev
                            )
                          }
                        />
                      )}
                    </div>
                  ))}
                </div>
              ) : null;

            const observationsSection = (
              <>
                <TextField
                  id="interview-observations"
                  label="Observações"
                  value={
                    interviewEditor.record.observations ??
                    interviewEditor.record.description ??
                    ""
                  }
                  rows={3}
                  onChange={(value) =>
                    setInterviewEditor((prev) =>
                      prev
                        ? {
                            ...prev,
                            record: {
                              ...prev.record,
                              observations: value,
                              description: value,
                            },
                          }
                        : prev
                    )
                  }
                />
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={Boolean(interviewEditor.record.use_in_consolidation)}
                    onChange={(event) =>
                      setInterviewEditor((prev) =>
                        prev
                          ? {
                              ...prev,
                              record: {
                                ...prev.record,
                                use_in_consolidation: event.target.checked,
                              },
                            }
                          : prev
                      )
                    }
                  />
                  Usar na consolidação
                </label>
              </>
            );

            if (isExternal) {
              return (
                <div className="space-y-6">
                  {metadataSection}
                  {attachmentsSection(true)}
                  {observationsSection}
                </div>
              );
            }

            return (
              <div className="space-y-6">
                {metadataSection}
                {responsesSection(true)}
                {orphanAnswersSection}
                <details className="rounded-xl border border-border/70 bg-muted/10 p-1">
                  <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">
                    Anexos complementares (opcional)
                  </summary>
                  <div className="px-4 pb-4">{attachmentsSection(false)}</div>
                </details>
                {observationsSection}
              </div>
            );
          })() : null}
          </div>
          <DialogFooter className={cn(LEVANTAMENTO_MODAL_FOOTER, "flex-wrap")}>
            <Button type="button" variant="outline" onClick={() => setInterviewEditor(null)}>
              {interviewEditor?.readOnlyResponses ? "Fechar" : "Cancelar"}
            </Button>
            {interviewEditor && !interviewEditor.readOnlyResponses ? (
              <>
                {interviewEditor.script &&
                getRecordCollectionOrigin(interviewEditor.record) === "system" ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      void exportInterviewAnswersDocx(
                        interviewEditor.record,
                        interviewEditor.script
                      )
                    }
                  >
                    Exportar respostas
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    saveInterview(
                      { ...interviewEditor.record, status: "draft" },
                      interviewEditor.sourceRecordId
                    )
                  }
                >
                  Salvar rascunho
                </Button>
                <Button
                  type="button"
                  onClick={() =>
                    saveInterview(
                      { ...interviewEditor.record, status: "filled" },
                      interviewEditor.sourceRecordId
                    )
                  }
                >
                  {getRecordCollectionOrigin(interviewEditor.record) === "external"
                    ? "Salvar coleta externa"
                    : "Concluir entrevista"}
                </Button>
              </>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={interviewAddOpen} onOpenChange={setInterviewAddOpen} containerClassName={LEVANTAMENTO_MODAL_COMPACT}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar entrevista / levantamento</DialogTitle>
            <DialogDescription>
              Escolha um roteiro como base ou registre uma coleta sem roteiro estruturado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="new-interview-script">Roteiro de levantamento</Label>
            <Select
              id="new-interview-script"
              value={newInterviewScriptId}
              onChange={(event) => setNewInterviewScriptId(event.target.value)}
            >
              <option value="">Sem roteiro estruturado</option>
              {draft.survey_scripts.map((script) => (
                <option key={script.id} value={script.id}>
                  {script.name || "Roteiro sem nome"} ({countScriptQuestions(script)} perguntas)
                </option>
              ))}
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setInterviewAddOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" disabled={saving} onClick={handleAddInterviewFromDialog}>
              {saving ? "Criando..." : "Continuar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={aiGuidanceOpen}
        onOpenChange={setAiGuidanceOpen}
        containerClassName={LEVANTAMENTO_MODAL_MEDIUM}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerar roteiro com IA</DialogTitle>
            <DialogDescription>
              Deseja adicionar alguma orientação para a IA considerar na criação do roteiro?
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={6}
            value={aiGuidance}
            onChange={(event) => setAiGuidance(event.target.value)}
            placeholder="Ex.: foque nas exceções do processo, sistemas usados ou integração entre áreas."
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAiGuidanceOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void generateQuestionsWithGuidance()}>
              Gerar com base nas informações do processo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={consolidationSuggestions.length > 0}
        onOpenChange={(open) => !open && setConsolidationSuggestions([])}
        containerClassName={LEVANTAMENTO_MODAL_WIDE}
      >
        <DialogContent className={LEVANTAMENTO_MODAL_SHELL}>
          <div className={LEVANTAMENTO_MODAL_HEADER}>
            <DialogHeader className="mb-0">
              <DialogTitle>Sugestões de consolidação</DialogTitle>
              <DialogDescription>
                Revise campo a campo. Você pode editar a sugestão antes de aceitar ou descartar cada
                item.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className={LEVANTAMENTO_MODAL_BODY}>
          <div className="space-y-5">
            {consolidationSuggestions.map((suggestion) => {
              const fieldLabel =
                CONSOLIDATION_FIELDS.find((field) => field.key === suggestion.field)?.label ??
                suggestion.field;
              return (
                <div key={suggestion.id} className="space-y-4 rounded-xl border border-border/70 p-5">
                  <div>
                    <p className="text-sm font-semibold">{fieldLabel}</p>
                    {suggestion.reason ? (
                      <p className="mt-1 text-sm text-muted-foreground">{suggestion.reason}</p>
                    ) : null}
                  </div>
                  <Textarea
                    rows={5}
                    value={suggestion.suggestion}
                    onChange={(event) =>
                      setConsolidationSuggestions((prev) =>
                        prev.map((item) =>
                          item.id === suggestion.id
                            ? { ...item, suggestion: event.target.value }
                            : item
                        )
                      )
                    }
                  />
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => discardConsolidationSuggestion(suggestion.id)}
                    >
                      Descartar sugestão
                    </Button>
                    <Button type="button" onClick={() => applyConsolidationSuggestion(suggestion)}>
                      Aceitar neste campo
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          </div>
          <DialogFooter className={LEVANTAMENTO_MODAL_FOOTER}>
            <Button type="button" variant="outline" onClick={() => setConsolidationSuggestions([])}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={gapSuggestions.length > 0}
        onOpenChange={(open) => !open && setGapSuggestions([])}
        containerClassName={LEVANTAMENTO_MODAL_WIDE}
      >
        <DialogContent className={LEVANTAMENTO_MODAL_SHELL}>
          <div className={LEVANTAMENTO_MODAL_HEADER}>
            <DialogHeader className="mb-0">
              <DialogTitle>Lacunas identificadas</DialogTitle>
              <DialogDescription>
                Revise informações ausentes ou pouco claras. As sugestões não geram diagnóstico nem
                plano de ação.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className={LEVANTAMENTO_MODAL_BODY}>
          <div className="space-y-5">
            {gapSuggestions.map((gap) => (
              <div key={gap.id} className="space-y-4 rounded-xl border border-border/70 p-5">
                <Field
                  id={`gap-title-${gap.id}`}
                  label="Lacuna"
                  value={gap.title}
                  onChange={(value) =>
                    setGapSuggestions((prev) =>
                      prev.map((item) => (item.id === gap.id ? { ...item, title: value } : item))
                    )
                  }
                />
                <TextField
                  id={`gap-description-${gap.id}`}
                  label="Descrição"
                  value={gap.description}
                  rows={3}
                  onChange={(value) =>
                    setGapSuggestions((prev) =>
                      prev.map((item) =>
                        item.id === gap.id ? { ...item, description: value } : item
                      )
                    )
                  }
                />
                <TextField
                  id={`gap-question-${gap.id}`}
                  label="Pergunta ou ponto de verificação sugerido"
                  value={gap.question}
                  rows={3}
                  onChange={(value) =>
                    setGapSuggestions((prev) =>
                      prev.map((item) =>
                        item.id === gap.id ? { ...item, question: value } : item
                      )
                    )
                  }
                />
                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setGapSuggestions((prev) => prev.filter((item) => item.id !== gap.id))
                    }
                  >
                    Descartar
                  </Button>
                  <Button type="button" variant="outline" onClick={() => acceptGapAsQuestion(gap)}>
                    Adicionar ao roteiro
                  </Button>
                  <Button type="button" onClick={() => acceptGapAsPending(gap)}>
                    Adicionar em dúvidas pendentes
                  </Button>
                </div>
              </div>
            ))}
          </div>
          </div>
          <DialogFooter className={LEVANTAMENTO_MODAL_FOOTER}>
            <Button type="button" variant="outline" onClick={() => setGapSuggestions([])}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(aiDialog)}
        onOpenChange={(open) => !open && setAiDialog(null)}
        containerClassName={
          aiDialog?.kind === "organize" ? LEVANTAMENTO_MODAL_WIDE : undefined
        }
      >
        {aiDialog?.kind === "organize" ? (
          <DialogContent className={LEVANTAMENTO_MODAL_SHELL}>
            <div className={LEVANTAMENTO_MODAL_HEADER}>
              <DialogHeader className="mb-0">
                <DialogTitle>{aiDialog.title}</DialogTitle>
                <DialogDescription>{aiDialog.description}</DialogDescription>
              </DialogHeader>
            </div>
            <div className={LEVANTAMENTO_MODAL_BODY}>
              <Textarea
                className="min-h-[50vh]"
                rows={18}
                value={aiDialog.draft}
                onChange={(event) =>
                  setAiDialog((prev) => (prev ? { ...prev, draft: event.target.value } : prev))
                }
              />
            </div>
            <DialogFooter className={cn(LEVANTAMENTO_MODAL_FOOTER, "flex-wrap")}>
              <Button type="button" variant="outline" onClick={() => setAiDialog(null)}>
                Descartar
              </Button>
              <Button type="button" onClick={applyAiDialog}>
                Aplicar sugestão
              </Button>
            </DialogFooter>
          </DialogContent>
        ) : (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{aiDialog?.title}</DialogTitle>
              <DialogDescription>{aiDialog?.description}</DialogDescription>
            </DialogHeader>
            <Textarea
              rows={16}
              value={aiDialog?.draft ?? ""}
              onChange={(event) =>
                setAiDialog((prev) => (prev ? { ...prev, draft: event.target.value } : prev))
              }
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAiDialog(null)}>
                Descartar
              </Button>
              <Button type="button" onClick={applyAiDialog}>
                Aplicar sugestão
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </ProcessWorkspaceShell>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}
