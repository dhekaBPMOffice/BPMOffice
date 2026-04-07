"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { buildChecklistInput } from "@/lib/processes";
import type { BaseProcess, ProcessFlowchartFile, ProcessTemplateFile } from "@/types/database";
import { deleteBaseProcess, updateBaseProcess, uploadBaseProcessFile } from "../actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageLayout } from "@/components/layout/page-layout";
import {
  ClipboardList,
  ExternalLink,
  Pencil,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import { fileNameFromUrl } from "@/lib/process-file-display";

function fileExt(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot + 1).toUpperCase() : "";
}

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getTemplateFiles(p: BaseProcess | null): ProcessTemplateFile[] {
  if (!p) return [];
  const arr = p.template_files;
  if (Array.isArray(arr) && arr.length > 0) return arr;
  if (p.template_url) {
    return [{ url: p.template_url, label: p.template_label ?? undefined }];
  }
  return [];
}

function getFlowchartFiles(p: BaseProcess | null): ProcessFlowchartFile[] {
  if (!p) return [];
  const arr = p.flowchart_files;
  if (Array.isArray(arr) && arr.length > 0) return arr;
  if (p.flowchart_image_url) return [{ url: p.flowchart_image_url }];
  return [];
}

function DropZone({
  accept,
  label,
  onFiles,
  disabled,
}: {
  accept?: string;
  label: string;
  onFiles: (files: File[]) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (disabled) return;
      const files = Array.from(e.dataTransfer.files);
      if (files.length) onFiles(files);
    },
    [disabled, onFiles]
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={cn(
        "flex cursor-pointer items-center justify-center gap-3 rounded-lg border-2 border-dashed px-4 py-5 text-center transition-colors",
        dragOver
          ? "border-[var(--identity-primary)] bg-[var(--identity-primary)]/5"
          : "border-border/60 hover:border-border hover:bg-muted/30",
        disabled && "pointer-events-none opacity-50"
      )}
    >
      <Upload className="h-5 w-5 shrink-0 text-muted-foreground" />
      <span className="text-sm text-muted-foreground">{label}</span>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const files = e.target.files;
          if (files?.length) onFiles(Array.from(files));
          e.target.value = "";
        }}
      />
    </div>
  );
}

function FileExtBadge({ name }: { name: string }) {
  const ext = fileExt(name);
  if (!ext) return null;
  return (
    <span className="inline-flex h-6 shrink-0 items-center rounded bg-muted px-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
      {ext}
    </span>
  );
}

/** Mensagem ao tentar sair com alterações não guardadas (navegação interna e fecho do separador). */
const MSG_SAIR_SEM_SALVAR =
  "Existem alterações não guardadas. Deseja sair sem salvar?";

