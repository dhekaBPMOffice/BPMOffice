"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { OFFICE_PROCESS_STATUS_META } from "@/lib/processes";
import type {
  OfficeProcessAttachmentType,
  OfficeProcessStatus,
  ProcessFlowchartFile,
  ProcessTemplateFile,
} from "@/types/database";
import {
  addOfficeProcessAttachment,
  addOfficeProcessChecklistItem,
  deleteOfficeProcessAttachment,
  toggleOfficeProcessChecklistItem,
  updateOfficeProcessBpmPhase,
  updateOfficeProcessDetails,
  uploadOfficeAttachmentFile,
  uploadOfficeProcessMaterialFile,
} from "../actions";
import { displayTemplateName, fileNameFromUrl } from "@/lib/process-file-display";
import {
  BPM_PHASE_LABELS,
  BPM_PHASE_SLUGS,
  computeCurrentBpmPhaseSlug,
  type BpmPhaseSlug,
  type BpmStageStatusDb,
  bpmStageStatusToLabel,
} from "@/lib/bpm-phases";
import {
  getOfficeProcessEventTypeLabel,
  localizeOfficeProcessHistoryDescription,
} from "@/lib/office-process-history";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { compactLevelsForPersist, draftLevelsForForm } from "@/lib/office-process-levels";
import {
  initialTipoLabelFromOfficeProcess,
  mergeProcessTypeOptionsForSelect,
} from "@/lib/process-type-options";
import { ProcessTypeSelect } from "@/components/processes/process-type-select";
import { ProcessWorkspaceShell } from "./process-workspace-shell";
import { ProcessWorkspaceOperationalHeader } from "./process-workspace-operational-header";
import { ProcessWorkspaceCycleNav } from "./process-workspace-cycle-nav";
import { ProcessWorkspaceFormSection } from "./process-workspace-form-section";
import { ProcessWorkspacePlaceholderCard } from "./process-workspace-placeholder-card";
import { ProcessWorkspaceSidebar } from "./process-workspace-sidebar";
import { ProcessWorkspaceStageLayout } from "./process-workspace-stage-layout";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BookOpen,
  ClipboardList,
  ExternalLink,
  FileText,
  LayoutDashboard,
  Lightbulb,
  Plus,
  Target,
  Trash2,
  Workflow,
} from "lucide-react";

const ATTACHMENT_TYPES: { value: OfficeProcessAttachmentType; label: string }[] = [
  { value: "template", label: "Template" },
  { value: "flowchart", label: "Fluxograma" },
  { value: "support", label: "Suporte" },
  { value: "other", label: "Outro" },
];

type WorkspaceTabId =
  | "visao-geral"
  | "levantamento"
  | "diagnostico"
  | "modelagem"
  | "melhorias"
  | "acompanhamento"
  | "conhecimento";

type WorkspaceTabDefinition = {
  id: WorkspaceTabId;
  label: string;
  description: string;
  icon: LucideIcon;
  phases: BpmPhaseSlug[];
};

type ProcessManagementClientProps = {
  officeProcess: {
    id: string;
    name: string;
    description: string | null;
    category: string | null;
    vc_macroprocesso?: string | null;
    vc_tipo_label?: string | null;
    imported_from_base_process_id?: string | null;
    template_url?: string | null;
    template_label?: string | null;
    flowchart_image_url?: string | null;
    template_files?: { url: string; label?: string }[];
    flowchart_files?: { url: string }[];
    origin: "questionnaire" | "manual" | "value_chain";
    creation_source?: string;
    status: OfficeProcessStatus;
    owner_profile_id: string | null;
    notes: string | null;
    vc_process_type?: string | null;
    vc_levels?: unknown;
    vc_level1?: string | null;
    vc_level2?: string | null;
    vc_level3?: string | null;
  };
  processTypeOptions: string[];
  ownerOptions: { id: string; full_name: string }[];
  checklistItems: {
    id: string;
    title: string;
    description: string | null;
    is_completed: boolean;
  }[];
  attachments: {
    id: string;
    title: string;
    attachment_url: string;
    attachment_type: OfficeProcessAttachmentType;
    created_at: string;
  }[];
  history: {
    id: string;
    description: string;
    event_type: string;
    created_at: string;
  }[];
  bpmPhases: Array<{ id: string; phase: string; stage_status: string; completed_at: string | null }>;
};

const WORKSPACE_TABS: WorkspaceTabDefinition[] = [
  {
    id: "visao-geral",
    label: "Visão Geral",
    description: "Hub executivo, contexto e continuidade do trabalho.",
    icon: LayoutDashboard,
    phases: [],
  },
  {
    id: "levantamento",
    label: "Levantamento",
    description: "Descoberta do processo, insumos iniciais e controles operacionais.",
    icon: ClipboardList,
    phases: ["levantamento"],
  },
  {
    id: "diagnostico",
    label: "Diagnóstico",
    description: "Leitura da situação atual, análises e registro de hipóteses.",
    icon: FileText,
    phases: ["validacao", "descritivo"],
  },
  {
    id: "modelagem",
    label: "Modelagem",
    description: "Estrutura do processo, templates e fluxogramas de apoio.",
    icon: Workflow,
    phases: ["modelagem"],
  },
  {
    id: "melhorias",
    label: "Melhorias",
    description: "Condução de melhorias, priorização e implantação.",
    icon: Lightbulb,
    phases: ["proposicao_melhorias", "implantacao"],
  },
  {
    id: "acompanhamento",
    label: "Acompanhamento",
    description: "Evolução do ciclo BPM, monitoramento e histórico do processo.",
    icon: Activity,
    phases: ["acompanhamento"],
  },
  {
    id: "conhecimento",
    label: "Conhecimento / Documentos",
    description: "Repositório operacional de anexos, materiais e referências.",
    icon: BookOpen,
    phases: [],
  },
];

