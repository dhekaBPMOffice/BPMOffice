"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
  type BpmPhaseSlug,
  type BpmStageStatusDb,
  bpmStageStatusToLabel,
  formatCurrentBpmPhaseLabel,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExternalLink, Trash2 } from "lucide-react";

const ATTACHMENT_TYPES: { value: OfficeProcessAttachmentType; label: string }[] = [
  { value: "template", label: "Template" },
  { value: "flowchart", label: "Fluxograma" },
  { value: "support", label: "Suporte" },
  { value: "other", label: "Outro" },
];

function FileExtBadge({ name }: { name: string }) {
  const dot = name.lastIndexOf(".");
  const ext = dot >= 0 ? name.slice(dot + 1).toUpperCase() : "";
  if (!ext) return null;
  return (
    <span className="inline-flex h-8 shrink-0 items-center rounded bg-muted px-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
      {ext}
    </span>
  );
}

/** Normaliza templates a partir de linhas de office_processes ou base_processes (inclui legado template_url). */
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

export type CatalogBaseProcessSnapshot = {
  id: string;
  name: string;
  is_active: boolean;
  template_files: unknown;
  flowchart_files: unknown;
  template_url: string | null;
  template_label: string | null;
  flowchart_image_url: string | null;
} | null;

export function ProcessManagementClient({
  officeProcess,
  catalogBaseProcess,
  ownerOptions,
  checklistItems,
  attachments,
  history,
  bpmPhases,
}: {
  officeProcess: {
    id: string;
    name: string;
    description: string | null;
    category: string | null;
    base_process_id?: string | null;
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
  };
  catalogBaseProcess: CatalogBaseProcessSnapshot;
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
}) {
  const router = useRouter();
  const [status, setStatus] = useState<OfficeProcessStatus>(officeProcess.status);
  const [name, setName] = useState(officeProcess.name);
  const [description, setDescription] = useState(officeProcess.description ?? "");
  const [category, setCategory] = useState(officeProcess.category ?? "");
  const [ownerProfileId, setOwnerProfileId] = useState(officeProcess.owner_profile_id ?? "");
  const [notes, setNotes] = useState(officeProcess.notes ?? "");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [newChecklistTitle, setNewChecklistTitle] = useState("");
  const [newChecklistDescription, setNewChecklistDescription] = useState("");
  const [checklistError, setChecklistError] = useState<string | null>(null);
  const [newAttachmentFiles, setNewAttachmentFiles] = useState<{ file: File; title: string }[]>([]);
  const [newAttachmentType, setNewAttachmentType] =
    useState<OfficeProcessAttachmentType>("support");
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [attachmentUploading, setAttachmentUploading] = useState(false);

  const officeTemplateFiles = useMemo(
    () => normalizeTemplateFilesFromRow(officeProcess),
    [officeProcess]
  );
  const officeFlowchartFiles = useMemo(
    () => normalizeFlowchartFilesFromRow(officeProcess),
    [officeProcess]
  );

  const effectiveTemplateFiles = useMemo(() => {
    if (officeTemplateFiles.length > 0) return officeTemplateFiles;
    if (catalogBaseProcess) return normalizeTemplateFilesFromRow(catalogBaseProcess);
    return [];
  }, [officeTemplateFiles, catalogBaseProcess]);

  const effectiveFlowchartFiles = useMemo(() => {
    if (officeFlowchartFiles.length > 0) return officeFlowchartFiles;
    if (catalogBaseProcess) return normalizeFlowchartFilesFromRow(catalogBaseProcess);
    return [];
  }, [officeFlowchartFiles, catalogBaseProcess]);

  const catalogTemplatesForAnexos = useMemo(
    () => (catalogBaseProcess ? normalizeTemplateFilesFromRow(catalogBaseProcess) : []),
    [catalogBaseProcess]
  );
  const catalogFlowchartsForAnexos = useMemo(
    () => (catalogBaseProcess ? normalizeFlowchartFilesFromRow(catalogBaseProcess) : []),
    [catalogBaseProcess]
  );

  const [editedTemplateFiles, setEditedTemplateFiles] = useState<ProcessTemplateFile[]>(() =>
    effectiveTemplateFiles.map((t) => ({
      url: t.url,
      ...(t.label ? { label: t.label } : {}),
    }))
  );
  const [editedFlowchartFiles, setEditedFlowchartFiles] = useState<ProcessFlowchartFile[]>(() =>
    effectiveFlowchartFiles.map((f) => ({ url: f.url }))
  );
  const [materialUploading, setMaterialUploading] = useState<"template" | "flowchart" | null>(null);
  const [materialError, setMaterialError] = useState<string | null>(null);
  const templateFileInputRef = useRef<HTMLInputElement>(null);
  const flowchartFileInputRef = useRef<HTMLInputElement>(null);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<string | null>(null);

  const [bpmPhaseRows, setBpmPhaseRows] = useState(bpmPhases);
  const [bpmError, setBpmError] = useState<string | null>(null);
  const [bpmSaving, setBpmSaving] = useState<string | null>(null);

  useEffect(() => {
    setBpmPhaseRows(bpmPhases);
  }, [bpmPhases]);
  useEffect(() => {
    setName(officeProcess.name);
    setDescription(officeProcess.description ?? "");
    setCategory(officeProcess.category ?? "");
    setEditedTemplateFiles(
      effectiveTemplateFiles.map((t) => ({
        url: t.url,
        ...(t.label ? { label: t.label } : {}),
      }))
    );
    setEditedFlowchartFiles(effectiveFlowchartFiles.map((f) => ({ url: f.url })));
  }, [officeProcess, effectiveTemplateFiles, effectiveFlowchartFiles]);

  const currentBpmLabel = useMemo(
    () => formatCurrentBpmPhaseLabel(bpmPhaseRows),
    [bpmPhaseRows]
  );

  const statusMeta = OFFICE_PROCESS_STATUS_META[status];
  const completedCount = useMemo(
    () => checklistItems.filter((item) => item.is_completed).length,
    [checklistItems]
  );

  async function handleSaveProcess(e: React.FormEvent) {
    e.preventDefault();
    setSaveError(null);
    setSaving(true);

    const result = await updateOfficeProcessDetails({
      officeProcessId: officeProcess.id,
      name,
      description,
      category,
      templateFiles: editedTemplateFiles,
      flowchartFiles: editedFlowchartFiles,
      status,
      ownerProfileId: ownerProfileId || null,
      notes,
    });

    if ("error" in result && result.error) {
      setSaveError(result.error);
      setSaving(false);
      return;
    }

    setSaving(false);
    router.refresh();
  }

  async function handleMaterialFileSelected(kind: "template" | "flowchart", files: FileList | null) {
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

  const originLabel =
    officeProcess.origin === "questionnaire"
      ? "Automática (questionário)"
      : officeProcess.origin === "value_chain"
        ? "Cadeia de valor"
        : "Manual (catálogo)";
  const creationHint =
    officeProcess.creation_source === "created_in_value_chain"
      ? "Criado na cadeia de valor"
      : "A partir do catálogo";

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Origem</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{originLabel}</p>
            <p className="text-xs text-muted-foreground">{creationHint}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Fase BPM atual</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">{currentBpmLabel}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Checklist</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              {completedCount}/{checklistItems.length} concluídos
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Anexos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{attachments.length} cadastrados</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="visao-geral" className="w-full">
        <TabsList className="flex h-auto flex-wrap gap-1">
          <TabsTrigger value="visao-geral">Visão geral</TabsTrigger>
          <TabsTrigger value="ciclo-bpm">Ciclo BPM</TabsTrigger>
          <TabsTrigger value="checklist">Checklist</TabsTrigger>
          <TabsTrigger value="anexos">Anexos</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="visao-geral" className="mt-4">
          <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <Card>
              <CardHeader>
                <CardTitle>Gestão do processo</CardTitle>
                <CardDescription>
                  Atualize os dados do processo no escritório sem impactar o cadastro base.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveProcess} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nome do processo</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Descrição</Label>
                    <Textarea
                      rows={4}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Descreva o objetivo e escopo do processo."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Categoria</Label>
                    <Input
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="Ex.: Operacional, Gerencial, Apoio..."
                    />
                  </div>
                  {materialError ? (
                    <p className="text-sm text-destructive">{materialError}</p>
                  ) : null}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label>Templates</Label>
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
                                    const v = e.target.value;
                                    setEditedTemplateFiles((prev) =>
                                      prev.map((item, j) =>
                                        j === i
                                          ? { url: item.url, ...(v.trim() ? { label: v.trim() } : {}) }
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
                                  setEditedTemplateFiles((p) => p.filter((_, j) => j !== i))
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
                      {materialUploading === "template" ? "A enviar…" : "Adicionar template"}
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label>Fluxogramas</Label>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {editedFlowchartFiles.length} ficheiro(s)
                      </span>
                    </div>
                    {editedFlowchartFiles.length > 0 ? (
                      <div className="divide-y rounded-lg border">
                        {editedFlowchartFiles.map((ff, i) => {
                          const fname = fileNameFromUrl(ff.url);
                          return (
                            <div
                              key={`f-${i}-${ff.url}`}
                              className="flex flex-wrap items-center gap-2 px-3 py-2.5"
                            >
                              <FileExtBadge name={fname} />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium" title={fname}>
                                  {fname}
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
                                  setEditedFlowchartFiles((p) => p.filter((_, j) => j !== i))
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
                      {materialUploading === "flowchart" ? "A enviar…" : "Adicionar fluxograma"}
                    </Button>
                  </div>
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
                  <div className="space-y-2">
                    <Label>Anotações</Label>
                    <Textarea
                      rows={6}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Registre decisões, pendências e próximos passos."
                    />
                  </div>
                  {saveError && (
                    <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                      {saveError}
                    </div>
                  )}
                  <Button type="submit" disabled={saving}>
                    {saving ? "Salvando..." : "Salvar alterações do processo"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Materiais de apoio</CardTitle>
                <CardDescription>
                  Consulte os templates e fluxogramas vinculados ao processo.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {editedFlowchartFiles.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-sm font-medium">Fluxogramas</p>
                    {editedFlowchartFiles.map((ff, i) => {
                      const fname = fileNameFromUrl(ff.url);
                      return (
                        <div key={`sf-${i}-${ff.url}`} className="space-y-2">
                          {/\.(png|jpe?g|gif|webp)$/i.test(ff.url) ? (
                            <img
                              src={ff.url}
                              alt={fname}
                              className="max-h-48 w-full rounded-lg border object-contain"
                            />
                          ) : null}
                          <a
                            href={ff.url}
                            target="_blank"
                            rel="noreferrer"
                            download
                            className={cn(buttonVariants({ variant: "outline" }), "w-full text-center")}
                          >
                            {fname}
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
          </div>
        </TabsContent>

        <TabsContent value="ciclo-bpm" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Etapas do ciclo BPM</CardTitle>
              <CardDescription>
                Atualize o status de cada etapa. A “fase atual” considera a primeira etapa ainda não concluída.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {bpmError ? <p className="text-sm text-destructive">{bpmError}</p> : null}
              <div className="space-y-3">
                {BPM_PHASE_SLUGS.map((slug) => {
                  const row = bpmPhaseRows.find((r) => r.phase === slug);
                  const st = (row?.stage_status as BpmStageStatusDb) || "not_started";
                  return (
                    <div
                      key={slug}
                      className="flex flex-col gap-2 rounded-lg border border-border/60 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-medium">{BPM_PHASE_LABELS[slug]}</p>
                        <p className="text-xs text-muted-foreground">
                          {bpmSaving === slug ? "Salvando…" : `Atual: ${bpmStageStatusToLabel(st)}`}
                        </p>
                      </div>
                      <Select
                        value={st}
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
        </TabsContent>

        <TabsContent value="checklist" className="mt-4">
          <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            <Card>
              <CardHeader>
                <CardTitle>Checklist operacional</CardTitle>
                <CardDescription>
                  Marque o avanço do processo e complemente a lista quando necessário.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {checklistItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum item de checklist disponível.
                  </p>
                ) : (
                  checklistItems.map((item) => (
                    <label
                      key={item.id}
                      className="flex items-start gap-3 rounded-lg border border-border/60 p-3"
                    >
                      <input
                        type="checkbox"
                        checked={item.is_completed}
                        onChange={(e) => handleChecklistToggle(item.id, e.target.checked)}
                      />
                      <span className="space-y-1">
                        <span className="block text-sm font-medium">{item.title}</span>
                        {item.description && (
                          <span className="block text-sm text-muted-foreground">
                            {item.description}
                          </span>
                        )}
                      </span>
                    </label>
                  ))
                )}
                {checklistError && (
                  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    {checklistError}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Novo item</CardTitle>
                <CardDescription>
                  Adicione controles específicos do escritório para este processo.
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
          </div>
        </TabsContent>

        <TabsContent value="anexos" className="mt-4">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Materiais do catálogo (Processo Base)</CardTitle>
                <CardDescription>
                  Templates e fluxogramas definidos pelo administrador master no catálogo. São independentes dos ficheiros enviados abaixo neste escritório.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!officeProcess.base_process_id ? (
                  <p className="text-sm text-muted-foreground">
                    Este processo não está vinculado a um processo do catálogo padrão.
                  </p>
                ) : !catalogBaseProcess ? (
                  <p className="text-sm text-muted-foreground">
                    Não foi possível carregar o processo base (pode estar inativo ou indisponível). Os processos inativos não são visíveis para o escritório por política de segurança.
                  </p>
                ) : catalogTemplatesForAnexos.length === 0 && catalogFlowchartsForAnexos.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum template ou fluxograma no catálogo para este processo.
                  </p>
                ) : (
                  <>
                    {catalogFlowchartsForAnexos.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Fluxogramas</p>
                        <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                          {catalogFlowchartsForAnexos.map((ff, i) => (
                            <li key={i}>
                              <a
                                href={ff.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-primary underline-offset-4 hover:underline"
                              >
                                {fileNameFromUrl(ff.url)}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {catalogTemplatesForAnexos.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Templates</p>
                        <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                          {catalogTemplatesForAnexos.map((tf, i) => (
                            <li key={i}>
                              <a
                                href={tf.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-primary underline-offset-4 hover:underline"
                              >
                                {displayTemplateName(tf)}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            <Card>
              <CardHeader>
                <CardTitle>Anexos do escritório</CardTitle>
                <CardDescription>
                  Ficheiros enviados aqui no escritório (lista separada do catálogo administrativo). Não altera o Processo Base.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {attachments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum anexo cadastrado.
                  </p>
                ) : (
                  attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex flex-col gap-2 rounded-lg border border-border/60 p-3 md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium">{attachment.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {ATTACHMENT_TYPES.find((type) => type.value === attachment.attachment_type)?.label}
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

            <Card>
              <CardHeader>
                <CardTitle>Novos anexos</CardTitle>
                <CardDescription>
                  Envie um ou mais arquivos em qualquer formato (exceto executáveis). Adicione quantos precisar.
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
                              prev.map((x, j) => (j === i ? { ...x, title: e.target.value } : x))
                            )
                          }
                          className="flex-1"
                        />
                        <span className="text-xs truncate max-w-[140px] text-muted-foreground">{item.file.name}</span>
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
                  {attachmentError && (
                    <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                      {attachmentError}
                    </div>
                  )}
                  <Button type="submit" disabled={attachmentUploading || newAttachmentFiles.length === 0}>
                    {attachmentUploading ? "Enviando..." : `Adicionar ${newAttachmentFiles.length > 0 ? newAttachmentFiles.length : ""} anexo(s)`}
                  </Button>
                </form>
              </CardContent>
            </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="historico" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Histórico do processo</CardTitle>
              <CardDescription>
                Registro das principais alterações realizadas na gestão do processo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum evento registrado até o momento.
                </p>
              ) : (
                history.map((event) => (
                  <div key={event.id} className="rounded-lg border border-border/60 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium">
                        {localizeOfficeProcessHistoryDescription(event.description)}
                      </p>
                      <Badge variant="outline">{getOfficeProcessEventTypeLabel(event.event_type)}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {new Date(event.created_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
