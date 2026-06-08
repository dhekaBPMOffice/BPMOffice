"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type {
  OfficeProcessAttachmentType,
  OfficeProcessEssentialDetails,
  OfficeProcessEssentialStatus,
  OfficeProcessStatus,
  ProcessFlowchartFile,
  ProcessTemplateFile,
} from "@/types/database";
import {
  addOfficeProcessAttachment,
  deleteOfficeProcessAttachment,
  updateOfficeProcessDetails,
} from "../actions";
import { uploadOfficeProcessFileViaApi } from "@/lib/office-process-file-upload-client";
import { displayTemplateName, fileNameFromUrl } from "@/lib/process-file-display";
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
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  Loader2,
  Paperclip,
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

const ESSENTIAL_STATUS_META: Record<OfficeProcessEssentialStatus, string> = {
  active: "Ativo",
  in_review: "Em revisão",
  inactive: "Inativo",
  paused: "Pausado",
};

type EssentialDetailsDraft = {
  objective: string;
  mainActivities: string;
  howItWorks: string;
  responsibleArea: string;
  participants: string;
  generalObservations: string;
  essentialStatus: OfficeProcessEssentialStatus;
};

type AIRewriteDraft = {
  description: string;
  objective: string;
  mainActivities: string;
  howItWorks: string;
  notes: string;
  generalObservations: string;
};

type AIComplementSuggestion = {
  id: string;
  title: string;
  text: string;
  selected: boolean;
};

type ProcessManagementEssentialClientProps = {
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
    return (arr as { url: string; label?: string }[]).filter((file) => file?.url?.trim());
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
    return (arr as { url: string }[]).filter((file) => file?.url?.trim());
  }
  if (row.flowchart_image_url?.trim()) {
    return [{ url: row.flowchart_image_url.trim() }];
  }
  return [];
}

function essentialStatusFromProcessStatus(status: OfficeProcessStatus): OfficeProcessEssentialStatus {
  if (status === "archived") return "inactive";
  return "active";
}

function normalizeEssentialDetails(
  details: OfficeProcessEssentialDetails | null | undefined,
  fallbackStatus: OfficeProcessStatus
): EssentialDetailsDraft {
  return {
    objective: details?.objective ?? "",
    mainActivities: details?.main_activities ?? "",
    howItWorks: details?.how_it_works ?? "",
    responsibleArea: details?.responsible_area ?? "",
    participants: details?.participants ?? "",
    generalObservations: details?.general_observations ?? "",
    essentialStatus: details?.essential_status ?? essentialStatusFromProcessStatus(fallbackStatus),
  };
}

function compactEssentialDetails(draft: EssentialDetailsDraft): OfficeProcessEssentialDetails {
  return {
    objective: draft.objective.trim(),
    main_activities: draft.mainActivities.trim(),
    how_it_works: draft.howItWorks.trim(),
    responsible_area: draft.responsibleArea.trim(),
    participants: draft.participants.trim(),
    general_observations: draft.generalObservations.trim(),
    essential_status: draft.essentialStatus,
  };
}

function isImageUrl(url: string) {
  return /\.(png|jpe?g|gif|webp|svg)$/i.test(url.split("?")[0] ?? "");
}

