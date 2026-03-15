"use client";

import { useMemo, useState } from "react";
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
  toggleOfficeProcessChecklistItem,
  updateOfficeProcessDetails,
  uploadOfficeAttachmentFile,
} from "../actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2 } from "lucide-react";

const ATTACHMENT_TYPES: { value: OfficeProcessAttachmentType; label: string }[] = [
  { value: "template", label: "Template" },
  { value: "flowchart", label: "Fluxograma" },
  { value: "support", label: "Suporte" },
  { value: "other", label: "Outro" },
];

export function ProcessManagementClient({
  officeProcess,
  ownerOptions,
  checklistItems,
  attachments,
  history,
}: {
  officeProcess: {
    id: string;
    name: string;
    description: string | null;
    category: string | null;
    template_url?: string | null;
    template_label?: string | null;
    flowchart_image_url?: string | null;
    template_files?: { url: string; label?: string }[];
    flowchart_files?: { url: string }[];
    origin: "questionnaire" | "manual";
    status: OfficeProcessStatus;
    owner_profile_id: string | null;
    notes: string | null;
  };
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
}) {
  const router = useRouter();
  const [status, setStatus] = useState<OfficeProcessStatus>(officeProcess.status);
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

  const templateFiles: ProcessTemplateFile[] = useMemo(() => {
    const arr = officeProcess.template_files;
    if (Array.isArray(arr) && arr.length > 0) return arr;
    if (officeProcess.template_url) {
      return [{ url: officeProcess.template_url, label: officeProcess.template_label ?? undefined }];
    }
    return [];
  }, [officeProcess.template_files, officeProcess.template_url, officeProcess.template_label]);

  const flowchartFiles: ProcessFlowchartFile[] = useMemo(() => {
    const arr = officeProcess.flowchart_files;
    if (Array.isArray(arr) && arr.length > 0) return arr;
    if (officeProcess.flowchart_image_url) return [{ url: officeProcess.flowchart_image_url }];
    return [];
  }, [officeProcess.flowchart_files, officeProcess.flowchart_image_url]);

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

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
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
            <p className="text-sm">{officeProcess.origin === "questionnaire" ? "Automática" : "Manual"}</p>
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
                  Atualize o responsável, o status e as observações operacionais.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveProcess} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Descrição</Label>
                    <p className="rounded-lg border border-border/60 px-3 py-2 text-sm text-muted-foreground">
                      {officeProcess.description || "Sem descrição cadastrada."}
                    </p>
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
                    {saving ? "Salvando..." : "Salvar gestão do processo"}
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
                {flowchartFiles.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-sm font-medium">Fluxogramas</p>
                    {flowchartFiles.map((ff, i) => (
                      <div key={i} className="space-y-2">
                        {/\.(png|jpe?g|gif|webp)$/i.test(ff.url) ? (
                          <img
                            src={ff.url}
                            alt={`Fluxograma ${i + 1} de ${officeProcess.name}`}
                            className="max-h-48 w-full rounded-lg border object-contain"
                          />
                        ) : null}
                        <a
                          href={ff.url}
                          download
                          className={cn(buttonVariants({ variant: "outline" }), "w-full")}
                        >
                          Baixar fluxograma {flowchartFiles.length > 1 ? i + 1 : ""}
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Nenhum fluxograma cadastrado.
                  </p>
                )}

                {templateFiles.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Templates</p>
                    {templateFiles.map((tf, i) => (
                      <a
                        key={i}
                        href={tf.url}
                        target="_blank"
                        rel="noreferrer"
                        download
                        className={cn(buttonVariants(), "w-full block text-center")}
                      >
                        {tf.label || `Baixar template ${templateFiles.length > 1 ? i + 1 : ""}`}
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
          <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            <Card>
              <CardHeader>
                <CardTitle>Anexos do processo</CardTitle>
                <CardDescription>
                  Links e materiais complementares utilizados na gestão do processo.
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
                      <a
                        href={attachment.attachment_url}
                        target="_blank"
                        rel="noreferrer"
                        download
                        className={buttonVariants({ variant: "outline", size: "sm" })}
                      >
                        Baixar
                      </a>
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
                      <p className="text-sm font-medium">{event.description}</p>
                      <Badge variant="outline">{event.event_type}</Badge>
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
