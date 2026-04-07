"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageLayout } from "@/components/layout/page-layout";
import { ClipboardList, Plus, Pencil, Rocket } from "lucide-react";
import {
  createForm,
  setActiveForm,
} from "./actions";
import type { ProcessQuestionnaire } from "@/types/database";

export default function FormulariosPage() {
  const [forms, setForms] = useState<ProcessQuestionnaire[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newIsProcessActivation, setNewIsProcessActivation] = useState(false);
  const [newEnableProcessLinking, setNewEnableProcessLinking] = useState(true);

  async function load() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("process_questionnaires")
      .select("*")
      .order("created_at", { ascending: false });

    if (err) {
      setError(err.message);
    } else {
      setForms((data ?? []) as ProcessQuestionnaire[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setError(null);
    setSaving(true);
    const result = await createForm({
      title: newTitle.trim(),
      description: newDescription.trim() || undefined,
      isProcessActivationForm: newIsProcessActivation,
      enableProcessLinking: newEnableProcessLinking,
    });
    if ("error" in result && result.error) {
      setError(result.error);
      setSaving(false);
      return;
    }
    setNewTitle("");
    setNewDescription("");
    setNewIsProcessActivation(false);
    setNewEnableProcessLinking(true);
    setShowNew(false);
    setSaving(false);
    load();
  }

  async function handleActivate(id: string) {
    setError(null);
    const result = await setActiveForm(id);
    if ("error" in result && result.error) {
      setError(result.error);
      return;
    }
    load();
  }

  if (loading) {
    return (
      <PageLayout
        title="Formulários"
        description="Crie e gerencie formulários (incluindo o de ativação de processos)."
        iconName="ClipboardList"
      >
        <p className="text-muted-foreground">Carregando...</p>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Formulários"
      description="Crie e gerencie formulários. Use o de ativação para onboarding de processos ou crie formulários genéricos."
      iconName="ClipboardList"
      actions={
        <Button onClick={() => setShowNew(!showNew)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo formulário
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
            <CardTitle>Novo formulário</CardTitle>
            <CardDescription>
              Defina o tipo de formulário. O de ativação é usado no primeiro acesso do líder.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Título</label>
                  <input
                    className="flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Ex: Ativação de processos"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Descrição</label>
                  <input
                    className="flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Opcional"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newIsProcessActivation}
                    onChange={(e) => setNewIsProcessActivation(e.target.checked)}
                  />
                  <span className="text-sm">Formulário de ativação (primeiro acesso)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newEnableProcessLinking}
                    onChange={(e) => setNewEnableProcessLinking(e.target.checked)}
                  />
                  <span className="text-sm">Vincular processos nas perguntas/alternativas</span>
                </label>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? "Criando..." : "Criar formulário"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowNew(false)}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {forms.length === 0 && !showNew ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={ClipboardList}
              title="Nenhum formulário"
              description="Crie formulários para ativação de processos ou pesquisas genéricas."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {forms.map((form) => (
            <Card key={form.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base truncate">{form.title}</CardTitle>
                  <div className="flex gap-1 shrink-0">
                    {!form.is_active && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleActivate(form.id)}
                      >
                        <Rocket className="h-4 w-4" />
                      </Button>
                    )}
                    <Link
                      href={`/admin/formularios/${form.id}`}
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      <Pencil className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
                <CardDescription className="line-clamp-2">
                  {form.description || "Sem descrição"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex flex-wrap gap-1">
                  <Badge variant={form.is_active ? "success" : "secondary"}>
                    {form.is_active ? "Ativo" : "Rascunho"}
                  </Badge>
                  {form.is_process_activation_form && (
                    <Badge variant="outline">Ativação</Badge>
                  )}
                  {form.enable_process_linking && (
                    <Badge variant="outline">Vínculo processos</Badge>
                  )}
                </div>
                <Link
                  href={`/admin/formularios/${form.id}`}
                  className={buttonVariants({ variant: "secondary", size: "sm" })}
                >
                  Editar formulário
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageLayout>
  );
}
