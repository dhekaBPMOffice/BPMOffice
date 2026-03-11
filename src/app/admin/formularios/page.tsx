"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { PageLayout } from "@/components/layout/page-layout";
import { FileText, Plus, Pencil, Trash2 } from "lucide-react";
import { createForm, addQuestion, deleteForm, deleteQuestion } from "./actions";

interface FormQuestion {
  id: string;
  label: string;
  type: string;
  sort_order: number;
}

interface Form {
  id: string;
  title: string;
  description: string | null;
  is_active: boolean;
  form_questions: FormQuestion[];
}

const QUESTION_TYPES = [
  { value: "text", label: "Texto" },
  { value: "select", label: "Seleção" },
  { value: "rating", label: "Avaliação" },
] as const;

export default function FormulariosPage() {
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [addingQuestionFormId, setAddingQuestionFormId] = useState<string | null>(null);
  const [newQuestionLabel, setNewQuestionLabel] = useState("");
  const [newQuestionType, setNewQuestionType] = useState<"text" | "select" | "rating">("text");

  async function load() {
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("forms")
      .select(`
        id,
        title,
        description,
        is_active,
        form_questions (
          id,
          label,
          type,
          sort_order
        )
      `)
      .order("created_at", { ascending: false });

    if (err) {
      setError(err.message);
    } else {
      setForms((data ?? []).map((f) => ({
        ...f,
        form_questions: (f.form_questions ?? []).sort(
          (a: FormQuestion, b: FormQuestion) => a.sort_order - b.sort_order
        ),
      })));
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreateForm(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const result = await createForm(newTitle, newDescription);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setNewTitle("");
    setNewDescription("");
    setShowNew(false);
    load();
  }

  async function handleAddQuestion(formId: string, e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const result = await addQuestion(formId, newQuestionLabel, newQuestionType);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setNewQuestionLabel("");
    setNewQuestionType("text");
    setAddingQuestionFormId(null);
    load();
  }

  async function handleDeleteForm(id: string) {
    if (!confirm("Excluir este formulário e todas as perguntas?")) return;
    setError(null);
    const result = await deleteForm(id);
    if (result?.error) {
      setError(result.error);
      return;
    }
    load();
  }

  async function handleDeleteQuestion(formId: string, questionId: string) {
    if (!confirm("Excluir esta pergunta?")) return;
    setError(null);
    const result = await deleteQuestion(questionId);
    if (result?.error) {
      setError(result.error);
      return;
    }
    load();
  }

  if (loading) {
    return (
      <PageLayout title="Formulários" description="Construtor de formulários. Crie formulários com perguntas personalizadas." icon={FileText}>
        <p className="text-muted-foreground">Carregando...</p>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Formulários"
      description="Construtor de formulários. Crie formulários com perguntas personalizadas."
      icon={FileText}
      actions={
        <Button onClick={() => setShowNew(!showNew)}>
          <Plus className="h-4 w-4" />
          Novo Formulário
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
            <CardTitle>Novo Formulário</CardTitle>
            <CardDescription>
              Crie um novo formulário com título e descrição.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateForm} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new_title">Título</Label>
                <Input
                  id="new_title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex: Pesquisa de Satisfação"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new_description">Descrição</Label>
                <Textarea
                  id="new_description"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Descrição do formulário"
                  rows={2}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit">Criar</Button>
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
          <CardTitle>Formulários existentes</CardTitle>
          <CardDescription>
            Lista de formulários cadastrados. Adicione perguntas para cada um.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Perguntas</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[180px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {forms.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Nenhum formulário cadastrado.
                  </TableCell>
                </TableRow>
              ) : (
                forms.map((form) => (
                  <React.Fragment key={form.id}>
                    <TableRow>
                      <TableCell className="font-medium">{form.title}</TableCell>
                      <TableCell className="text-muted-foreground max-w-[200px] truncate">
                        {form.description || "—"}
                      </TableCell>
                      <TableCell>{form.form_questions?.length ?? 0}</TableCell>
                      <TableCell>
                        <Badge variant={form.is_active ? "success" : "secondary"}>
                          {form.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setAddingQuestionFormId(
                                addingQuestionFormId === form.id ? null : form.id
                              )
                            }
                          >
                            + Pergunta
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteForm(form.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {addingQuestionFormId === form.id && (
                      <TableRow>
                        <TableCell colSpan={5}>
                          <form
                            onSubmit={(e) => handleAddQuestion(form.id, e)}
                            className="flex flex-wrap gap-3 py-2 items-end"
                          >
                            <div className="space-y-1 min-w-[200px]">
                              <Label>Pergunta</Label>
                              <Input
                                value={newQuestionLabel}
                                onChange={(e) => setNewQuestionLabel(e.target.value)}
                                placeholder="Texto da pergunta"
                                required
                              />
                            </div>
                            <div className="space-y-1 min-w-[120px]">
                              <Label>Tipo</Label>
                              <Select
                                value={newQuestionType}
                                onChange={(e) =>
                                  setNewQuestionType(
                                    e.target.value as "text" | "select" | "rating"
                                  )
                                }
                              >
                                {QUESTION_TYPES.map((t) => (
                                  <option key={t.value} value={t.value}>
                                    {t.label}
                                  </option>
                                ))}
                              </Select>
                            </div>
                            <Button type="submit" size="sm">
                              Adicionar
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setAddingQuestionFormId(null)}
                            >
                              Cancelar
                            </Button>
                          </form>
                        </TableCell>
                      </TableRow>
                    )}
                    {form.form_questions?.map((q) => (
                      <TableRow key={q.id} className="bg-muted/30">
                        <TableCell className="pl-12 text-muted-foreground" colSpan={2}>
                          {q.label}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{q.type}</Badge>
                        </TableCell>
                        <TableCell colSpan={2}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteQuestion(form.id, q.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </React.Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </PageLayout>
  );
}
