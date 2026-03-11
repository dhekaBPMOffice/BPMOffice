"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
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
import { Switch } from "@/components/ui/switch";
import { PageLayout } from "@/components/layout/page-layout";
import { Target, Plus, Pencil, Trash2 } from "lucide-react";
import {
  createBaseObjective,
  updateBaseObjective,
  deleteBaseObjective,
} from "./actions";

interface BaseOfficeObjective {
  id: string;
  title: string;
  description: string | null;
  is_active: boolean;
}

export default function AdminObjetivosEscritorioPage() {
  const [items, setItems] = useState<BaseOfficeObjective[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editActive, setEditActive] = useState(true);

  async function load() {
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("base_office_objectives")
      .select("id, title, description, is_active")
      .order("title");

    if (err) {
      setError(err.message);
    } else {
      setItems(data ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const result = await createBaseObjective(newTitle, newDescription);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setNewTitle("");
    setNewDescription("");
    setShowNew(false);
    load();
  }

  async function handleUpdate(id: string, e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const result = await updateBaseObjective(
      id,
      editTitle,
      editDescription,
      editActive
    );
    if (result?.error) {
      setError(result.error);
      return;
    }
    setEditingId(null);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta opção de objetivo?")) return;
    setError(null);
    const result = await deleteBaseObjective(id);
    if (result?.error) {
      setError(result.error);
      return;
    }
    load();
  }

  function startEdit(obj: BaseOfficeObjective) {
    setEditingId(obj.id);
    setEditTitle(obj.title);
    setEditDescription(obj.description ?? "");
    setEditActive(obj.is_active);
  }

  if (loading) {
    return (
      <PageLayout title="Opções de Objetivos do Escritório" description="Cadastre opções de objetivos que os escritórios poderão escolher." icon={Target}>
        <p className="text-muted-foreground">Carregando...</p>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Opções de Objetivos do Escritório"
      description="Cadastre opções de objetivos que os escritórios poderão escolher na página Objetivos do Escritório."
      icon={Target}
      actions={
        <Button onClick={() => setShowNew(!showNew)}>
          <Plus className="h-4 w-4" />
          Nova Opção
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
            <CardTitle>Nova opção de objetivo</CardTitle>
            <CardDescription>
              Esta opção aparecerá para os escritórios como sugestão para
              adicionar aos objetivos deles.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new_title">Título</Label>
                <Input
                  id="new_title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex: Reduzir tempo de ciclo dos processos"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new_description">Descrição</Label>
                <Textarea
                  id="new_description"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Descrição opcional da opção"
                  rows={2}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit">Criar</Button>
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

      <Card>
        <CardHeader>
          <CardTitle>Lista de opções</CardTitle>
          <CardDescription>
            Opções ativas aparecem para os escritórios; inativas ficam ocultas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[120px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center text-muted-foreground py-8"
                  >
                    Nenhuma opção cadastrada. Clique em &quot;Nova Opção&quot; para
                    começar.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((obj) =>
                  editingId === obj.id ? (
                    <TableRow key={obj.id}>
                      <TableCell colSpan={4}>
                        <form
                          onSubmit={(e) => handleUpdate(obj.id, e)}
                          className="flex flex-col gap-3 py-2"
                        >
                          <div className="space-y-1">
                            <Label>Título</Label>
                            <Input
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              required
                            />
                          </div>
                          <div className="space-y-1">
                            <Label>Descrição</Label>
                            <Textarea
                              value={editDescription}
                              onChange={(e) => setEditDescription(e.target.value)}
                              rows={2}
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={editActive}
                              onCheckedChange={setEditActive}
                            />
                            <Label>Ativo (visível para escritórios)</Label>
                          </div>
                          <div className="flex gap-2">
                            <Button type="submit" size="sm">
                              Salvar
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingId(null)}
                            >
                              Cancelar
                            </Button>
                          </div>
                        </form>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <TableRow key={obj.id}>
                      <TableCell className="font-medium">{obj.title}</TableCell>
                      <TableCell className="text-muted-foreground max-w-[280px] truncate">
                        {obj.description || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={obj.is_active ? "default" : "secondary"}
                        >
                          {obj.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => startEdit(obj)}
                            aria-label="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(obj.id)}
                            aria-label="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                )
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </PageLayout>
  );
}
