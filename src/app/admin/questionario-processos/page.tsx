"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { ProcessQuestionnaire } from "@/types/database";
import { createQuestionnaire, deleteQuestionnaire, setActiveQuestionnaire } from "./actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageLayout } from "@/components/layout/page-layout";
import { ClipboardList, Plus, Rocket, Trash2 } from "lucide-react";

export default function QuestionarioProcessosPage() {
  const [items, setItems] = useState<ProcessQuestionnaire[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  async function load() {
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data, error: queryError } = await supabase
      .from("process_questionnaires")
      .select("*")
      .order("version", { ascending: false });

    if (queryError) {
      setError(queryError.message);
    } else {
      setItems((data ?? []) as ProcessQuestionnaire[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const result = await createQuestionnaire(title, description);
    if ("error" in result && result.error) {
      setError(result.error);
      return;
    }

    setTitle("");
    setDescription("");
    setShowNew(false);
    load();
  }

  async function handleActivate(id: string) {
    setError(null);
    const result = await setActiveQuestionnaire(id);
    if ("error" in result && result.error) {
      setError(result.error);
      return;
    }
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este questionário?")) return;

    const result = await deleteQuestionnaire(id);
    if ("error" in result && result.error) {
      setError(result.error);
      return;
    }
    load();
  }

  return (
    <PageLayout
      title="Questionário de Ativação"
      description="Monte o questionário que definirá automaticamente os processos de cada escritório."
      icon={ClipboardList}
      actions={
        <Button onClick={() => setShowNew((current) => !current)}>
          <Plus className="h-4 w-4" />
          Novo Questionário
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
            <CardTitle>Novo questionário</CardTitle>
            <CardDescription>
              Crie uma nova versão do questionário para evoluir a lógica de ativação.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Diagnóstico inicial do escritório"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Explique o objetivo desta versão do questionário."
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit">Criar questionário</Button>
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
          <CardTitle>Versões cadastradas</CardTitle>
          <CardDescription>
            Mantenha apenas uma versão ativa por vez para controlar a jornada do primeiro acesso.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : items.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="Nenhum questionário cadastrado"
              description="Crie a primeira versão e vincule processos às respostas."
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {items.map((item) => (
                <Card key={item.id} className="border border-border/60">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-base">{item.title}</CardTitle>
                        <CardDescription>Versão {item.version}</CardDescription>
                      </div>
                      <Badge variant={item.is_active ? "success" : "secondary"}>
                        {item.is_active ? "Ativo" : "Rascunho"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="line-clamp-3 text-sm text-muted-foreground">
                      {item.description || "Sem descrição cadastrada."}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/admin/questionario-processos/${item.id}`}
                        className={buttonVariants({ size: "sm" })}
                      >
                        Abrir builder
                      </Link>
                      {!item.is_active && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleActivate(item.id)}
                        >
                          <Rocket className="mr-2 h-4 w-4" />
                          Ativar
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(item.id)}
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