const BPM_PHASE_TO_WORKSPACE_TAB: Record<BpmPhaseSlug, WorkspaceTabId> = {
  levantamento: "levantamento",
  modelagem: "modelagem",
  validacao: "diagnostico",
  descritivo: "diagnostico",
  proposicao_melhorias: "melhorias",
  implantacao: "melhorias",
  acompanhamento: "acompanhamento",
};

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

function normalizeTemplateFilesFromRow(row: {
  template_files?: unknown;
  template_url?: string | null;
  template_label?: string | null;
}): ProcessTemplateFile[] {
  const arr = row.template_files;
  if (Array.isArray(arr) && arr.length > 0) {
    return (arr as { url: string; label?: string }[]).filter((f) => f?.url?.trim());
  }
  if (row.template_url?.trim()) {
    return [{ url: row.template_url.trim(), label: row.template_label ?? undefined }];
  }
  return [];
}

function normalizeFlowchartFilesFromRow(row: {
  flowchart_files?: unknown;
  flowchart_image_url?: string | null;
}): ProcessFlowchartFile[] {
  const arr = row.flowchart_files;
  if (Array.isArray(arr) && arr.length > 0) {
    return (arr as { url: string }[]).filter((f) => f?.url?.trim());
  }
  if (row.flowchart_image_url?.trim()) {
    return [{ url: row.flowchart_image_url.trim() }];
  }
  return [];
}