export default function AdminProcessoDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const processId = params.id;

  const [process, setProcess] = useState<BaseProcess | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveProgressLabel, setSaveProgressLabel] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [templateFiles, setTemplateFiles] = useState<ProcessTemplateFile[]>([]);
  const [flowchartFiles, setFlowchartFiles] = useState<ProcessFlowchartFile[]>([]);
  const [newTemplateFiles, setNewTemplateFiles] = useState<File[]>([]);
  const [newTemplateLabels, setNewTemplateLabels] = useState<string[]>([]);
  const [newFlowchartFiles, setNewFlowchartFiles] = useState<File[]>([]);
  const [editingLabelIndex, setEditingLabelIndex] = useState<number | null>(null);
  const [checklist, setChecklist] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!saveSuccess) return;
    const t = window.setTimeout(() => setSaveSuccess(false), 5000);
    return () => window.clearTimeout(t);
  }, [saveSuccess]);

  async function load() {
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data, error: queryError } = await supabase
      .from("base_processes")
      .select("*")
      .eq("id", processId)
      .single();

    if (queryError || !data) {
      setError(queryError?.message ?? "Processo não encontrado.");
      setProcess(null);
      setLoading(false);
      return;
    }

    const baseProcess = data as BaseProcess;
    setProcess(baseProcess);
    setName(baseProcess.name);
    setCategory(baseProcess.category ?? "");
    setDescription(baseProcess.description ?? "");
    setTemplateFiles(getTemplateFiles(baseProcess));
    setFlowchartFiles(getFlowchartFiles(baseProcess));
    setNewTemplateFiles([]);
    setNewTemplateLabels([]);
    setNewFlowchartFiles([]);
    setEditingLabelIndex(null);
    setChecklist(buildChecklistInput(baseProcess.management_checklist));
    setSortOrder(String(baseProcess.sort_order ?? 0));
    setIsActive(baseProcess.is_active);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [processId]);

  const checklistCount = useMemo(
    () => checklist.split("\n").map((item) => item.trim()).filter(Boolean).length,
    [checklist]
  );

  const formSnapshot = useMemo(
    () =>
      JSON.stringify({
        name,
        category,
        description,
        templateFiles,
        flowchartFiles,
        newTemplateFiles: newTemplateFiles.map((f) => ({
          n: f.name,
          s: f.size,
          lm: f.lastModified,
        })),
        newTemplateLabels,
        newFlowchartFiles: newFlowchartFiles.map((f) => ({
          n: f.name,
          s: f.size,
          lm: f.lastModified,
        })),
        checklist,
        sortOrder,
        isActive,
      }),
    [
      name,
      category,
      description,
      templateFiles,
      flowchartFiles,
      newTemplateFiles,
      newTemplateLabels,
      newFlowchartFiles,
      checklist,
      sortOrder,
      isActive,
    ]
  );

  const [baselineSnapshot, setBaselineSnapshot] = useState<string | null>(null);
  const prevLoadingRef = useRef(true);

  useEffect(() => {
    setBaselineSnapshot(null);
  }, [processId]);

  useEffect(() => {
    if (prevLoadingRef.current && !loading) {
      setBaselineSnapshot(formSnapshot);
    }
    prevLoadingRef.current = loading;
  }, [loading, formSnapshot]);

  const isDirty = useMemo(
    () =>
      baselineSnapshot !== null &&
      formSnapshot !== baselineSnapshot &&
      !loading,
    [baselineSnapshot, formSnapshot, loading]
  );

  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  function updateTemplateLabel(index: number, label: string) {
    setTemplateFiles((prev) =>
      prev.map((tf, i) => (i === index ? { ...tf, label } : tf))
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveProgressLabel(null);
    setError(null);
    setSaveSuccess(false);

    const normalizedTemplates = templateFiles.map((tf) => ({
      url: tf.url,
      label: tf.label?.trim() || fileNameFromUrl(tf.url),
    }));

    const finalTemplates = [...normalizedTemplates];

    const templateUploads = newTemplateFiles.filter((f) => f?.size);
    const flowchartUploads = newFlowchartFiles.filter((f) => f?.size);
    const totalUploads = templateUploads.length + flowchartUploads.length;
    let uploadDone = 0;

    for (let i = 0; i < newTemplateFiles.length; i++) {
      const file = newTemplateFiles[i];
      if (!file?.size) continue;
      uploadDone += 1;
      setSaveProgressLabel(`Enviando ${uploadDone} de ${totalUploads}…`);
      const formData = new FormData();
      formData.set("file", file);
      formData.set("baseProcessId", processId);
      formData.set("kind", "template");
      const upload = await uploadBaseProcessFile(formData);
      if ("error" in upload) {
        setError(upload.error ?? "Erro no upload.");
        setSaving(false);
        setSaveProgressLabel(null);
        return;
      }
      finalTemplates.push({
        url: upload.url,
        label: newTemplateLabels[i]?.trim() || file.name,
      });
    }

    const finalFlowcharts = [...flowchartFiles];
    for (const file of newFlowchartFiles) {
      if (!file?.size) continue;
      uploadDone += 1;
      setSaveProgressLabel(`Enviando ${uploadDone} de ${totalUploads}…`);
      const formData = new FormData();
      formData.set("file", file);
      formData.set("baseProcessId", processId);
      formData.set("kind", "flowchart");
      const upload = await uploadBaseProcessFile(formData);
      if ("error" in upload) {
        setError(upload.error ?? "Erro no upload.");
        setSaving(false);
        setSaveProgressLabel(null);
        return;
      }
      finalFlowcharts.push({ url: upload.url });
    }

    setSaveProgressLabel("Gravando…");
    const result = await updateBaseProcess(processId, {
      name,
      category,
      description,
      templateFiles: finalTemplates,
      flowchartFiles: finalFlowcharts,
      managementChecklist: checklist.split("\n"),
      sortOrder: Number(sortOrder) || 0,
      isActive,
    });

    if ("error" in result && result.error) {
      setError(result.error);
      setSaving(false);
      setSaveProgressLabel(null);
      return;
    }

    await load();
    setSaveProgressLabel(null);
    setSaving(false);
    setSaveSuccess(true);
  }

  function removeTemplateFile(index: number) {
    setTemplateFiles((prev) => prev.filter((_, i) => i !== index));
    if (editingLabelIndex === index) setEditingLabelIndex(null);
  }

  function removeFlowchartFile(index: number) {
    setFlowchartFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function removeNewTemplateFile(index: number) {
    setNewTemplateFiles((prev) => prev.filter((_, i) => i !== index));
    setNewTemplateLabels((prev) => prev.filter((_, i) => i !== index));
  }

  function removeNewFlowchartFile(index: number) {
    setNewFlowchartFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function addTemplateFiles(files: File[]) {
    setNewTemplateFiles((prev) => [...prev, ...files]);
    setNewTemplateLabels((prev) => [...prev, ...files.map(() => "")]);
  }

  function addFlowchartFiles(files: File[]) {
    setNewFlowchartFiles((prev) => [...prev, ...files]);
  }

  async function handleDelete() {
    if (!confirm("Excluir este processo do catálogo?")) return;

    const result = await deleteBaseProcess(processId);
    if ("error" in result && result.error) {
      setError(result.error);
      return;
    }

    router.push("/admin/processos");
    router.refresh();
  }

  if (loading) {
    return (
      <PageLayout
        title="Processo"
        description="Carregando configuração do processo."
        iconName="ClipboardList"
        backHref="/admin/processos"
      >
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </PageLayout>
    );
  }

  const totalSavedTemplates = templateFiles.length;
  const totalNewTemplates = newTemplateFiles.length;
  const totalSavedFlowcharts = flowchartFiles.length;
  const totalNewFlowcharts = newFlowchartFiles.length;

  return (
    <PageLayout
      title={process?.name ?? "Processo"}
      description="Edite o catálogo mestre e o conteúdo que será exibido ao líder."
      iconName="ClipboardList"
      backHref="/admin/processos"
      backLabel="Voltar para processos"
      backLeaveConfirm={
        isDirty ? { active: true, message: MSG_SAIR_SEM_SALVAR } : undefined
      }
      actions={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Link
            href="/admin/processos"
            className={buttonVariants({ variant: "outline" })}
            onClick={(e) => {
              if (isDirty && !window.confirm(MSG_SAIR_SEM_SALVAR)) {
                e.preventDefault();
              }
            }}
          >
            Voltar
          </Link>
          <Button variant="outline" onClick={handleDelete}>
            Excluir
          </Button>
          <Button type="submit" form="admin-processo-form" disabled={saving}>
            {saving ? saveProgressLabel || "Salvando…" : "Salvar alterações"}
          </Button>
        </div>
      }
    >
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {saveSuccess && !error && (
        <div className="rounded-md border border-[var(--identity-status-success)]/30 bg-[var(--identity-status-success)]/10 p-3 text-sm text-[var(--identity-status-success)]">
          Alterações guardadas com sucesso.
        </div>
      )}

      <form id="admin-processo-form" onSubmit={handleSave}>
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr] lg:items-start">
          <div className="min-w-0 space-y-6">
            <Card>
              <CardHeader className="space-y-1">
                <CardTitle>Identificação</CardTitle>
                <CardDescription>
                  Nome, categoria e descrição usados no catálogo e na página de gestão do processo.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Categoria</Label>
                    <Input id="category" value={category} onChange={(e) => setCategory(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>

            {/* ── Templates ── */}
            <Card>
              <CardHeader className="space-y-1">
                <div className="flex items-center justify-between">
                  <CardTitle>Templates</CardTitle>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {totalSavedTemplates + totalNewTemplates} arquivo(s)
                  </span>
                </div>
                <CardDescription>
                  Documentos de referência disponíveis ao líder: PDF, planilhas, documentos, imagens, etc.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {totalSavedTemplates + totalNewTemplates > 0 && (
                  <div className="divide-y rounded-lg border">
                    {templateFiles.map((tf, i) => {
                      const fname = fileNameFromUrl(tf.url);
                      const isEditing = editingLabelIndex === i;
                      const displayName = tf.label || fname;
                      return (
                        <div
                          key={`t-${i}-${tf.url}`}
                          className="group flex items-center gap-3 px-3 py-2.5"
                        >
                          <FileExtBadge name={fname} />
                          <div className="min-w-0 flex-1">
                            {isEditing ? (
                              <Input
                                autoFocus
                                value={tf.label ?? ""}
                                placeholder={fname}
                                onChange={(e) => updateTemplateLabel(i, e.target.value)}
                                onBlur={() => setEditingLabelIndex(null)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === "Escape") setEditingLabelIndex(null);
                                }}
                                className="h-7 text-sm"
                                aria-label={`Rótulo do template ${i + 1}`}
                              />
                            ) : (
                              <button
                                type="button"
                                className="flex w-full items-center gap-1.5 text-left"
                                onClick={() => setEditingLabelIndex(i)}
                                title="Clique para editar o rótulo"
                              >
                                <span className="truncate text-sm font-medium">{displayName}</span>
                                <Pencil className="h-3 w-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                              </button>
                            )}
                            {tf.label && tf.label !== fname && (
                              <p className="truncate text-xs text-muted-foreground" title={fname}>
                                {fname}
                              </p>
                            )}
                          </div>
                          <a
                            href={tf.url}
                            target="_blank"
                            rel="noreferrer"
                            title="Abrir ficheiro"
                            className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                          <button
                            type="button"
                            onClick={() => removeTemplateFile(i)}
                            className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            title="Remover"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })}
                    {newTemplateFiles.map((file, i) => (
                      <div
                        key={`n-${i}-${file.name}-${file.size}`}
                        className="flex items-center gap-3 bg-amber-500/5 px-3 py-2.5"
                      >
                        <FileExtBadge name={file.name} />
                        <div className="min-w-0 flex-1">
                          <Input
                            value={newTemplateLabels[i] ?? ""}
                            placeholder={file.name}
                            onChange={(e) =>
                              setNewTemplateLabels((p) => {
                                const next = [...p];
                                next[i] = e.target.value;
                                return next;
                              })
                            }
                            className="h-7 text-sm"
                            aria-label={`Rótulo para ${file.name}`}
                          />
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {file.name} · {humanSize(file.size)} · <span className="text-amber-600 dark:text-amber-400">novo</span>
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeNewTemplateFile(i)}
                          className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          title="Remover"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <DropZone
                  accept="*/*"
                  label="Arraste ficheiros ou clique para adicionar templates"
                  onFiles={addTemplateFiles}
                  disabled={saving}
                />
              </CardContent>
            </Card>

            {/* ── Fluxogramas ── */}
            <Card>
              <CardHeader className="space-y-1">
                <div className="flex items-center justify-between">
                  <CardTitle>Fluxogramas</CardTitle>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {totalSavedFlowcharts + totalNewFlowcharts} arquivo(s)
                  </span>
                </div>
                <CardDescription>
                  Diagramas do processo (.png, .bpm, .bpmn, .bpms).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {totalSavedFlowcharts + totalNewFlowcharts > 0 && (
                  <div className="divide-y rounded-lg border">
                    {flowchartFiles.map((ff, i) => {
                      const fname = fileNameFromUrl(ff.url);
                      const isImg = /\.(png|jpe?g|gif|webp)$/i.test(ff.url);
                      return (
                        <div
                          key={`f-${i}-${ff.url}`}
                          className="group flex items-center gap-3 px-3 py-2.5"
                        >
                          {isImg ? (
                            <img
                              src={ff.url}
                              alt=""
                              className="h-9 w-12 shrink-0 rounded border object-contain bg-muted/30"
                            />
                          ) : (
                            <FileExtBadge name={fname} />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium" title={fname}>
                              {fname}
                            </p>
                          </div>
                          <a
                            href={ff.url}
                            target="_blank"
                            rel="noreferrer"
                            title="Abrir ficheiro"
                            className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                          <button
                            type="button"
                            onClick={() => removeFlowchartFile(i)}
                            className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            title="Remover"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })}
                    {newFlowchartFiles.map((file, i) => (
                      <div
                        key={`nf-${i}-${file.name}-${file.size}`}
                        className="flex items-center gap-3 bg-amber-500/5 px-3 py-2.5"
                      >
                        <FileExtBadge name={file.name} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {humanSize(file.size)} · <span className="text-amber-600 dark:text-amber-400">novo</span>
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeNewFlowchartFile(i)}
                          className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          title="Remover"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <DropZone
                  accept=".png,.bpm,.bpmn,.bpms"
                  label="Arraste ficheiros ou clique para adicionar fluxogramas"
                  onFiles={addFlowchartFiles}
                  disabled={saving}
                />
              </CardContent>
            </Card>

            {/* ── Checklist e publicação ── */}
            <Card>
              <CardHeader className="space-y-1">
                <CardTitle>Checklist e publicação</CardTitle>
                <CardDescription>
                  Lista sugerida para o líder e visibilidade no catálogo.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="checklist">Checklist padrão</Label>
                  <Textarea
                    id="checklist"
                    value={checklist}
                    onChange={(e) => setChecklist(e.target.value)}
                    rows={7}
                  />
                </div>
                <div className="grid gap-6 sm:grid-cols-2 sm:items-end">
                  <div className="space-y-2">
                    <Label htmlFor="sortOrder">Ordem de exibição</Label>
                    <Input
                      id="sortOrder"
                      type="number"
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-3 rounded-lg border p-4 sm:pb-[calc(0.5rem+2px)]">
                    <Switch checked={isActive} onCheckedChange={setIsActive} id="process-active" />
                    <Label htmlFor="process-active" className="cursor-pointer leading-snug">
                      Processo ativo no catálogo
                    </Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Sidebar Resumo ── */}
          <Card className="lg:sticky lg:top-4 lg:self-start">
            <CardHeader>
              <CardTitle>Resumo</CardTitle>
              <CardDescription>Visão rápida do material disponível para o líder.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant={isActive ? "success" : "secondary"}>
                  {isActive ? "Ativo" : "Inativo"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Checklist padrão</span>
                <span className="text-sm font-medium">{checklistCount} itens</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Templates</span>
                <span className="text-sm font-medium">{totalSavedTemplates + totalNewTemplates}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Fluxogramas</span>
                <span className="text-sm font-medium">{totalSavedFlowcharts + totalNewFlowcharts}</span>
              </div>
              {flowchartFiles.slice(0, 2).map((ff, i) =>
                /\.(png|jpe?g|gif|webp)$/i.test(ff.url) ? (
                  <img
                    key={i}
                    src={ff.url}
                    alt=""
                    className="max-h-24 w-full rounded border object-contain"
                  />
                ) : null
              )}
            </CardContent>
          </Card>
        </div>
      </form>
    </PageLayout>
  );
}
