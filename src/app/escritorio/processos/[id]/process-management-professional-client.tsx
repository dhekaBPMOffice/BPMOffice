"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type {
  OfficeProcessAttachmentType,
  OfficeProcessEssentialDetails,
  OfficeProcessProfessionalAction,
  OfficeProcessProfessionalActionStatus,
  OfficeProcessProfessionalDetails,
  OfficeProcessProfessionalOpportunity,
  OfficeProcessProfessionalProblem,
  OfficeProcessProfessionalProblemStatus,
  OfficeProcessProfessionalQuestion,
  OfficeProcessProfessionalRecord,
  OfficeProcessStatus,
  ProcessFlowchartFile,
} from "@/types/database";
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
import { ProcessTypeSelect } from "@/components/processes/process-type-select";
import { ProcessWorkspaceFormSection } from "./process-workspace-form-section";
import { ProcessWorkspaceShell } from "./process-workspace-shell";
import { compactLevelsForPersist, draftLevelsForForm } from "@/lib/office-process-levels";
import {
  initialTipoLabelFromOfficeProcess,
  mergeProcessTypeOptionsForSelect,
} from "@/lib/process-type-options";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  ExternalLink,
  FileText,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  Workflow,
} from "lucide-react";

const ATTACHMENT_TYPES: { value: OfficeProcessAttachmentType; label: string }[] = [
  { value: "template", label: "Template" },
  { value: "flowchart", label: "Fluxograma" },
  { value: "support", label: "Suporte" },
  { value: "other", label: "Outro" },
];

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
  records: OfficeProcessProfessionalRecord[];
  problems: OfficeProcessProfessionalProblem[];
  opportunities: OfficeProcessProfessionalOpportunity[];
  actions: OfficeProcessProfessionalAction[];
};

type AiDialogKind =
  | "rewrite"
  | "complements"
  | "questions"
  | "organize"
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
    : DEFAULT_DISCOVERY_QUESTIONS.map((question) => ({ id: createId(), question }));
  return list.map((question) => ({
    id: question.id || createId(),
    question: text(question.question),
  }));
}