function formatRelativeDate(dateStr: string) {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "—";
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Agora mesmo";
  if (diffMins < 60) return `${diffMins} min atrás`;
  if (diffHours < 24) return `${diffHours}h atrás`;
  if (diffDays < 7) return `${diffDays} dias atrás`;
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function ProcessManagementClientInner({
  officeProcess,
  processTypeOptions,
  ownerOptions,
  checklistItems,
  attachments,
  history,
  bpmPhases,
}: ProcessManagementClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<OfficeProcessStatus>(officeProcess.status);
  const [description, setDescription] = useState(officeProcess.description ?? "");
  const [vcMacro, setVcMacro] = useState(officeProcess.vc_macroprocesso ?? "");
  const [ownerProfileId, setOwnerProfileId] = useState(officeProcess.owner_profile_id ?? "");
  const [notes, setNotes] = useState(officeProcess.notes ?? "");
  const [vcTipoLabel, setVcTipoLabel] = useState(() =>
    initialTipoLabelFromOfficeProcess(officeProcess)
  );
  const [vcLevelsDraft, setVcLevelsDraft] = useState<string[]>(() =>
    draftLevelsForForm(officeProcess, officeProcess.name)
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [newChecklistTitle, setNewChecklistTitle] = useState("");
  const [newChecklistDescription, setNewChecklistDescription] = useState("");
  const [checklistError, setChecklistError] = useState<string | null>(null);
  const [newAttachmentFiles, setNewAttachmentFiles] = useState<{ file: File; title: string }[]>(
    []
  );
  const [newAttachmentType, setNewAttachmentType] =
    useState<OfficeProcessAttachmentType>("support");
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [attachmentUploading, setAttachmentUploading] = useState(false);
  const templateFileInputRef = useRef<HTMLInputElement>(null);
  const flowchartFileInputRef = useRef<HTMLInputElement>(null);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<string | null>(null);
  const [bpmPhaseRows, setBpmPhaseRows] = useState(bpmPhases);
  const [bpmError, setBpmError] = useState<string | null>(null);
  const [bpmSaving, setBpmSaving] = useState<string | null>(null);
  const officeTemplateFiles = useMemo(
    () => normalizeTemplateFilesFromRow(officeProcess),
    [officeProcess]
  );
  const officeFlowchartFiles = useMemo(
    () => normalizeFlowchartFilesFromRow(officeProcess),
    [officeProcess]
  );
  const [editedTemplateFiles, setEditedTemplateFiles] = useState<ProcessTemplateFile[]>(() =>
    officeTemplateFiles.map((t) => ({
      url: t.url,
      ...(t.label ? { label: t.label } : {}),
    }))
  );
  const [editedFlowchartFiles, setEditedFlowchartFiles] = useState<ProcessFlowchartFile[]>(() =>
    officeFlowchartFiles.map((f) => ({ url: f.url }))
  );
  const [materialUploading, setMaterialUploading] = useState<"template" | "flowchart" | null>(
    null
  );
  const [materialError, setMaterialError] = useState<string | null>(null);

  useEffect(() => {
    setBpmPhaseRows(bpmPhases);
  }, [bpmPhases]);

  useEffect(() => {
    setDescription(officeProcess.description ?? "");
    setVcMacro(officeProcess.vc_macroprocesso ?? "");
    setVcTipoLabel(initialTipoLabelFromOfficeProcess(officeProcess));
    setVcLevelsDraft(draftLevelsForForm(officeProcess, officeProcess.name));
    setEditedTemplateFiles(
      officeTemplateFiles.map((t) => ({
        url: t.url,
        ...(t.label ? { label: t.label } : {}),
      }))
    );
    setEditedFlowchartFiles(officeFlowchartFiles.map((f) => ({ url: f.url })));
  }, [officeFlowchartFiles, officeProcess, officeTemplateFiles]);

  const currentBpmSlug = useMemo(() => computeCurrentBpmPhaseSlug(bpmPhaseRows), [bpmPhaseRows]);
  const currentBpmLabel = currentBpmSlug ? BPM_PHASE_LABELS[currentBpmSlug] : "—";
  const currentWorkspaceTab = currentBpmSlug
    ? BPM_PHASE_TO_WORKSPACE_TAB[currentBpmSlug]
    : "visao-geral";
  const rawTab = searchParams.get("aba");
  const activeTab = WORKSPACE_TABS.some((tab) => tab.id === rawTab)
    ? (rawTab as WorkspaceTabId)
    : currentWorkspaceTab;
  const statusMeta = OFFICE_PROCESS_STATUS_META[status];
  const completedCount = useMemo(
    () => checklistItems.filter((item) => item.is_completed).length,
    [checklistItems]
  );
  const primaryPendingChecklist = useMemo(
    () => checklistItems.find((item) => !item.is_completed) ?? null,
    [checklistItems]
  );
  const tipoSelectOptions = useMemo(
    () => mergeProcessTypeOptionsForSelect(processTypeOptions, vcTipoLabel),
    [processTypeOptions, vcTipoLabel]
  );
  const completedBpmCount = useMemo(
    () => bpmPhaseRows.filter((row) => row.stage_status === "completed").length,
    [bpmPhaseRows]
  );
  const progressPercent = Math.round((completedBpmCount / BPM_PHASE_SLUGS.length) * 100);
  const ownerName =
    ownerOptions.find((owner) => owner.id === ownerProfileId)?.full_name ?? "Não definido";
  const latestHistoryEvent = history[0] ?? null;
  const nextFocusTab =
    WORKSPACE_TABS.find((tab) => tab.id === currentWorkspaceTab) ?? WORKSPACE_TABS[0];
  const currentTabDefinition =
    WORKSPACE_TABS.find((tab) => tab.id === activeTab) ?? WORKSPACE_TABS[0];
  const originLabel =
    officeProcess.origin === "questionnaire"
      ? "Automática (questionário)"
      : officeProcess.origin === "value_chain"
        ? "Cadeia de valor"
        : "Manual (catálogo)";
  const creationHint =
    officeProcess.creation_source === "created_in_value_chain"
      ? "Criado na cadeia de valor"
      : officeProcess.imported_from_base_process_id
        ? "Importado do catálogo como cópia independente"
        : "A partir do catálogo";

  function onTabChange(value: string) {
    if (!WORKSPACE_TABS.some((tab) => tab.id === value)) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("aba", value);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  async function handleSaveProcess(e: React.FormEvent) {
    e.preventDefault();
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
      vcMacroprocesso: macroTrim || null,
      templateFiles: editedTemplateFiles,
      flowchartFiles: editedFlowchartFiles,
      status,
      ownerProfileId: ownerProfileId || null,
      notes,
      vcTipoLabel: vcTipoLabel.trim() || null,
      vcLevels: vcLevelsDraft,
    });

    if ("error" in result && result.error) {
      setSaveError(result.error);
      setSaving(false);
      return;
    }

    setSaving(false);
    router.refresh();
  }

  async function handleMaterialFileSelected(
    kind: "template" | "flowchart",
    files: FileList | null
  ) {
    const file = files?.[0];
    if (!file?.size) return;
    setMaterialError(null);
    setMaterialUploading(kind);
    const formData = new FormData();
    formData.set("officeProcessId", officeProcess.id);
    formData.set("kind", kind);
    formData.set("file", file);
    const result = await uploadOfficeProcessMaterialFile(formData);
    setMaterialUploading(null);
    if ("error" in result && result.error) {
      setMaterialError(result.error);
      return;
    }
    if ("success" in result && result.success && result.url) {
      if (kind === "template") {
        setEditedTemplateFiles((prev) => [
          ...prev,
          { url: result.url, label: result.filename },
        ]);
      } else {
        setEditedFlowchartFiles((prev) => [...prev, { url: result.url }]);
      }
    }
  }

  async function handleDeleteAttachment(attachmentId: string) {
    if (!window.confirm("Remover este anexo do processo?")) return;
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

  async function handleChecklistAdd(e: React.FormEvent) {
    e.preventDefault();
    setChecklistError(null);

    const result = await addOfficeProcessChecklistItem(
      officeProcess.id,
      newChecklistTitle,
      newChecklistDescription
    );

    if ("error" in result && result.error) {
      setChecklistError(result.error);
      return;
    }

    setNewChecklistTitle("");
    setNewChecklistDescription("");
    router.refresh();
  }

  async function handleChecklistToggle(id: string, checked: boolean) {
    const result = await toggleOfficeProcessChecklistItem(id, checked);
    if ("error" in result && result.error) {
      setChecklistError(result.error);
      return;
    }

    router.refresh();
  }

  async function handleAttachmentAdd(e: React.FormEvent) {
    e.preventDefault();
    setAttachmentError(null);

    const toAdd = newAttachmentFiles.filter((item) => item.file?.size);
    if (toAdd.length === 0) {
      setAttachmentError("Selecione um ou mais arquivos.");
      return;
    }

    setAttachmentUploading(true);
    for (const item of toAdd) {
      const formData = new FormData();
      formData.set("file", item.file);
      formData.set("officeProcessId", officeProcess.id);

      const uploadResult = await uploadOfficeAttachmentFile(formData);
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
    setNewAttachmentType("support");
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

  function removeAttachmentFile(index: number) {
    setNewAttachmentFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleBpmPhaseChange(phase: BpmPhaseSlug, stageStatus: BpmStageStatusDb) {
    setBpmError(null);
    setBpmSaving(phase);
    const result = await updateOfficeProcessBpmPhase({
      officeProcessId: officeProcess.id,
      phase,
      stageStatus,
    });
    setBpmSaving(null);
    if ("error" in result && result.error) {
      setBpmError(result.error);
      return;
    }
    setBpmPhaseRows((prev) =>
      prev.map((row) =>
        row.phase === phase ? { ...row, stage_status: stageStatus } : row
      )
    );
    router.refresh();
  }

  const workspaceSidebar = (
    <ProcessWorkspaceSidebar
      statusLabel={statusMeta.label}
      statusVariant={statusMeta.variant}
      lastEventSummary={
        latestHistoryEvent
          ? localizeOfficeProcessHistoryDescription(latestHistoryEvent.description)
          : null
      }
      lastEventRelative={
        latestHistoryEvent ? formatRelativeDate(latestHistoryEvent.created_at) : null
      }
      onViewFullHistory={() => onTabChange("acompanhamento")}
      checklistSummary={`${completedCount}/${checklistItems.length} itens no checklist`}
      attachmentsCount={attachments.length}
      materialsCount={editedTemplateFiles.length + editedFlowchartFiles.length}
    />
  );

  return (
    <ProcessWorkspaceShell>
      <ProcessWorkspaceOperationalHeader
        processName={officeProcess.name}
        statusBadge={{ label: statusMeta.label, variant: statusMeta.variant }}
        currentBpmLabel={currentBpmLabel}
        progressPercent={progressPercent}
        completedBpmCount={completedBpmCount}
        totalBpmPhases={BPM_PHASE_SLUGS.length}
        checklistCompleted={completedCount}
        checklistTotal={checklistItems.length}
        primaryPendingChecklist={
          primaryPendingChecklist ? { title: primaryPendingChecklist.title } : null
        }
        lastActivity={
          latestHistoryEvent
            ? {
                relative: formatRelativeDate(latestHistoryEvent.created_at),
                summary: localizeOfficeProcessHistoryDescription(latestHistoryEvent.description),
              }
            : null
        }
        continueLabel={`Continuar em ${nextFocusTab.label}`}
        onContinueToNextStep={() => onTabChange(nextFocusTab.id)}
        onOpenDocuments={() => onTabChange("conhecimento")}
        onOpenChecklist={() => onTabChange("levantamento")}
        meta={{ ownerName, originLabel }}
      />

      <Tabs value={activeTab} onValueChange={onTabChange} className="space-y-8">
        <ProcessWorkspaceCycleNav
          tabs={WORKSPACE_TABS.map((t) => ({
            id: t.id,
            label: t.label,
            icon: t.icon,
          }))}
          activeTab={activeTab}
        />

        <div className="min-w-0 space-y-8">
          <TabsContent value="visao-geral" className="mt-0 space-y-8">
            <ProcessWorkspaceStageLayout
              moduleTitle={currentTabDefinition.label}
              moduleDescription={currentTabDefinition.description}
              contextHint={creationHint}
              sidebar={workspaceSidebar}
              workPanelClassName="space-y-8"
            >
              <div className="grid gap-8 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.85fr)]">
                <Card className="border-border/80 shadow-[var(--shadow-card)]">
                  <CardHeader className="pb-4">
                    <CardTitle>Dados centrais do processo</CardTitle>
                    <CardDescription className="leading-relaxed">
                      Reorganização da edição principal dentro da workspace, preservando os mesmos
                      campos e vínculos já existentes.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSaveProcess} className="space-y-0">
                      <ProcessWorkspaceFormSection isFirst>
                        <div className="space-y-2">
                          <Label>Descrição</Label>
                          <Textarea
                            rows={4}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Descreva o objetivo e escopo do processo."
                          />
                        </div>
                      </ProcessWorkspaceFormSection>

                      <ProcessWorkspaceFormSection
                        title="Tipo e hierarquia"
                        description="O nome do processo nas listas continua derivado do macroprocesso e dos níveis."
                      >
                        <ProcessTypeSelect
                          id="vc-tipo"
                          label="Tipo"
                          options={tipoSelectOptions}
                          value={vcTipoLabel}
                          onChange={setVcTipoLabel}
                          placeholderOption="Não definido"
                        />
                        <div className="space-y-2">
                          <Label htmlFor="vc-macro">Macroprocesso</Label>
                          <Input
                            id="vc-macro"
                            value={vcMacro}
                            onChange={(e) => setVcMacro(e.target.value)}
                            placeholder="Opcional: agrupa o processo num macro."
                          />
                        </div>
                        <div className="space-y-3">
                          {vcLevelsDraft.map((val, idx) => (
                            <div
                              key={idx}
                              className="flex flex-col gap-2 sm:flex-row sm:items-end"
                            >
                              <div className="min-w-0 flex-1 space-y-2">
                                <Label htmlFor={`vc-n-${idx}`}>Nível {idx + 1}</Label>
                                <Input
                                  id={`vc-n-${idx}`}
                                  value={val}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    setVcLevelsDraft((prev) =>
                                      prev.map((item, itemIdx) =>
                                        itemIdx === idx ? value : item
                                      )
                                    );
                                  }}
                                  placeholder={
                                    idx === 0
                                      ? "Ex.: Macroárea"
                                      : "Ex.: subdivisão da hierarquia"
                                  }
                                />
                              </div>
                              {idx > 0 ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="shrink-0"
                                  onClick={() =>
                                    setVcLevelsDraft((prev) =>
                                      prev.filter((_, itemIdx) => itemIdx !== idx)
                                    )
                                  }
                                >
                                  Remover
                                </Button>
                              ) : null}
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            onClick={() => setVcLevelsDraft((prev) => [...prev, ""])}
                          >
                            <Plus className="h-4 w-4" aria-hidden />
                            Adicionar nível
                          </Button>
                        </div>
                      </ProcessWorkspaceFormSection>

                      <ProcessWorkspaceFormSection title="Status e responsável">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Status</Label>
                            <Select
                              value={status}
                              onChange={(e) => setStatus(e.target.value as OfficeProcessStatus)}
                            >
                              {Object.entries(OFFICE_PROCESS_STATUS_META).map(([value, meta]) => (
                                <option key={value} value={value}>
                                  {meta.label}
                                </option>
                              ))}
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Responsável</Label>
                            <Select
                              value={ownerProfileId}
                              onChange={(e) => setOwnerProfileId(e.target.value)}
                            >
                              <option value="">Não definido</option>
                              {ownerOptions.map((owner) => (
                                <option key={owner.id} value={owner.id}>
                                  {owner.full_name}
                                </option>
                              ))}
                            </Select>
                          </div>
                        </div>
                      </ProcessWorkspaceFormSection>

                      {saveError ? (
                        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                          {saveError}
                        </div>
                      ) : null}
                      <div className="pt-2">
                        <Button type="submit" disabled={saving}>
                          {saving ? "Salvando..." : "Salvar dados centrais"}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>

                <div className="flex flex-col gap-8">
                  <ProcessWorkspacePlaceholderCard
                    icon={Target}
                    title="Mapa da workspace"
                    description="A página já foi preparada para crescer por etapa, mantendo navegação consistente em toda a edição do processo."
                    bullets={[
                      "Cada módulo concentra um tipo de trabalho do ciclo BPM.",
                      "A etapa atual fica sempre acessível pela navegação superior.",
                      "O próximo passo é destacado automaticamente a partir do progresso BPM.",
                    ]}
                  />
                  <Card className="border-border/80 bg-card shadow-[var(--shadow-card)]">
                    <CardHeader className="pb-3">
                      <CardTitle>Resumo preservado</CardTitle>
                      <CardDescription className="leading-relaxed">
                        Informações já existentes continuam visíveis sem recriação manual.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Origem
                        </p>
                        <p className="mt-1.5 text-sm text-foreground">{originLabel}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Tipo atual
                        </p>
                        <p className="mt-1.5 text-sm text-foreground">
                          {vcTipoLabel || "Não definido"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Estrutura documental
                        </p>
                        <p className="mt-1.5 text-sm text-foreground">
                          {editedTemplateFiles.length} templates e {editedFlowchartFiles.length}{" "}
                          fluxogramas
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </ProcessWorkspaceStageLayout>
          </TabsContent>

          <TabsContent value="levantamento" className="mt-0 space-y-8">
            <ProcessWorkspaceStageLayout
              moduleTitle={currentTabDefinition.label}
              moduleDescription={currentTabDefinition.description}
              contextHint={creationHint}
              sidebar={workspaceSidebar}
            >
              <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
                <Card>
                  <CardHeader>
                    <CardTitle>Checklist operacional do levantamento</CardTitle>
                    <CardDescription>
                      O checklist atual foi realocado para a etapa inicial da workspace como
                      controle de avanço e descoberta do processo.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {checklistItems.length === 0 ? (
                      <EmptyState
                        icon={ClipboardList}
                        title="Nenhum item de checklist disponível"
                        description="Os controles desta etapa aparecerão aqui conforme forem adicionados."
                      />
                    ) : (
                      checklistItems.map((item) => (
                        <label
                          key={item.id}
                          className="flex min-h-[3rem] items-start gap-3 rounded-lg border border-border/70 bg-card px-3 py-3"
                        >
                          <input
                            type="checkbox"
                            checked={item.is_completed}
                            onChange={(e) =>
                              void handleChecklistToggle(item.id, e.target.checked)
                            }
                          />
                          <span className="space-y-1">
                            <span className="block text-sm font-medium">{item.title}</span>
                            {item.description ? (
                              <span className="block text-sm text-muted-foreground">
                                {item.description}
                              </span>
                            ) : null}
                          </span>
                        </label>
                      ))
                    )}
                    {checklistError ? (
                      <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                        {checklistError}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>

                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Novo item</CardTitle>
                      <CardDescription>
                        Adicione controles específicos desta fase sem perder vínculo com o
                        processo já existente.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleChecklistAdd} className="space-y-4">
                        <div className="space-y-2">
                          <Label>Título</Label>
                          <Input
                            value={newChecklistTitle}
                            onChange={(e) => setNewChecklistTitle(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Descrição</Label>
                          <Textarea
                            rows={3}
                            value={newChecklistDescription}
                            onChange={(e) => setNewChecklistDescription(e.target.value)}
                          />
                        </div>
                        <Button type="submit">Adicionar item</Button>
                      </form>
                    </CardContent>
                  </Card>

                  <ProcessWorkspacePlaceholderCard
                    icon={ClipboardList}
                    title="Placeholder do levantamento"
                    description="Espaço preparado para expandir esta etapa com formulários, roteiros, entrevistas e captura estruturada de evidências."
                    bullets={[
                      "Central de levantamento futura poderá consumir esta mesma organização.",
                      "Os insumos atuais do processo continuam disponíveis sem duplicação.",
                      "A etapa já nasce pronta para comportar recursos mais guiados depois.",
                    ]}
                  />
                </div>
              </div>
            </ProcessWorkspaceStageLayout>
          </TabsContent>

          <TabsContent value="diagnostico" className="mt-0 space-y-8">
            <ProcessWorkspaceStageLayout
              moduleTitle={currentTabDefinition.label}
              moduleDescription={currentTabDefinition.description}
              contextHint={creationHint}
              sidebar={workspaceSidebar}
            >
              <div className="grid gap-6 lg:grid-cols-[1.45fr_1fr]">
                <Card>
                  <CardHeader>
                    <CardTitle>Leitura diagnóstica do processo</CardTitle>
                    <CardDescription>
                      As anotações existentes foram reposicionadas aqui para servir como base de
                      análise, decisões e hipóteses de melhoria.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSaveProcess} className="space-y-4">
                      <ProcessWorkspaceFormSection title="Anotações" isFirst>
                        <Textarea
                          rows={10}
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Registre descobertas, riscos, hipóteses e conclusões deste diagnóstico."
                        />
                      </ProcessWorkspaceFormSection>
                      {saveError ? (
                        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                          {saveError}
                        </div>
                      ) : null}
                      <Button type="submit" disabled={saving}>
                        {saving ? "Salvando..." : "Salvar diagnóstico"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                <div className="space-y-6">
                  <ProcessWorkspacePlaceholderCard
                    icon={FileText}
                    title="Espaço de análise futura"
                    description="Área preparada para consolidar causas, gargalos, evidências e leitura da situação atual do processo."
                    bullets={[
                      "Pode evoluir para quadros analíticos e critérios de diagnóstico.",
                      "Pode alimentar uma futura central global de diagnósticos.",
                      "Mantém o contexto histórico do processo sempre ao lado da análise.",
                    ]}
                  />
                  <Card>
                    <CardHeader>
                      <CardTitle>Sinais já disponíveis</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm text-muted-foreground">
                      <p>
                        Histórico registrado: <strong className="text-foreground">{history.length}</strong>
                      </p>
                      <p>
                        Fase BPM em curso: <strong className="text-foreground">{currentBpmLabel}</strong>
                      </p>
                      <p>
                        Responsável atual: <strong className="text-foreground">{ownerName}</strong>
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </ProcessWorkspaceStageLayout>
          </TabsContent>

          <TabsContent value="modelagem" className="mt-0 space-y-8">
            <ProcessWorkspaceStageLayout
              moduleTitle={currentTabDefinition.label}
              moduleDescription={currentTabDefinition.description}
              contextHint={creationHint}
              sidebar={workspaceSidebar}
            >
              <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
                <Card>
                  <CardHeader>
                    <CardTitle>Materiais de modelagem</CardTitle>
                    <CardDescription>
                      Templates e fluxogramas já existentes foram reorganizados dentro da etapa
                      de modelagem, sem recriação manual.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSaveProcess} className="space-y-4">
                      {materialError ? (
                        <p className="text-sm text-destructive">{materialError}</p>
                      ) : null}

                      <ProcessWorkspaceFormSection title="Templates" isFirst>
                        <div className="space-y-2">
                        <div className="flex justify-end">
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {editedTemplateFiles.length} ficheiro(s)
                          </span>
                        </div>
                        {editedTemplateFiles.length > 0 ? (
                          <div className="divide-y rounded-lg border">
                            {editedTemplateFiles.map((tf, i) => {
                              const displayName = displayTemplateName(tf);
                              return (
                                <div
                                  key={`t-${i}-${tf.url}`}
                                  className="flex flex-wrap items-center gap-2 px-3 py-2.5"
                                >
                                  <FileExtBadge name={displayName} />
                                  <div className="min-w-0 flex-1 space-y-1">
                                    <Label className="sr-only">Rótulo do template</Label>
                                    <Input
                                      value={tf.label ?? ""}
                                      placeholder={fileNameFromUrl(tf.url)}
                                      onChange={(e) => {
                                        const value = e.target.value;
                                        setEditedTemplateFiles((prev) =>
                                          prev.map((item, itemIdx) =>
                                            itemIdx === i
                                              ? {
                                                  url: item.url,
                                                  ...(value.trim() ? { label: value.trim() } : {}),
                                                }
                                              : item
                                          )
                                        );
                                      }}
                                      className="h-8 text-sm"
                                    />
                                    <p
                                      className="truncate text-xs text-muted-foreground"
                                      title={fileNameFromUrl(tf.url)}
                                    >
                                      {fileNameFromUrl(tf.url)}
                                    </p>
                                  </div>
                                  <a
                                    href={tf.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={cn(
                                      buttonVariants({ variant: "ghost", size: "icon" }),
                                      "shrink-0"
                                    )}
                                    title="Abrir ficheiro"
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </a>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="shrink-0"
                                    onClick={() =>
                                      setEditedTemplateFiles((prev) =>
                                        prev.filter((_, itemIdx) => itemIdx !== i)
                                      )
                                    }
                                    title="Remover"
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">Nenhum template.</p>
                        )}
                        <input
                          ref={templateFileInputRef}
                          type="file"
                          className="hidden"
                          accept="*/*"
                          onChange={(e) => {
                            void handleMaterialFileSelected("template", e.target.files);
                            e.target.value = "";
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={materialUploading === "template"}
                          onClick={() => templateFileInputRef.current?.click()}
                        >
                          {materialUploading === "template"
                            ? "A enviar..."
                            : "Adicionar template"}
                        </Button>
                        </div>
                      </ProcessWorkspaceFormSection>

                      <ProcessWorkspaceFormSection title="Fluxogramas">
                        <div className="space-y-2">
                        <div className="flex justify-end">
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {editedFlowchartFiles.length} ficheiro(s)
                          </span>
                        </div>
                        {editedFlowchartFiles.length > 0 ? (
                          <div className="divide-y rounded-lg border">
                            {editedFlowchartFiles.map((ff, i) => {
                              const fileName = fileNameFromUrl(ff.url);
                              return (
                                <div
                                  key={`f-${i}-${ff.url}`}
                                  className="flex flex-wrap items-center gap-2 px-3 py-2.5"
                                >
                                  <FileExtBadge name={fileName} />
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium" title={fileName}>
                                      {fileName}
                                    </p>
                                  </div>
                                  <a
                                    href={ff.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={cn(
                                      buttonVariants({ variant: "ghost", size: "icon" }),
                                      "shrink-0"
                                    )}
                                    title="Abrir ficheiro"
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </a>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="shrink-0"
                                    onClick={() =>
                                      setEditedFlowchartFiles((prev) =>
                                        prev.filter((_, itemIdx) => itemIdx !== i)
                                      )
                                    }
                                    title="Remover"
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">Nenhum fluxograma.</p>
                        )}
                        <input
                          ref={flowchartFileInputRef}
                          type="file"
                          className="hidden"
                          accept=".png,.bpm,.bpmn,.bpms"
                          onChange={(e) => {
                            void handleMaterialFileSelected("flowchart", e.target.files);
                            e.target.value = "";
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={materialUploading === "flowchart"}
                          onClick={() => flowchartFileInputRef.current?.click()}
                        >
                          {materialUploading === "flowchart"
                            ? "A enviar..."
                            : "Adicionar fluxograma"}
                        </Button>
                        </div>
                      </ProcessWorkspaceFormSection>

                      {saveError ? (
                        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                          {saveError}
                        </div>
                      ) : null}
                      <Button type="submit" disabled={saving}>
                        {saving ? "Salvando..." : "Salvar materiais de modelagem"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                <div className="space-y-8">
                  <Card>
                    <CardHeader>
                      <CardTitle>Preview do acervo</CardTitle>
                      <CardDescription>
                        Os materiais preservados continuam acessíveis durante a modelagem.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {editedFlowchartFiles.length > 0 ? (
                        <div className="space-y-3">
                          <p className="text-sm font-medium">Fluxogramas</p>
                          {editedFlowchartFiles.map((ff, i) => {
                            const fileName = fileNameFromUrl(ff.url);
                            return (
                              <div key={`sf-${i}-${ff.url}`} className="space-y-2">
                                {/\.(png|jpe?g|gif|webp)$/i.test(ff.url) ? (
                                  <img
                                    src={ff.url}
                                    alt={fileName}
                                    className="max-h-48 w-full rounded-lg border object-contain"
                                  />
                                ) : null}
                                <a
                                  href={ff.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  download
                                  className={cn(
                                    buttonVariants({ variant: "outline" }),
                                    "w-full text-center"
                                  )}
                                >
                                  {fileName}
                                </a>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Nenhum fluxograma cadastrado.
                        </p>
                      )}

                      {editedTemplateFiles.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Templates</p>
                          {editedTemplateFiles.map((tf, i) => (
                            <a
                              key={`st-${i}-${tf.url}`}
                              href={tf.url}
                              target="_blank"
                              rel="noreferrer"
                              download
                              className={cn(buttonVariants(), "block w-full text-center")}
                            >
                              {displayTemplateName(tf)}
                            </a>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Nenhum template vinculado.
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  <ProcessWorkspacePlaceholderCard
                    icon={Workflow}
                    title="Expansão futura da modelagem"
                    description="A estrutura já está pronta para receber recursos adicionais desta etapa."
                    bullets={[
                      "Mapa to-be, padrões de desenho e validações futuras podem entrar aqui.",
                      "Os arquivos atuais já ocupam o espaço definitivo da etapa.",
                      "A organização facilita alimentar uma central global de modelagem depois.",
                    ]}
                  />
                </div>
              </div>
            </ProcessWorkspaceStageLayout>
          </TabsContent>

          <TabsContent value="melhorias" className="mt-0 space-y-8">
            <ProcessWorkspaceStageLayout
              moduleTitle={currentTabDefinition.label}
              moduleDescription={currentTabDefinition.description}
              contextHint={creationHint}
              sidebar={workspaceSidebar}
            >
              <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
                <Card>
                  <CardHeader>
                    <CardTitle>Workspace de melhorias</CardTitle>
                    <CardDescription>
                      Módulo estruturado para concentrar propostas, priorização, implantação e
                      desdobramento das melhorias do processo.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          Etapas relacionadas
                        </p>
                        <p className="mt-2 text-sm font-medium text-foreground">
                          Proposição de melhorias e implantação
                        </p>
                      </div>
                      <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          Situação atual
                        </p>
                        <p className="mt-2 text-sm font-medium text-foreground">{currentBpmLabel}</p>
                      </div>
                    </div>

                    <ProcessWorkspacePlaceholderCard
                      icon={Lightbulb}
                      title="Bloco de melhorias preparado"
                      description="Nesta fase, por enquanto, a arquitetura prioriza navegação e contexto, deixando o espaço pronto para recursos específicos."
                      bullets={[
                        "Quadros de oportunidades, backlog e priorização podem ocupar este módulo.",
                        "A implantação pode ser acompanhada aqui sem quebrar o fluxo da workspace.",
                        "O modelo já conversa com futuras centrais de melhorias do escritório.",
                      ]}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Guia da etapa</CardTitle>
                    <CardDescription>
                      O foco aqui é criar um espaço claro para a evolução futura desta frente.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-muted-foreground">
                    <p>Use este módulo como destino natural das melhorias propostas.</p>
                    <p>
                      O trilho do ciclo continua a mostrar a posição desta etapa no BPM.
                    </p>
                    <p>
                      Nenhum dado atual foi recriado; a página apenas reorganiza a experiência.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </ProcessWorkspaceStageLayout>
          </TabsContent>

          <TabsContent value="acompanhamento" className="mt-0 space-y-8">
            <ProcessWorkspaceStageLayout
              moduleTitle={currentTabDefinition.label}
              moduleDescription={currentTabDefinition.description}
              contextHint={creationHint}
              sidebar={workspaceSidebar}
              workPanelClassName="space-y-8"
            >
              <Card>
                <CardHeader>
                  <CardTitle>Etapas do ciclo BPM</CardTitle>
                  <CardDescription>
                    O acompanhamento consolida a visão histórica e o controle do ciclo BPM para
                    manter a continuidade da operação do processo.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {bpmError ? <p className="text-sm text-destructive">{bpmError}</p> : null}
                  <div className="space-y-3">
                    {BPM_PHASE_SLUGS.map((slug) => {
                      const row = bpmPhaseRows.find((item) => item.phase === slug);
                      const stageStatus = (row?.stage_status as BpmStageStatusDb) || "not_started";
                      return (
                        <div
                          key={slug}
                          className="flex flex-col gap-2 rounded-lg border border-border/60 p-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div>
                            <p className="font-medium">{BPM_PHASE_LABELS[slug]}</p>
                            <p className="text-xs text-muted-foreground">
                              {bpmSaving === slug
                                ? "Salvando..."
                                : `Atual: ${bpmStageStatusToLabel(stageStatus)}`}
                            </p>
                          </div>
                          <Select
                            value={stageStatus}
                            onChange={(e) =>
                              void handleBpmPhaseChange(slug, e.target.value as BpmStageStatusDb)
                            }
                            className="w-full sm:max-w-[220px]"
                          >
                            <option value="not_started">Não iniciado</option>
                            <option value="in_progress">Em andamento</option>
                            <option value="completed">Concluído</option>
                          </Select>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Histórico do processo</CardTitle>
                  <CardDescription>
                    Registro consolidado das alterações já existentes, agora dentro da etapa de
                    acompanhamento.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {history.length === 0 ? (
                    <EmptyState
                      icon={Activity}
                      title="Nenhum evento registrado"
                      description="As movimentações do processo aparecerão aqui."
                    />
                  ) : (
                    history.map((event) => (
                      <div key={event.id} className="rounded-lg border border-border/60 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium">
                            {localizeOfficeProcessHistoryDescription(event.description)}
                          </p>
                          <Badge variant="outline">
                            {getOfficeProcessEventTypeLabel(event.event_type)}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {new Date(event.created_at).toLocaleString("pt-BR")}
                        </p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </ProcessWorkspaceStageLayout>
          </TabsContent>

          <TabsContent value="conhecimento" className="mt-0 space-y-8">
            <ProcessWorkspaceStageLayout
              moduleTitle={currentTabDefinition.label}
              moduleDescription={currentTabDefinition.description}
              contextHint={creationHint}
              sidebar={workspaceSidebar}
            >
              <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
                <Card>
                  <CardHeader>
                    <CardTitle>Acervo do processo</CardTitle>
                    <CardDescription>
                      Ficheiros do escritório, templates, fluxogramas e anexos permanecem
                      vinculados ao processo dentro de um espaço único de conhecimento.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {attachments.length === 0 ? (
                      <EmptyState
                        icon={BookOpen}
                        title="Nenhum anexo cadastrado"
                        description="Envie documentos para formar a base de conhecimento operacional deste processo."
                      />
                    ) : (
                      attachments.map((attachment) => (
                        <div
                          key={attachment.id}
                          className="flex flex-col gap-2 rounded-lg border border-border/60 p-3 md:flex-row md:items-center md:justify-between"
                        >
                          <div>
                            <p className="text-sm font-medium">{attachment.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {
                                ATTACHMENT_TYPES.find(
                                  (type) => type.value === attachment.attachment_type
                                )?.label
                              }
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
                              aria-label="Remover anexo"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Novos anexos</CardTitle>
                      <CardDescription>
                        Envie arquivos para o repositório do processo sem alterar o cadastro-base.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleAttachmentAdd} className="space-y-4">
                        <div className="space-y-2">
                          <Label>Tipo</Label>
                          <Select
                            value={newAttachmentType}
                            onChange={(e) =>
                              setNewAttachmentType(e.target.value as OfficeProcessAttachmentType)
                            }
                          >
                            {ATTACHMENT_TYPES.map((type) => (
                              <option key={type.value} value={type.value}>
                                {type.label}
                              </option>
                            ))}
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Arquivos</Label>
                          {newAttachmentFiles.map((item, i) => (
                            <div key={i} className="flex items-center gap-2 rounded-lg border p-2">
                              <Input
                                placeholder="Título (opcional)"
                                value={item.title}
                                onChange={(e) =>
                                  setNewAttachmentFiles((prev) =>
                                    prev.map((fileItem, itemIdx) =>
                                      itemIdx === i
                                        ? { ...fileItem, title: e.target.value }
                                        : fileItem
                                    )
                                  )
                                }
                                className="flex-1"
                              />
                              <span className="max-w-[140px] truncate text-xs text-muted-foreground">
                                {item.file.name}
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeAttachmentFile(i)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          ))}
                          <Input
                            type="file"
                            multiple
                            accept="*/*"
                            onChange={(e) => {
                              const files = e.target.files;
                              if (!files?.length) return;
                              addAttachmentFiles(files);
                              e.target.value = "";
                            }}
                          />
                        </div>
                        {attachmentError ? (
                          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                            {attachmentError}
                          </div>
                        ) : null}
                        <Button
                          type="submit"
                          disabled={attachmentUploading || newAttachmentFiles.length === 0}
                        >
                          {attachmentUploading
                            ? "Enviando..."
                            : `Adicionar ${newAttachmentFiles.length > 0 ? newAttachmentFiles.length : ""} anexo(s)`}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>

                  <ProcessWorkspacePlaceholderCard
                    icon={BookOpen}
                    title="Hub de conhecimento"
                    description="O módulo está preparado para crescer como biblioteca viva do processo."
                    bullets={[
                      "Pode evoluir para organização por categoria, versão e referência cruzada.",
                      "Os materiais atuais já ocupam a base do futuro repositório.",
                      "A estrutura também favorece uma futura central global de conhecimento.",
                    ]}
                  />
                </div>
              </div>
            </ProcessWorkspaceStageLayout>
          </TabsContent>
        </div>
      </Tabs>
    </ProcessWorkspaceShell>
  );
}

export function ProcessManagementClient(props: ProcessManagementClientProps) {
  return (
    <Suspense>
      <ProcessManagementClientInner {...props} />
    </Suspense>
  );
}
