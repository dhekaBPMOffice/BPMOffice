"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { buildChecklistInput } from "@/lib/processes";
import type { BaseProcess, ProcessFlowchartFile, ProcessTemplateFile } from "@/types/database";
import { createBaseProcess, deleteBaseProcess, updateBaseProcess, uploadBaseProcessFile } from "./actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageLayout } from "@/components/layout/page-layout";
import { ClipboardList, Plus, Trash2 } from "lucide-react";

export default function AdminProcessosPage() {
  const [processes, setProcesses] = useState<BaseProcess[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [templateFilesToAdd, setTemplateFilesToAdd] = useState<{ file: File; label: string }[]>([]);
  const [flowchartFilesToAdd, setFlowchartFilesToAdd] = useState<File[]>([]);
  const [checklist, setChecklist] = useState("");
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data, error: queryError } = await supabase
      .from("base_processes")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (queryError) {
      setError(queryError.message);
    } else {
      setProcesses((data ?? []) as BaseProcess[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreating(true);

    const result = await createBaseProcess({
      name,
      category,
      description,
      templateFiles: [],
      flowchartFiles: [],
      managementChecklist: checklist.split("\n"),
      isActive: true,
    });

    if ("error" in result && result.error) {
      setError(result.error);
      setCreating(false);
      return;
    }

    const newId = "id" in result ? result.id : null;
    const finalTemplates: { url: string; label?: string }[] = [];
    const finalFlowcharts: { url: string }[] = [];

    if (newId) {
      for (const { file, label } of templateFilesToAdd) {
        if (!file?.size) continue;
        const formData = new FormData();
        formData.set("file", file);
        formData.set("baseProcessId", newId);
        formData.set("kind", "template");
        const up = await uploadBaseProcessFile(formData);
        if ("url" in up) finalTemplates.push({ url: up.url, label: label.trim() || file.name });
      }
      for (const file of flowchartFilesToAdd) {
        if (!file?.size) continue;
        const formData = new FormData();
        formData.set("file", file);
        formData.set("baseProcessId", newId);
        formData.set("kind", "flowchart");
        const up = await uploadBaseProcessFile(formData);
        if ("url" in up) finalFlowcharts.push({ url: up.url });
      }
      if (finalTemplates.length > 0 || finalFlowcharts.length > 0) {
        await updateBaseProcess(newId, {
          name,
          category,
          description,
          templateFiles: finalTemplates,
          flowchartFiles: finalFlowcharts,
          managementChecklist: checklist.split("\n"),
          sortOrder: 0,
          isActive: true,
        });
      }
    }

    setName("");
    setCategory("");
    setDescription("");
    setTemplateFilesToAdd([]);
    setFlowchartFilesToAdd([]);
    setChecklist("");
    setShowNew(false);
    setCreating(false);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este processo do catálogo?")) return;

    setError(null);
    const result = await deleteBaseProcess(id);
    if ("error" in result && result.error) {
      setError(result.error);
      return;
    }

    load();
  }

  return (
    <PageLayout
      title="Catálogo de Processos"
      description="Cadastre os processos padrão que poderão ser atribuídos aos escritórios."
      icon={ClipboardList}
      actions={
        <Button onClick={() => setShowNew((current) => !current)}>
          <Plus className="h-4 w-4" />
          Novo Processo
        </Button>
      }
    >
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {showNew && (
        <Card>
          <CardHeader>
            <CardTitle>Novo processo padrão</CardTitle>
            <CardDescription>
              Cadastre o processo com descrição, template, fluxograma e checklist sugerido.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Gestão de Portfólio de Processos"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <Input
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Ex: Governança"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Explique o objetivo do processo e quando ele deve ser utilizado."
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Arquivos de template</Label>
                <p className="text-xs text-muted-foreground">
                  Aceita todos os formatos: PDF, imagens, planilhas, documentos, etc. Adicione 1 ou mais.
                </p>
                {templateFilesToAdd.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg border p-2">
                    <Input
                      placeholder="Rótulo (opcional)"
                      value={item.label}
                      onChange={(e) =>
                        setTemplateFilesToAdd((prev) =>
                          prev.map((x, j) => (j === i ? { ...x, label: e.target.value } : x))
                        )
                      }
                      className="flex-1"
                    />
                    <span className="text-xs truncate max-w-[140px]">{item.file.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setTemplateFilesToAdd((prev) => prev.filter((_, j) => j !== i))}
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
                    setTemplateFilesToAdd((prev) => [
                      ...prev,
                      ...Array.from(files).map((file) => ({ file, label: "" })),
                    ]);
                    e.target.value = "";
                  }}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Arquivos do fluxograma</Label>
                <p className="text-xs text-muted-foreground">
                  Apenas PNG ou BPM (.png, .bpm, .bpmn, .bpms). Adicione 1 ou mais.
                </p>
                {flowchartFilesToAdd.map((file, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg border p-2">
                    <span className="text-sm truncate flex-1">{file.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setFlowchartFilesToAdd((prev) => prev.filter((_, j) => j !== i))}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                <Input
                  type="file"
                  multiple
                  accept=".png,.bpm,.bpmn,.bpms"
                  onChange={(e) => {
                    const files = e.target.files;
                    if (!files?.length) return;
                    setFlowchartFilesToAdd((prev) => [...prev, ...Array.from(files)]);
                    e.target.value = "";
                  }}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="checklist">Checklist sugerido</Label>
                <Textarea
                  id="checklist"
                  value={checklist}
                  onChange={(e) => setChecklist(e.target.value)}
                  rows={5}
                  placeholder={"Uma ação por linha\nEx: Definir responsável\nEx: Publicar procedimento"}
                />
              </div>
              <div className="flex gap-2 md:col-span-2">
                <Button type="submit" disabled={creating}>
                  {creating ? "Criando..." : "Criar processo"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowNew(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Processos cadastrados</CardTitle>
          <CardDescription>
            Clique em um processo para editar seus detalhes e a configuração operacional.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : processes.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="Nenhum processo cadastrado"
              description="Crie o primeiro processo padrão para começar a estruturar o onboarding dos escritórios."
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {processes.map((process) => (
                <Card key={process.id} className="border border-border/60">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-base">{process.name}</CardTitle>
                        <CardDescription>
                          {process.category || "Sem categoria"}
                        </CardDescription>
                      </div>
                      <Badge variant={process.is_active ? "success" : "secondary"}>
                        {process.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="line-clamp-3 text-sm text-muted-foreground">
                      {process.description || "Sem descrição cadastrada."}
                    </p>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p>Checklist: {buildChecklistInput(process.management_checklist).split("\n").filter(Boolean).length}</p>
                      <p>Template: {Array.isArray(process.template_files) && process.template_files.length > 0
                        ? `${process.template_files.length} arquivo(s)` : process.template_url
                        ? "1 arquivo" : "Não informado"}</p>
                    </div>
                    <div className="flex gap-2">
                      <Link
                        href={`/admin/processos/${process.id}`}
                        className={buttonVariants({ size: "sm" })}
                      >
                        Abrir
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(process.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </PageLayout>
  );
}