function normalizeProfessionalDraft(
  details: OfficeProcessProfessionalDetails | null | undefined,
  essential: OfficeProcessEssentialDetails | null | undefined,
  notes: string | null
): ProfessionalDraft {
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
    identified_steps: text(details?.identified_steps),
    systems_used: text(details?.systems_used),
    documents_used: text(details?.documents_used),
    process_inputs: text(details?.process_inputs),
    process_outputs: text(details?.process_outputs),
    involved_areas: text(details?.involved_areas),
    pending_questions: text(details?.pending_questions),
    survey_observations: text(details?.survey_observations),
    questions: stableQuestions(details?.questions),
    records: (details?.records ?? []).map((record) => ({
      id: record.id || createId(),
      title: text(record.title),
      date: text(record.date),
      source: text(record.source),
      description: text(record.description),
      people_involved: text(record.people_involved),
      related_links: text(record.related_links),
    })),
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

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
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
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Textarea
        id={id}
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
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
    identified_steps: draft.identified_steps,
    systems_used: draft.systems_used,
    documents_used: draft.documents_used,
    process_inputs: draft.process_inputs,
    process_outputs: draft.process_outputs,
    involved_areas: draft.involved_areas,
    pending_questions: draft.pending_questions,
    survey_observations: draft.survey_observations,
    questions: draft.questions,
    records: draft.records,
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
  const timeZone = useTimeZone();
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
      officeProcess.notes
    )
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState<AiDialogKind | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiDialog, setAiDialog] = useState<AiDialogState>(null);

  const [newAttachmentFiles, setNewAttachmentFiles] = useState<{ file: File; title: string }[]>(
    []
  );
  const [newAttachmentType, setNewAttachmentType] =
    useState<OfficeProcessAttachmentType>("other");
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
            etapas: draft.identified_steps,
            sistemas: draft.systems_used,
            documentos: draft.documents_used,
            entradas: draft.process_inputs,
            saidas: draft.process_outputs,
            areas: draft.involved_areas,
            duvidas: draft.pending_questions,
            observacoes: draft.survey_observations,
          },
          roteiro: draft.questions,
          registros: draft.records,
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
        officeProcess.notes
      )
    );
    setEditedFlowchartFiles(officeFlowchartFiles.map((file) => ({ url: file.url })));
  }, [officeFlowchartFiles, officeProcess]);

  function updateDraft<K extends keyof ProfessionalDraft>(key: K, value: ProfessionalDraft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
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

  async function handleAttachmentAdd(event: FormEvent) {
    event.preventDefault();
    setAttachmentError(null);
    const toAdd = newAttachmentFiles.filter((item) => item.file?.size);
    if (toAdd.length === 0) {
      setAttachmentError("Selecione um ou mais arquivos.");
      return;
    }

    setAttachmentUploading(true);
    for (const item of toAdd) {
      const uploadResult = await uploadOfficeProcessFileViaApi({
        officeProcessId: officeProcess.id,
        kind: "attachment",
        file: item.file,
      });
      if ("error" in uploadResult) {
        setAttachmentError(uploadResult.error ?? null);
        setAttachmentUploading(false);
        return;
      }

      const result = await addOfficeProcessAttachment({
        officeProcessId: officeProcess.id,
        title: item.title.trim() || item.file.name,
        attachmentUrl: uploadResult.url,
        attachmentType: newAttachmentType,
      });

      if ("error" in result && result.error) {
        setAttachmentError(result.error ?? null);
        setAttachmentUploading(false);
        return;
      }
    }

    setNewAttachmentFiles([]);
    setNewAttachmentType("other");
    setAttachmentUploading(false);
    router.refresh();
  }

  function addAttachmentFiles(files: FileList | null) {
    if (!files?.length) return;
    setNewAttachmentFiles((prev) => [
      ...prev,
      ...Array.from(files).map((file) => ({ file, title: "" })),
    ]);
  }

  async function generateAiText(kind: AiDialogKind, phase: string) {
    setAiError(null);
    setAiLoading(kind);
    try {
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase, input: aiContext }),
      });
      const data = await response.json();
      if (!response.ok || data?.error) {
        throw new Error(data?.error || "Não foi possível gerar a sugestão com IA.");
      }
      return String(data.result ?? "");
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "Erro ao gerar sugestão com IA.");
      return null;
    } finally {
      setAiLoading(null);
    }
  }

  async function openAiDialog(kind: AiDialogKind, phase: string, title: string, description: string) {
    const result = await generateAiText(kind, phase);
    if (!result) return;
    setAiDialog({ kind, title, description, draft: stripJsonFence(result) });
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
            .map((question) => ({ id: createId(), question })),
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
    description: string
  ) => (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="gap-1.5"
      disabled={aiLoading !== null}
      onClick={() => void openAiDialog(kind, phase, title, description)}
    >
      {aiLoading === kind ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : (
        <Sparkles className="h-4 w-4" aria-hidden />
      )}
      {label}
    </Button>
  );

  return (
    <ProcessWorkspaceShell>
      <div className="space-y-6">
        <Card className="border-border/80 shadow-[var(--shadow-card)]">
          <CardHeader>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <CardTitle className="text-2xl">Gestão Profissional do Processo</CardTitle>
                <CardDescription className="max-w-3xl leading-relaxed">
                  Analise o processo, organize informações de levantamento e acompanhe ações de
                  melhoria de forma prática.
                </CardDescription>
              </div>
              <Badge variant={OFFICE_PROCESS_STATUS_META[status].variant}>
                {PROCESS_SITUATION_OPTIONS.find((option) => option.value === status)?.label ??
                  OFFICE_PROCESS_STATUS_META[status].label}
              </Badge>
            </div>
          </CardHeader>
        </Card>

        <Card className="border-border/80">
          <CardContent className="p-0">
            <form onSubmit={handleSaveProcess} className="space-y-0 p-6">
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

              <ProcessWorkspaceFormSection
                title="9. Levantamento do processo"
                description="Registre aqui as informações coletadas sobre o funcionamento do processo, considerando entrevistas, reuniões, observações ou análises realizadas."
              >
                <div className="grid gap-4 lg:grid-cols-2">
                  <Field id="professional-survey-date" type="date" label="Data do levantamento" value={draft.survey_date} onChange={(value) => updateDraft("survey_date", value)} />
                  <Field id="professional-interviewed-people" label="Pessoas entrevistadas ou envolvidas" value={draft.interviewed_people} onChange={(value) => updateDraft("interviewed_people", value)} />
                </div>
                <TextField id="professional-current-execution" label="Forma atual de execução do processo" value={draft.current_execution} onChange={(value) => updateDraft("current_execution", value)} />
                <TextField id="professional-identified-steps" label="Principais etapas identificadas" value={draft.identified_steps} onChange={(value) => updateDraft("identified_steps", value)} />
                <div className="grid gap-4 lg:grid-cols-2">
                  <TextField id="professional-systems-used" label="Sistemas utilizados" value={draft.systems_used} onChange={(value) => updateDraft("systems_used", value)} />
                  <TextField id="professional-documents-used" label="Documentos utilizados" value={draft.documents_used} onChange={(value) => updateDraft("documents_used", value)} />
                  <TextField id="professional-inputs" label="Entradas do processo" value={draft.process_inputs} onChange={(value) => updateDraft("process_inputs", value)} />
                  <TextField id="professional-outputs" label="Saídas do processo" value={draft.process_outputs} onChange={(value) => updateDraft("process_outputs", value)} />
                </div>
                <TextField id="professional-involved-areas" label="Áreas envolvidas" value={draft.involved_areas} onChange={(value) => updateDraft("involved_areas", value)} />
                <TextField id="professional-pending-questions" label="Dúvidas pendentes" value={draft.pending_questions} onChange={(value) => updateDraft("pending_questions", value)} />
                <TextField id="professional-survey-observations" label="Observações do levantamento" value={draft.survey_observations} onChange={(value) => updateDraft("survey_observations", value)} />
              </ProcessWorkspaceFormSection>

              <ProcessWorkspaceFormSection
                title="10. Roteiro de perguntas"
                description="Use este roteiro como apoio para levantar informações com as pessoas envolvidas no processo. As perguntas podem ser ajustadas conforme a realidade da empresa."
              >
                <div>{renderAiButton("questions", "process_professional_discovery_questions", "Gerar roteiro com IA", "Roteiro sugerido", "Revise, edite ou descarte as perguntas sugeridas antes de aplicar.")}</div>
                <div className="space-y-3">
                  {draft.questions.map((question, index) => (
                    <div key={question.id} className="flex gap-2">
                      <Input value={question.question ?? ""} onChange={(event) => updateDraft("questions", draft.questions.map((item, itemIndex) => itemIndex === index ? { ...item, question: event.target.value } : item))} />
                      <Button type="button" variant="ghost" size="icon" onClick={() => updateDraft("questions", draft.questions.filter((_, itemIndex) => itemIndex !== index))}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => updateDraft("questions", [...draft.questions, { id: createId(), question: "" }])}>
                  <Plus className="mr-1.5 h-4 w-4" />Adicionar pergunta
                </Button>
              </ProcessWorkspaceFormSection>

              <ProcessWorkspaceFormSection
                title="11. Registro de informações levantadas"
                description="Centralize os registros do levantamento para manter o histórico das informações coletadas e facilitar futuras consultas."
              >
                <div>{renderAiButton("organize", "process_professional_organize_notes", "Organizar anotações com IA", "Anotações organizadas", "Revise a estrutura antes de aplicar ao levantamento.")}</div>
                {draft.records.map((record, index) => (
                  <div key={record.id} className="space-y-4 rounded-xl border border-border/70 p-4">
                    <div className="flex justify-between gap-3">
                      <h4 className="text-sm font-semibold">Registro {index + 1}</h4>
                      <Button type="button" variant="ghost" size="sm" onClick={() => updateDraft("records", draft.records.filter((_, itemIndex) => itemIndex !== index))}>Remover</Button>
                    </div>
                    <div className="grid gap-4 lg:grid-cols-3">
                      <Field id={`record-title-${record.id}`} label="Título do registro" value={record.title ?? ""} onChange={(value) => updateDraft("records", draft.records.map((item, itemIndex) => itemIndex === index ? { ...item, title: value } : item))} />
                      <Field id={`record-date-${record.id}`} type="date" label="Data" value={record.date ?? ""} onChange={(value) => updateDraft("records", draft.records.map((item, itemIndex) => itemIndex === index ? { ...item, date: value } : item))} />
                      <Field id={`record-source-${record.id}`} label="Fonte da informação" value={record.source ?? ""} onChange={(value) => updateDraft("records", draft.records.map((item, itemIndex) => itemIndex === index ? { ...item, source: value } : item))} />
                    </div>
                    <TextField id={`record-description-${record.id}`} label="Descrição do registro" value={record.description ?? ""} onChange={(value) => updateDraft("records", draft.records.map((item, itemIndex) => itemIndex === index ? { ...item, description: value } : item))} />
                    <div className="grid gap-4 lg:grid-cols-2">
                      <Field id={`record-people-${record.id}`} label="Pessoas envolvidas" value={record.people_involved ?? ""} onChange={(value) => updateDraft("records", draft.records.map((item, itemIndex) => itemIndex === index ? { ...item, people_involved: value } : item))} />
                      <Field id={`record-links-${record.id}`} label="Anexos ou links relacionados" value={record.related_links ?? ""} onChange={(value) => updateDraft("records", draft.records.map((item, itemIndex) => itemIndex === index ? { ...item, related_links: value } : item))} />
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => updateDraft("records", [...draft.records, { id: createId(), title: "", date: "", source: "", description: "", people_involved: "", related_links: "" }])}>
                  <Plus className="mr-1.5 h-4 w-4" />Adicionar registro
                </Button>
              </ProcessWorkspaceFormSection>

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

              <div className="flex flex-col gap-3 border-t border-border/40 pt-6 sm:flex-row sm:items-center sm:justify-end">
                {saveError ? (
                  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{saveError}</div>
                ) : null}
                {aiError ? (
                  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{aiError}</div>
                ) : null}
                <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar alterações"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader>
            <CardTitle>Documentos do processo</CardTitle>
            <CardDescription>
              Documentos de apoio, evidências e arquivos úteis para a análise e operação do processo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              {attachments.length === 0 ? (
                <EmptyState icon={BookOpen} title="Nenhum documento cadastrado" description="Envie documentos para formar a base de conhecimento deste processo." />
              ) : (
                attachments.map((attachment) => (
                  <div key={attachment.id} className="flex flex-col gap-2 rounded-lg border border-border/60 bg-background p-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-medium">{attachment.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {ATTACHMENT_TYPES.find((type) => type.value === attachment.attachment_type)?.label}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <a href={attachment.attachment_url} target="_blank" rel="noreferrer" download className={buttonVariants({ variant: "outline", size: "sm" })}>Baixar</a>
                      <Button type="button" variant="ghost" size="sm" disabled={deletingAttachmentId === attachment.id} onClick={() => void handleDeleteAttachment(attachment.id)} aria-label="Remover documento">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleAttachmentAdd} className="space-y-4 rounded-xl border border-border/70 bg-muted/20 p-4">
              <div>
                <h3 className="text-sm font-semibold">Novo documento</h3>
                <p className="mt-1 text-sm text-muted-foreground">Envie um ou mais arquivos para o repositório.</p>
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={newAttachmentType} onChange={(event) => setNewAttachmentType(event.target.value as OfficeProcessAttachmentType)}>
                  {ATTACHMENT_TYPES.filter((type) => type.value !== "flowchart").map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Arquivos</Label>
                {newAttachmentFiles.map((item, index) => (
                  <div key={index} className="flex items-center gap-2 rounded-lg border bg-background p-2">
                    <Input placeholder="Título (opcional)" value={item.title} onChange={(event) => setNewAttachmentFiles((prev) => prev.map((fileItem, itemIndex) => itemIndex === index ? { ...fileItem, title: event.target.value } : fileItem))} className="flex-1" />
                    <span className="max-w-[140px] truncate text-xs text-muted-foreground">{item.file.name}</span>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setNewAttachmentFiles((prev) => prev.filter((_, itemIndex) => itemIndex !== index))}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                <Input type="file" multiple accept="*/*" onChange={(event) => {
                  const files = event.target.files;
                  if (!files?.length) return;
                  addAttachmentFiles(files);
                  event.target.value = "";
                }} />
              </div>
              {attachmentError ? <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{attachmentError}</div> : null}
              <Button type="submit" disabled={attachmentUploading || newAttachmentFiles.length === 0}>
                {attachmentUploading ? "Enviando..." : `Adicionar ${newAttachmentFiles.length > 0 ? newAttachmentFiles.length : ""} documento(s)`}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Dialog open={Boolean(aiDialog)} onOpenChange={(open) => !open && setAiDialog(null)}>
        <DialogContent className="max-w-3xl">
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
            <Button type="button" variant="outline" onClick={() => setAiDialog(null)}>Descartar</Button>
            <Button type="button" onClick={applyAiDialog}>Aplicar sugestão</Button>
          </DialogFooter>
        </DialogContent>
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
