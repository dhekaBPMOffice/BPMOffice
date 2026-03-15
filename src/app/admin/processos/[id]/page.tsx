"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { buildChecklistInput } from "@/lib/processes";
import type { BaseProcess, ProcessFlowchartFile, ProcessTemplateFile } from "@/types/database";
import { deleteBaseProcess, updateBaseProcess, uploadBaseProcessFile } from "../actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageLayout } from "@/components/layout/page-layout";
import { ClipboardList, Plus, Trash2 } from "lucide-react";

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

export default function AdminProcessoDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const processId = params.id;

  const [process, setProcess] = useState<BaseProcess | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [templateFiles, setTemplateFiles] = useState<ProcessTemplateFile[]>([]);
  const [flowchartFiles, setFlowchartFiles] = useState<ProcessFlowchartFile[]>([]);
  const [newTemplateFiles, setNewTemplateFiles] = useState<File[]>([]);
  const [newTemplateLabels, setNewTemplateLabels] = useState<Record<number, string>>({});
  const [newFlowchartFiles, setNewFlowchartFiles] = useState<File[]>([]);
  const [checklist, setChecklist] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [isActive, setIsActive] = useState(true);

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
    setNewTemplateLabels({});
    setNewFlowchartFiles([]);
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

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const finalTemplates = [...templateFiles];
    for (let i = 0; i < newTemplateFiles.length; i++) {
      const file = newTemplateFiles[i];
      if (!file?.size) continue;
      const formData = new FormData();
      formData.set("file", file);
      formData.set("baseProcessId", processId);
      formData.set("kind", "template");
      const upload = await uploadBaseProcessFile(formData);
      if ("error" in upload) {
        setError(upload.error);
        setSaving(false);
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
      const formData = new FormData();
      formData.set("file", file);
      formData.set("baseProcessId", processId);
      formData.set("kind", "flowchart");
      const upload = await uploadBaseProcessFile(formData);
      if ("error" in upload) {
        setError(upload.error);
        setSaving(false);
        return;
      }
      finalFlowcharts.push({ url: upload.url });
    }

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
      return;
    }

    await load();
    setSaving(false);
  }

  function removeTemplateFile(index: number) {
    setTemplateFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function removeFlowchartFile(index: number) {
    setFlowchartFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function removeNewTemplateFile(index: number) {
    setNewTemplateFiles((prev) => prev.filter((_, i) => i !== index));
    setNewTemplateLabels((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  }

  function removeNewFlowchartFile(index: number) {
    setNewFlowchartFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function addTemplateFiles(files: FileList | null) {
    if (!files?.length) return;
    const arr = Array.from(files);
    setNewTemplateFiles((prev) => [...prev, ...arr]);
  }

  function addFlowchartFiles(files: FileList | null) {
    if (!files?.length) return;
    setNewFlowchartFiles((prev) => [...prev, ...Array.from(files)]);
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
        icon={ClipboardList}
        backHref="/admin/processos"
      >
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title={process?.name ?? "Processo"}
      description="Edite o catálogo mestre e o conteúdo que será exibido ao líder."
      icon={ClipboardList}
      backHref="/admin/processos"
      backLabel="Voltar para processos"
      actions={
        <div className="flex gap-2">
          <Link href="/admin/processos" className={buttonVariants({ variant: "outline" })}>
            Voltar
          </Link>
          <Button variant="outline" onClick={handleDelete}>
            Excluir
          </Button>
        </div>
      }
    >
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Dados principais</CardTitle>
            <CardDescription>
              Essas informações compõem o catálogo e a página de gestão do processo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <Input id="category" value={category} onChange={(e) => setCategory(e.target.value)} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Arquivos de template</Label>
                <p className="text-xs text-muted-foreground">
                  Aceita todos os formatos: PDF, imagens, planilhas, documentos de texto, etc.
                </p>
                {templateFiles.map((tf, i) => (
                  <div key={`t-${i}`} className="flex items-center gap-2 rounded-lg border p-2">
                    <a href={tf.url} target="_blank" rel="noreferrer" className="text-sm flex-1 truncate">
                      {tf.label || tf.url.split("/").pop()}
                    </a>
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeTemplateFile(i)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                {newTemplateFiles.map((file, i) => (
                  <div key={`n-${i}`} className="flex items-center gap-2 rounded-lg border p-2">
                    <Input
                      placeholder="Rótulo (opcional)"
                      value={newTemplateLabels[i] ?? ""}
                      onChange={(e) => setNewTemplateLabels((p) => ({ ...p, [i]: e.target.value }))}
                      className="flex-1"
                    />
                    <span className="text-xs text-muted-foreground truncate max-w-[120px]">{file.name}</span>
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeNewTemplateFile(i)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <input
                    id="templateFilesInput"
                    type="file"
                    multiple
                    accept="*/*"
                    className="hidden"
                    onChange={(e) => {
                      addTemplateFiles(e.target.files);
                      e.target.value = "";
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById("templateFilesInput")?.click()}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar arquivos
                  </Button>
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Arquivos do fluxograma</Label>
                <p className="text-xs text-muted-foreground">
                  Apenas PNG ou BPM (.png, .bpm, .bpmn, .bpms).
                </p>
                {flowchartFiles.map((ff, i) => (
                  <div key={`f-${i}`} className="flex items-center gap-2 rounded-lg border p-2">
                    {/\.(png|jpe?g|gif|webp)$/i.test(ff.url) ? (
                      <img src={ff.url} alt={`Fluxograma ${i + 1}`} className="h-12 w-auto object-contain rounded" />
                    ) : null}
                    <a href={ff.url} target="_blank" rel="noreferrer" className="text-sm flex-1 truncate">
                      {ff.url.split("/").pop()}
                    </a>
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeFlowchartFile(i)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                {newFlowchartFiles.map((file, i) => (
                  <div key={`nf-${i}`} className="flex items-center gap-2 rounded-lg border p-2">
                    <span className="text-sm truncate flex-1">{file.name}</span>
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeNewFlowchartFile(i)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                <Input
                  type="file"
                  multiple
                  accept=".png,.bpm,.bpmn,.bpms"
                  onChange={(e) => addFlowchartFiles(e.target.files)}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="checklist">Checklist padrão</Label>
                <Textarea
                  id="checklist"
                  value={checklist}
                  onChange={(e) => setChecklist(e.target.value)}
                  rows={7}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sortOrder">Ordem de exibição</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-3 pt-8">
                <Switch checked={isActive} onCheckedChange={setIsActive} />
                <Label>Processo ativo no catálogo</Label>
              </div>
              <div className="flex gap-2 md:col-span-2">
                <Button type="submit" disabled={saving}>
                  {saving ? "Salvando..." : "Salvar alterações"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
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
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Templates ({templateFiles.length + newTemplateFiles.length})</p>
              {templateFiles.length + newTemplateFiles.length === 0 ? (
                <p className="text-sm">Nenhum arquivo.</p>
              ) : (
                <p className="text-sm">{templateFiles.length + newTemplateFiles.length} arquivo(s)</p>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Fluxogramas ({flowchartFiles.length + newFlowchartFiles.length})</p>
              {flowchartFiles.length + newFlowchartFiles.length === 0 ? (
                <p className="text-sm">Nenhum arquivo.</p>
              ) : (
                flowchartFiles.slice(0, 2).map((ff, i) =>
                  /\.(png|jpe?g|gif|webp)$/i.test(ff.url) ? (
                    <img key={i} src={ff.url} alt="" className="max-h-24 w-full object-contain rounded border" />
                  ) : null
                )
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