function stripJsonFence(value: string) {
  return value
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function parseJsonObject(value: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(stripJsonFence(value));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function stringFromUnknown(value: unknown) {
  return typeof value === "string" ? value : "";
}

function currentRewriteDraft(input: {
  description: string;
  notes: string;
  essentialDraft: EssentialDetailsDraft;
}): AIRewriteDraft {
  return {
    description: input.description,
    objective: input.essentialDraft.objective,
    mainActivities: input.essentialDraft.mainActivities,
    howItWorks: input.essentialDraft.howItWorks,
    notes: input.notes,
    generalObservations: input.essentialDraft.generalObservations,
  };
}

function parseRewriteSuggestion(rawText: string, fallback: AIRewriteDraft): AIRewriteDraft {
  const parsed = parseJsonObject(rawText);
  if (!parsed) {
    return {
      ...fallback,
      generalObservations: [fallback.generalObservations, stripJsonFence(rawText)]
        .map((part) => part.trim())
        .filter(Boolean)
        .join("\n\n"),
    };
  }

  return {
    description: stringFromUnknown(parsed.description),
    objective: stringFromUnknown(parsed.objective),
    mainActivities: stringFromUnknown(parsed.mainActivities),
    howItWorks: stringFromUnknown(parsed.howItWorks),
    notes: stringFromUnknown(parsed.notes),
    generalObservations: stringFromUnknown(parsed.generalObservations),
  };
}

function parseComplementSuggestions(rawText: string): AIComplementSuggestion[] {
  const parsed = parseJsonObject(rawText);
  const suggestions = Array.isArray(parsed?.suggestions)
    ? parsed.suggestions
    : stripJsonFence(rawText)
        .split(/\n+/)
        .map((line) => line.replace(/^[-*\d.)\s]+/, "").trim())
        .filter(Boolean)
        .map((text) => ({ title: "Complemento sugerido", text }));

  return suggestions
    .map((item, index) => {
      if (!item || typeof item !== "object") return null;
      const entry = item as Record<string, unknown>;
      const text = stringFromUnknown(entry.text).trim();
      if (!text) return null;
      return {
        id: `suggestion-${Date.now()}-${index}`,
        title: stringFromUnknown(entry.title).trim() || `Sugestão ${index + 1}`,
        text,
        selected: true,
      };
    })
    .filter((item): item is AIComplementSuggestion => Boolean(item));
}

function buildMainFormSnapshot(input: {
  description: string;
  notes: string;
  vcMacro: string;
  ownerProfileId: string;
  vcTipoLabel: string;
  vcLevelsDraft: string[];
  flowchartFiles: ProcessFlowchartFile[];
  essentialDraft: EssentialDetailsDraft;
}) {
  return JSON.stringify({
    description: input.description.trim(),
    notes: input.notes.trim(),
    vcMacro: input.vcMacro.trim(),
    ownerProfileId: input.ownerProfileId,
    vcTipoLabel: input.vcTipoLabel.trim(),
    vcLevels: compactLevelsForPersist(input.vcLevelsDraft),
    flowchartFiles: input.flowchartFiles.map((file) => ({ url: file.url.trim() })),
    essentialDetails: compactEssentialDetails(input.essentialDraft),
  });
}

export function ProcessManagementEssentialClient({
  officeProcess,
  processTypeOptions,
  ownerOptions,
  attachments,
}: ProcessManagementEssentialClientProps) {
  const router = useRouter();
  const timeZone = useTimeZone();
  const [status] = useState<OfficeProcessStatus>(officeProcess.status);
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
  const [essentialDraft, setEssentialDraft] = useState<EssentialDetailsDraft>(() =>
    normalizeEssentialDetails(officeProcess.essential_details, officeProcess.status)
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState<"rewrite" | "complements" | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [rewriteDialogOpen, setRewriteDialogOpen] = useState(false);
  const [rewriteDraft, setRewriteDraft] = useState<AIRewriteDraft>(() =>
    currentRewriteDraft({
      description: officeProcess.description ?? "",
      notes: officeProcess.notes ?? "",
      essentialDraft: normalizeEssentialDetails(officeProcess.essential_details, officeProcess.status),
    })
  );
  const [complementsDialogOpen, setComplementsDialogOpen] = useState(false);
  const [complementSuggestions, setComplementSuggestions] = useState<AIComplementSuggestion[]>([]);
  const [savedMainSnapshot, setSavedMainSnapshot] = useState(() =>
    buildMainFormSnapshot({
      description: officeProcess.description ?? "",
      notes: officeProcess.notes ?? "",
      vcMacro: officeProcess.vc_macroprocesso ?? "",
      ownerProfileId: officeProcess.owner_profile_id ?? "",
      vcTipoLabel: initialTipoLabelFromOfficeProcess(officeProcess),
      vcLevelsDraft: draftLevelsForForm(officeProcess, officeProcess.name),
      flowchartFiles: normalizeFlowchartFilesFromRow(officeProcess),
      essentialDraft: normalizeEssentialDetails(officeProcess.essential_details, officeProcess.status),
    })
  );

  const flowchartFileInputRef = useRef<HTMLInputElement>(null);
  const officeTemplateFiles = useMemo(
    () => normalizeTemplateFilesFromRow(officeProcess),
    [officeProcess]
  );
  const officeFlowchartFiles = useMemo(
    () => normalizeFlowchartFilesFromRow(officeProcess),
    [officeProcess]
  );
  const [editedFlowchartFiles, setEditedFlowchartFiles] = useState<ProcessFlowchartFile[]>(() =>
    officeFlowchartFiles.map((file) => ({ url: file.url }))
  );
  const [activeFlowchartIndex, setActiveFlowchartIndex] = useState(0);
  const [flowchartLinkUrl, setFlowchartLinkUrl] = useState("");
  const [materialUploading, setMaterialUploading] = useState(false);
  const [materialError, setMaterialError] = useState<string | null>(null);

  const [newAttachmentFiles, setNewAttachmentFiles] = useState<{ file: File; title: string }[]>(
    []
  );
  const [newAttachmentType, setNewAttachmentType] =
    useState<OfficeProcessAttachmentType>("support");
  const [attachmentLinkTitle, setAttachmentLinkTitle] = useState("");
  const [attachmentLinkUrl, setAttachmentLinkUrl] = useState("");
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [attachmentUploading, setAttachmentUploading] = useState(false);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<string | null>(null);

  const tipoSelectOptions = useMemo(
    () => mergeProcessTypeOptionsForSelect(processTypeOptions, vcTipoLabel),
    [processTypeOptions, vcTipoLabel]
  );
  const ownerName =
    ownerOptions.find((owner) => owner.id === ownerProfileId)?.full_name ?? "Não definido";
  const legacyComplementaryInfo = [
    officeProcess.vc_priority ? `Prioridade anterior: ${officeProcess.vc_priority}` : null,
    officeProcess.vc_gestor_label ? `Gestor informado na cadeia: ${officeProcess.vc_gestor_label}` : null,
    officeProcess.vc_general_status
      ? `Status anterior na cadeia: ${officeProcess.vc_general_status}`
      : null,
    officeProcess.category ? `Categoria legada: ${officeProcess.category}` : null,
  ].filter(Boolean);
  const currentMainSnapshot = useMemo(
    () =>
      buildMainFormSnapshot({
        description,
        notes,
        vcMacro,
        ownerProfileId,
        vcTipoLabel,
        vcLevelsDraft,
        flowchartFiles: editedFlowchartFiles,
        essentialDraft,
      }),
    [
      description,
      editedFlowchartFiles,
      essentialDraft,
      notes,
      ownerProfileId,
      vcLevelsDraft,
      vcMacro,
      vcTipoLabel,
    ]
  );
  const hasPendingAttachmentDraft =
    newAttachmentFiles.length > 0 ||
    attachmentLinkTitle.trim().length > 0 ||
    attachmentLinkUrl.trim().length > 0 ||
    newAttachmentType !== "support";
  const hasUnsavedChanges =
    currentMainSnapshot !== savedMainSnapshot ||
    flowchartLinkUrl.trim().length > 0 ||
    hasPendingAttachmentDraft;
  const aiContext = useMemo(
    () =>
      JSON.stringify(
        {
          processName: officeProcess.name,
          processType: vcTipoLabel,
          relatedArea: vcMacro,
          responsibleArea: essentialDraft.responsibleArea,
          responsiblePerson: ownerName,
          participants: essentialDraft.participants,
          description,
          objective: essentialDraft.objective,
          mainActivities: essentialDraft.mainActivities,
          howItWorks: essentialDraft.howItWorks,
          notes,
          generalObservations: essentialDraft.generalObservations,
          status: ESSENTIAL_STATUS_META[essentialDraft.essentialStatus],
          documents: [
            ...officeTemplateFiles.map((file) => displayTemplateName(file)),
            ...attachments.map((attachment) => attachment.title),
          ],
          visualReferences: editedFlowchartFiles.map((file) => fileNameFromUrl(file.url)),
        },
        null,
        2
      ),
    [
      attachments,
      description,
      editedFlowchartFiles,
      essentialDraft,
      notes,
      officeProcess.name,
      officeTemplateFiles,
      ownerName,
      vcMacro,
      vcTipoLabel,
    ]
  );

  useEffect(() => {
    const nextDescription = officeProcess.description ?? "";
    const nextNotes = officeProcess.notes ?? "";
    const nextVcMacro = officeProcess.vc_macroprocesso ?? "";
    const nextOwnerProfileId = officeProcess.owner_profile_id ?? "";
    const nextVcTipoLabel = initialTipoLabelFromOfficeProcess(officeProcess);
    const nextVcLevelsDraft = draftLevelsForForm(officeProcess, officeProcess.name);
    const nextEssentialDraft = normalizeEssentialDetails(
      officeProcess.essential_details,
      officeProcess.status
    );
    setDescription(nextDescription);
    setNotes(nextNotes);
    setVcMacro(nextVcMacro);
    setOwnerProfileId(nextOwnerProfileId);
    setVcTipoLabel(nextVcTipoLabel);
    setVcLevelsDraft(nextVcLevelsDraft);
    setEssentialDraft(nextEssentialDraft);
    setEditedFlowchartFiles(officeFlowchartFiles.map((file) => ({ url: file.url })));
    setActiveFlowchartIndex(0);
    setSavedMainSnapshot(
      buildMainFormSnapshot({
        description: nextDescription,
        notes: nextNotes,
        vcMacro: nextVcMacro,
        ownerProfileId: nextOwnerProfileId,
        vcTipoLabel: nextVcTipoLabel,
        vcLevelsDraft: nextVcLevelsDraft,
        flowchartFiles: officeFlowchartFiles,
        essentialDraft: nextEssentialDraft,
      })
    );
  }, [officeFlowchartFiles, officeProcess]);

  useEffect(() => {
    if (editedFlowchartFiles.length === 0) {
      setActiveFlowchartIndex(0);
      return;
    }
    setActiveFlowchartIndex((prev) => Math.min(prev, editedFlowchartFiles.length - 1));
  }, [editedFlowchartFiles.length]);

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  function updateEssentialDraft<K extends keyof EssentialDetailsDraft>(
    key: K,
    value: EssentialDetailsDraft[K]
  ) {
    setEssentialDraft((prev) => ({ ...prev, [key]: value }));
  }

  async function generateAiText(phase: "process_essential_rewrite" | "process_essential_complements") {
    const res = await fetch("/api/ai/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phase, input: aiContext }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "Não foi possível gerar a sugestão com IA.");
    }
    return String(data.text ?? "");
  }

  async function handleGenerateRewriteSuggestion() {
    setAiError(null);
    setAiLoading("rewrite");
    try {
      const result = await generateAiText("process_essential_rewrite");
      setRewriteDraft(
        parseRewriteSuggestion(
          result,
          currentRewriteDraft({ description, notes, essentialDraft })
        )
      );
      setRewriteDialogOpen(true);
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "Não foi possível melhorar a redação.");
    } finally {
      setAiLoading(null);
    }
  }

  async function handleGenerateComplementSuggestions() {
    setAiError(null);
    setAiLoading("complements");
    try {
      const result = await generateAiText("process_essential_complements");
      const suggestions = parseComplementSuggestions(result);
      if (suggestions.length === 0) {
        setAiError("A IA não retornou complementos úteis. Revise os campos e tente novamente.");
        return;
      }
      setComplementSuggestions(suggestions);
      setComplementsDialogOpen(true);
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "Não foi possível sugerir complementos.");
    } finally {
      setAiLoading(null);
    }
  }

  function updateRewriteDraft<K extends keyof AIRewriteDraft>(key: K, value: AIRewriteDraft[K]) {
    setRewriteDraft((prev) => ({ ...prev, [key]: value }));
  }

  function applyRewriteSuggestion() {
    setDescription(rewriteDraft.description);
    setNotes(rewriteDraft.notes);
    setEssentialDraft((prev) => ({
      ...prev,
      objective: rewriteDraft.objective,
      mainActivities: rewriteDraft.mainActivities,
      howItWorks: rewriteDraft.howItWorks,
      generalObservations: rewriteDraft.generalObservations,
    }));
    setRewriteDialogOpen(false);
  }

  function updateComplementSuggestion(
    id: string,
    patch: Partial<Pick<AIComplementSuggestion, "selected" | "text" | "title">>
  ) {
    setComplementSuggestions((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  }

  function applyComplementSuggestions() {
    const selected = complementSuggestions
      .filter((suggestion) => suggestion.selected && suggestion.text.trim())
      .map((suggestion) => `${suggestion.title.trim() || "Complemento"}: ${suggestion.text.trim()}`);
    if (selected.length === 0) return;
    setEssentialDraft((prev) => ({
      ...prev,
      generalObservations: [prev.generalObservations.trim(), selected.join("\n")]
        .filter(Boolean)
        .join("\n\n"),
    }));
    setComplementsDialogOpen(false);
  }

  async function handleSaveProcess(e: FormEvent) {
    e.preventDefault();
    setSaveError(null);
    const levelsCompact = compactLevelsForPersist(vcLevelsDraft);
    const macroTrim = vcMacro.trim();
    if (!macroTrim && !levelsCompact[0]) {
      setSaveError("Informe a área relacionada ou mantenha ao menos um nível para identificar o processo.");
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
      essentialDetails: compactEssentialDetails(essentialDraft),
    });

    if ("error" in result && result.error) {
      setSaveError(result.error);
      setSaving(false);
      return;
    }

    setSaving(false);
    setSavedMainSnapshot(currentMainSnapshot);
    router.refresh();
  }

  async function handleFlowchartFileSelected(files: FileList | null) {
    const file = files?.[0];
    if (!file?.size) return;
    setMaterialError(null);
    setMaterialUploading(true);
    const result = await uploadOfficeProcessFileViaApi({
      officeProcessId: officeProcess.id,
      kind: "flowchart",
      file,
    });
    setMaterialUploading(false);
    if ("error" in result && result.error) {
      setMaterialError(result.error);
      return;
    }
    if ("success" in result && result.success && result.url) {
      setEditedFlowchartFiles((prev) => {
        setActiveFlowchartIndex(prev.length);
        return [...prev, { url: result.url }];
      });
    }
  }

  function handleAddFlowchartLink() {
    const url = flowchartLinkUrl.trim();
    if (!url) {
      setMaterialError("Informe o link do material visual antes de adicioná-lo.");
      return;
    }
    setMaterialError(null);
    setEditedFlowchartFiles((prev) => {
      setActiveFlowchartIndex(prev.length);
      return [...prev, { url }];
    });
    setFlowchartLinkUrl("");
  }

  function addAttachmentFiles(files: FileList | null) {
    if (!files?.length) return;
    setNewAttachmentFiles((prev) => [
      ...prev,
      ...Array.from(files).map((file) => ({ file, title: "" })),
    ]);
  }

  function removeAttachmentFile(index: number) {
    setNewAttachmentFiles((prev) => prev.filter((_, itemIdx) => itemIdx !== index));
  }

  async function handleAttachmentAdd(e: FormEvent) {
    e.preventDefault();
    setAttachmentError(null);

    const toAdd = newAttachmentFiles.filter((item) => item.file?.size);
    const linkUrl = attachmentLinkUrl.trim();
    if (toAdd.length === 0 && !linkUrl) {
      setAttachmentError("Selecione arquivos ou informe um link.");
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

    if (linkUrl) {
      const result = await addOfficeProcessAttachment({
        officeProcessId: officeProcess.id,
        title: attachmentLinkTitle.trim() || linkUrl,
        attachmentUrl: linkUrl,
        attachmentType: newAttachmentType,
      });

      if ("error" in result && result.error) {
        setAttachmentError(result.error ?? null);
        setAttachmentUploading(false);
        return;
      }
    }

    setNewAttachmentFiles([]);
    setAttachmentLinkTitle("");
    setAttachmentLinkUrl("");
    setNewAttachmentType("support");
    setAttachmentUploading(false);
    router.refresh();
  }

  async function handleDeleteAttachment(attachmentId: string) {
    if (!window.confirm("Remover este documento ou material do processo?")) return;
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

  return (
    <ProcessWorkspaceShell>
      <div className="space-y-6">
        <Card className="border-border/80 shadow-[var(--shadow-card)]">
          <CardHeader>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <CardTitle className="text-2xl">Gestão do Processo</CardTitle>
                <CardDescription className="max-w-3xl leading-relaxed">
                  Organize as principais informações do processo, mantenha documentos
                  centralizados e facilite a consulta pela equipe.
                </CardDescription>
              </div>
              <div className="rounded-full border border-border/70 bg-muted/40 px-3 py-1 text-sm font-medium">
                {ESSENTIAL_STATUS_META[essentialDraft.essentialStatus]}
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card className="border-teal-200/70 bg-teal-50/40">
          <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-teal-950">Apoio de IA para documentação</p>
              <p className="text-sm leading-relaxed text-teal-800">
                Use a IA para refinar a redação ou identificar complementos de documentação. Nada
                será aplicado sem sua revisão e confirmação.
              </p>
              {aiError ? <p className="text-sm text-destructive">{aiError}</p> : null}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="gap-2 border-teal-300 bg-background"
                disabled={Boolean(aiLoading)}
                onClick={() => void handleGenerateRewriteSuggestion()}
              >
                {aiLoading === "rewrite" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {aiLoading === "rewrite" ? "Revisando..." : "Melhorar redação com IA"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="gap-2 border-teal-300 bg-background"
                disabled={Boolean(aiLoading)}
                onClick={() => void handleGenerateComplementSuggestions()}
              >
                {aiLoading === "complements" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {aiLoading === "complements" ? "Analisando..." : "Sugerir complementos com IA"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {hasUnsavedChanges ? (
          <div className="rounded-xl border border-amber-300/70 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm">
            <p className="font-medium">Há alterações ainda não salvas.</p>
            <p className="mt-1 leading-relaxed">
              Salve as alterações antes de sair, atualizar a página ou navegar para outra área para
              evitar perda de informações.
            </p>
          </div>
        ) : null}

        <form onSubmit={handleSaveProcess} className="space-y-6">
          <Card className="border-border/80">
            <CardHeader>
              <CardTitle>Visão geral do processo</CardTitle>
              <CardDescription>
                Registre as informações essenciais para identificar, contextualizar e acompanhar
                este processo dentro da organização.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <ProcessWorkspaceFormSection isFirst>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Nome do processo</Label>
                    <Input value={officeProcess.name} readOnly className="bg-muted/40" />
                  </div>
                  <ProcessTypeSelect
                    id="essential-vc-tipo"
                    label="Tipo ou categoria"
                    options={tipoSelectOptions}
                    value={vcTipoLabel}
                    onChange={setVcTipoLabel}
                    placeholderOption="Não definido"
                  />
                  <div className="space-y-2">
                    <Label htmlFor="essential-area">Área relacionada</Label>
                    <Input
                      id="essential-area"
                      value={vcMacro}
                      onChange={(e) => setVcMacro(e.target.value)}
                      placeholder="Ex.: Financeiro, Atendimento, Operações"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Situação atual do processo</Label>
                    <Select
                      value={essentialDraft.essentialStatus}
                      onChange={(e) =>
                        updateEssentialDraft(
                          "essentialStatus",
                          e.target.value as OfficeProcessEssentialStatus
                        )
                      }
                    >
                      {Object.entries(ESSENTIAL_STATUS_META).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Data de criação</Label>
                    <Input
                      value={
                        officeProcess.created_at
                          ? formatDateTimePtBr(officeProcess.created_at, timeZone)
                          : "Não disponível"
                      }
                      readOnly
                      className="bg-muted/40"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Última atualização</Label>
                    <Input
                      value={
                        officeProcess.updated_at
                          ? formatDateTimePtBr(officeProcess.updated_at, timeZone)
                          : "Não disponível"
                      }
                      readOnly
                      className="bg-muted/40"
                    />
                  </div>
                </div>
              </ProcessWorkspaceFormSection>
            </CardContent>
          </Card>

          <Card className="border-border/80">
            <CardHeader>
              <CardTitle>Como este processo funciona</CardTitle>
              <CardDescription>
                Descreva, de forma clara, como o processo acontece na prática, quais são suas
                principais etapas e o que precisa ser considerado pela equipe.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <ProcessWorkspaceFormSection isFirst>
                <div className="space-y-2">
                  <Label htmlFor="essential-description">Entendimento geral</Label>
                  <Textarea
                    id="essential-description"
                    rows={5}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Explique o contexto do processo, quando ele é acionado e qual papel ele cumpre na rotina da organização."
                  />
                </div>
              </ProcessWorkspaceFormSection>
              <ProcessWorkspaceFormSection title="Principais atividades ou etapas">
                <Textarea
                  rows={5}
                  value={essentialDraft.mainActivities}
                  onChange={(e) => updateEssentialDraft("mainActivities", e.target.value)}
                  placeholder="Liste as atividades em ordem lógica, destacando os principais momentos do fluxo."
                />
              </ProcessWorkspaceFormSection>
              <ProcessWorkspaceFormSection title="Como o processo funciona">
                <Textarea
                  rows={5}
                  value={essentialDraft.howItWorks}
                  onChange={(e) => updateEssentialDraft("howItWorks", e.target.value)}
                  placeholder="Informe entradas, saídas, regras de funcionamento e pontos de atenção para a equipe."
                />
              </ProcessWorkspaceFormSection>
            </CardContent>
          </Card>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <Card className="border-border/80">
              <CardHeader>
                <CardTitle>Responsáveis e áreas envolvidas</CardTitle>
                <CardDescription>
                  Indique quem responde pelo processo e quais áreas ou pessoas participam da sua
                  execução.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <ProcessWorkspaceFormSection isFirst>
                  <div className="space-y-2">
                    <Label htmlFor="essential-responsible-area">Área responsável</Label>
                    <Input
                      id="essential-responsible-area"
                      value={essentialDraft.responsibleArea}
                      onChange={(e) => updateEssentialDraft("responsibleArea", e.target.value)}
                      placeholder="Ex.: Controladoria, Recursos Humanos, Operações"
                    />
                  </div>
                </ProcessWorkspaceFormSection>
                <ProcessWorkspaceFormSection title="Responsável principal">
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
                  <p className="text-xs text-muted-foreground">
                    Responsável atualmente indicado: {ownerName}
                  </p>
                </ProcessWorkspaceFormSection>
                <ProcessWorkspaceFormSection title="Participantes ou áreas envolvidas">
                  <Textarea
                    rows={4}
                    value={essentialDraft.participants}
                    onChange={(e) => updateEssentialDraft("participants", e.target.value)}
                    placeholder="Informe áreas, pessoas ou papéis que participam da execução, revisão ou aprovação do processo."
                  />
                </ProcessWorkspaceFormSection>
              </CardContent>
            </Card>

            <Card className="border-border/80">
              <CardHeader>
                <CardTitle>Objetivo do processo</CardTitle>
                <CardDescription>
                  Explique qual é a finalidade deste processo e que resultado ele deve gerar para a
                  organização.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  rows={6}
                  value={essentialDraft.objective}
                  onChange={(e) => updateEssentialDraft("objective", e.target.value)}
                  placeholder="Descreva o resultado esperado, o problema que o processo resolve ou o valor que ele entrega."
                />
              </CardContent>
            </Card>
          </div>

          <Card className="border-border/80">
            <CardHeader>
              <CardTitle>Representação visual do processo</CardTitle>
              <CardDescription>
                Adicione o fluxograma ou outro material visual que ajude a compreender o fluxo de
                atividades.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {materialError ? <p className="text-sm text-destructive">{materialError}</p> : null}
              {editedFlowchartFiles.length > 0 ? (
                <div className="space-y-4">
                  {(() => {
                    const activeFlowchart =
                      editedFlowchartFiles[activeFlowchartIndex] ?? editedFlowchartFiles[0];
                    const activeIndex = editedFlowchartFiles.indexOf(activeFlowchart);
                    const fileName = fileNameFromUrl(activeFlowchart.url);
                    const hasMultipleFlowcharts = editedFlowchartFiles.length > 1;

                    return (
                      <div className="overflow-hidden rounded-xl border border-border/70 bg-background">
                        <div className="flex flex-col gap-3 border-b border-border/70 p-4 md:flex-row md:items-center md:justify-between">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium" title={fileName}>
                              {fileName}
                            </p>
                            <p
                              className="mt-1 truncate text-xs text-muted-foreground"
                              title={activeFlowchart.url}
                            >
                              {activeFlowchart.url}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            {hasMultipleFlowcharts ? (
                              <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                                {activeIndex + 1} de {editedFlowchartFiles.length}
                              </span>
                            ) : null}
                            <a
                              href={activeFlowchart.url}
                              target="_blank"
                              rel="noreferrer"
                              className={cn(
                                buttonVariants({ variant: "outline", size: "sm" }),
                                "gap-1.5"
                              )}
                            >
                              <ExternalLink className="h-4 w-4" />
                              Abrir
                            </a>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setEditedFlowchartFiles((prev) =>
                                  prev.filter((_, itemIdx) => itemIdx !== activeIndex)
                                )
                              }
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>

                        <div className="relative flex min-h-[360px] items-center justify-center bg-muted/20 p-4">
                          {isImageUrl(activeFlowchart.url) ? (
                            <img
                              src={activeFlowchart.url}
                              alt={fileName}
                              className="max-h-[520px] w-full rounded-lg object-contain"
                            />
                          ) : (
                            <div className="flex min-h-[280px] w-full flex-col items-center justify-center rounded-lg border border-dashed border-border/80 bg-card p-8 text-center">
                              <FileExtBadge name={fileName} />
                              <p className="mt-4 max-w-xl text-sm font-medium text-foreground">
                                Pré-visualização indisponível para este formato.
                              </p>
                              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                                Abra o arquivo ou link em uma nova aba para consultar o conteúdo.
                              </p>
                            </div>
                          )}

                          {hasMultipleFlowcharts ? (
                            <>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="absolute left-4 top-1/2 h-9 w-9 -translate-y-1/2 rounded-full bg-background/90 shadow-sm"
                                onClick={() =>
                                  setActiveFlowchartIndex((prev) =>
                                    prev === 0 ? editedFlowchartFiles.length - 1 : prev - 1
                                  )
                                }
                                aria-label="Fluxograma anterior"
                              >
                                <ChevronLeft className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="absolute right-4 top-1/2 h-9 w-9 -translate-y-1/2 rounded-full bg-background/90 shadow-sm"
                                onClick={() =>
                                  setActiveFlowchartIndex((prev) =>
                                    prev === editedFlowchartFiles.length - 1 ? 0 : prev + 1
                                  )
                                }
                                aria-label="Próximo fluxograma"
                              >
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </>
                          ) : null}
                        </div>
                      </div>
                    );
                  })()}

                  {editedFlowchartFiles.length > 1 ? (
                    <div className="flex gap-3 overflow-x-auto pb-1">
                      {editedFlowchartFiles.map((flowchart, index) => {
                        const fileName = fileNameFromUrl(flowchart.url);
                        const isActive = index === activeFlowchartIndex;
                        return (
                          <button
                            key={`essential-flowchart-thumb-${index}-${flowchart.url}`}
                            type="button"
                            className={cn(
                              "min-w-[140px] rounded-lg border bg-background p-2 text-left text-xs transition hover:border-primary/60",
                              isActive ? "border-primary ring-2 ring-primary/20" : "border-border/70"
                            )}
                            onClick={() => setActiveFlowchartIndex(index)}
                          >
                            <div className="mb-2 flex h-16 items-center justify-center rounded bg-muted/30">
                              {isImageUrl(flowchart.url) ? (
                                <img
                                  src={flowchart.url}
                                  alt={fileName}
                                  className="h-full w-full rounded object-contain"
                                />
                              ) : (
                                <FileExtBadge name={fileName} />
                              )}
                            </div>
                            <span className="line-clamp-2 text-muted-foreground">{fileName}</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              ) : (
                <EmptyState
                  icon={Workflow}
                  title="Nenhuma representação visual vinculada"
                  description="Inclua um fluxograma, imagem, PDF ou link que ajude a equipe a entender o caminho das atividades."
                />
              )}

              <div className="grid gap-4 rounded-xl border border-border/70 bg-muted/20 p-4 lg:grid-cols-[1fr_auto]">
                <div className="space-y-2">
                  <Label htmlFor="essential-flowchart-link-url">Link do material visual</Label>
                  <Input
                    id="essential-flowchart-link-url"
                    value={flowchartLinkUrl}
                    onChange={(e) => setFlowchartLinkUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </div>
                <div className="flex items-end">
                  <Button type="button" variant="outline" onClick={handleAddFlowchartLink}>
                    Adicionar referência visual
                  </Button>
                </div>
              </div>

              <input
                ref={flowchartFileInputRef}
                type="file"
                className="hidden"
                accept="*/*"
                onChange={(e) => {
                  void handleFlowchartFileSelected(e.target.files);
                  e.target.value = "";
                }}
              />
              <Button
                type="button"
                variant="outline"
                disabled={materialUploading}
                onClick={() => flowchartFileInputRef.current?.click()}
              >
                {materialUploading ? "Enviando..." : "Adicionar fluxograma ou material visual"}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/80">
            <CardHeader>
              <CardTitle>Informações complementares</CardTitle>
              <CardDescription>
                Registre observações, orientações, exceções ou detalhes importantes que não se
                encaixam nos demais campos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <ProcessWorkspaceFormSection title="Orientações e pontos de atenção" isFirst>
                <Textarea
                  rows={5}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Registre orientações, restrições, exceções ou decisões relevantes para quem consulta este processo."
                />
              </ProcessWorkspaceFormSection>
              <ProcessWorkspaceFormSection title="Informações complementares">
                <Textarea
                  rows={4}
                  value={essentialDraft.generalObservations}
                  onChange={(e) => updateEssentialDraft("generalObservations", e.target.value)}
                  placeholder="Inclua informações antigas ou complementares que devem ser preservadas para análise futura."
                />
                {legacyComplementaryInfo.length > 0 ? (
                  <div className="rounded-lg border border-border/70 bg-muted/20 p-3 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">Informações preservadas</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5">
                      {legacyComplementaryInfo.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </ProcessWorkspaceFormSection>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            {saveError ? (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {saveError}
              </div>
            ) : null}
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando..." : "Salvar alterações"}
            </Button>
          </div>
        </form>

        <Card className="border-border/80">
          <CardHeader>
            <CardTitle>Documentos e materiais de apoio</CardTitle>
            <CardDescription>
              Centralize arquivos, links, modelos, evidências e demais materiais relacionados ao
              processo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              {officeTemplateFiles.length > 0 ? (
                <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium">Modelos e referências já vinculados</p>
                  </div>
                  <div className="space-y-2">
                    {officeTemplateFiles.map((template, index) => (
                      <a
                        key={`essential-template-${index}-${template.url}`}
                        href={template.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 rounded-lg border border-border/60 bg-background px-3 py-2 text-sm hover:bg-muted/40"
                      >
                        <Paperclip className="h-4 w-4 text-muted-foreground" />
                        <span className="min-w-0 flex-1 truncate">{displayTemplateName(template)}</span>
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      </a>
                    ))}
                  </div>
                </div>
              ) : null}

              {attachments.length === 0 ? (
                <EmptyState
                  icon={BookOpen}
                  title="Nenhum documento vinculado"
                  description="Adicione materiais de apoio para facilitar a consulta, a execução e a continuidade do processo."
                />
              ) : (
                <div className="divide-y overflow-hidden rounded-lg border">
                  {attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex flex-col gap-3 bg-background p-3 md:flex-row md:items-center"
                    >
                      <FileExtBadge name={fileNameFromUrl(attachment.attachment_url)} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{attachment.title}</p>
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
                          Abrir
                        </a>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={deletingAttachmentId === attachment.id}
                          onClick={() => void handleDeleteAttachment(attachment.id)}
                          aria-label="Remover documento ou material"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <form
              onSubmit={handleAttachmentAdd}
              className="space-y-4 rounded-xl border border-border/70 bg-muted/20 p-4"
            >
              <div>
                <h3 className="text-sm font-semibold">Adicionar documento ou referência</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Envie arquivos de qualquer formato ou registre links úteis para consulta da
                  equipe.
                </p>
              </div>
              <div className="grid gap-4 lg:grid-cols-3">
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
                <div className="space-y-2 lg:col-span-2">
                  <Label>Arquivos de apoio</Label>
                  <Input
                    type="file"
                    multiple
                    accept="*/*"
                    onChange={(e) => {
                      addAttachmentFiles(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </div>
              </div>
              {newAttachmentFiles.length > 0 ? (
                <div className="space-y-2">
                  {newAttachmentFiles.map((item, index) => (
                    <div
                      key={`${item.file.name}-${index}`}
                      className="flex flex-col gap-2 rounded-lg border bg-background p-2 md:flex-row md:items-center"
                    >
                      <Input
                        placeholder="Título (opcional)"
                        value={item.title}
                        onChange={(e) =>
                          setNewAttachmentFiles((prev) =>
                            prev.map((fileItem, itemIdx) =>
                              itemIdx === index ? { ...fileItem, title: e.target.value } : fileItem
                            )
                          )
                        }
                        className="flex-1"
                      />
                      <span className="truncate text-xs text-muted-foreground md:max-w-[180px]">
                        {item.file.name}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAttachmentFile(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="essential-attachment-link-title">Título do link</Label>
                  <Input
                    id="essential-attachment-link-title"
                    value={attachmentLinkTitle}
                    onChange={(e) => setAttachmentLinkTitle(e.target.value)}
                    placeholder="Ex.: Pasta de documentos, modelo padrão, evidência"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="essential-attachment-link-url">URL</Label>
                  <Input
                    id="essential-attachment-link-url"
                    value={attachmentLinkUrl}
                    onChange={(e) => setAttachmentLinkUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </div>
              </div>
              {attachmentError ? (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {attachmentError}
                </div>
              ) : null}
              <Button
                type="submit"
                disabled={
                  attachmentUploading ||
                  (newAttachmentFiles.length === 0 && !attachmentLinkUrl.trim())
                }
                className="gap-1.5"
              >
                <Plus className="h-4 w-4" />
                {attachmentUploading ? "Enviando..." : "Adicionar documento"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={rewriteDialogOpen}
        onOpenChange={setRewriteDialogOpen}
        containerClassName="max-w-5xl"
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revisar redação sugerida pela IA</DialogTitle>
            <DialogDescription>
              Confira e edite os textos antes de aplicar. A sugestão só substituirá os campos da
              página depois da sua confirmação.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <Label>Entendimento geral</Label>
              <Textarea
                rows={6}
                value={rewriteDraft.description}
                onChange={(e) => updateRewriteDraft("description", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Objetivo do processo</Label>
              <Textarea
                rows={6}
                value={rewriteDraft.objective}
                onChange={(e) => updateRewriteDraft("objective", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Principais atividades ou etapas</Label>
              <Textarea
                rows={6}
                value={rewriteDraft.mainActivities}
                onChange={(e) => updateRewriteDraft("mainActivities", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Como o processo funciona</Label>
              <Textarea
                rows={6}
                value={rewriteDraft.howItWorks}
                onChange={(e) => updateRewriteDraft("howItWorks", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Orientações e pontos de atenção</Label>
              <Textarea
                rows={6}
                value={rewriteDraft.notes}
                onChange={(e) => updateRewriteDraft("notes", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Informações complementares</Label>
              <Textarea
                rows={6}
                value={rewriteDraft.generalObservations}
                onChange={(e) => updateRewriteDraft("generalObservations", e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRewriteDialogOpen(false)}>
              Descartar sugestão
            </Button>
            <Button type="button" onClick={applyRewriteSuggestion}>
              Aplicar aos campos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={complementsDialogOpen}
        onOpenChange={setComplementsDialogOpen}
        containerClassName="max-w-4xl"
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sugestões para complementar a documentação</DialogTitle>
            <DialogDescription>
              Selecione e edite os complementos que deseja incorporar. Eles serão adicionados em
              Informações complementares e ainda precisarão ser salvos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {complementSuggestions.map((suggestion) => (
              <div key={suggestion.id} className="rounded-xl border border-border/70 p-4">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={suggestion.selected}
                    onChange={(e) =>
                      updateComplementSuggestion(suggestion.id, { selected: e.target.checked })
                    }
                  />
                  <span className="min-w-0 flex-1 space-y-3">
                    <Input
                      value={suggestion.title}
                      onChange={(e) =>
                        updateComplementSuggestion(suggestion.id, { title: e.target.value })
                      }
                      aria-label="Título da sugestão"
                    />
                    <Textarea
                      rows={4}
                      value={suggestion.text}
                      onChange={(e) =>
                        updateComplementSuggestion(suggestion.id, { text: e.target.value })
                      }
                      aria-label="Texto da sugestão"
                    />
                  </span>
                </label>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setComplementsDialogOpen(false)}
            >
              Descartar sugestões
            </Button>
            <Button
              type="button"
              onClick={applyComplementSuggestions}
              disabled={!complementSuggestions.some((item) => item.selected && item.text.trim())}
            >
              Incorporar selecionadas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProcessWorkspaceShell>
  );
}
