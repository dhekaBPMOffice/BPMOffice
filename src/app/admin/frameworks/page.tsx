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
import { Layers, LayoutGrid, List, Plus, Pencil, Trash2 } from "lucide-react";
import {
  createFramework,
  updateFramework,
  deleteFramework,
} from "./actions";

interface Framework {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  is_active: boolean;
}

export default function FrameworksPage() {
  const [frameworks, setFrameworks] = useState<Framework[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [aba, setAba] = useState<"lista" | "arquivados">("lista");
  const [visualizacao, setVisualizacao] = useState<"lista" | "card">("lista");

  async function load() {
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("process_frameworks")
      .select("id, name, description, category, is_active")
      .order("name");

    if (err) {
      setError(err.message);
    } else {
      setFrameworks(data ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const result = await createFramework(newName, newDescription, newCategory);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setNewName("");
    setNewDescription("");
    setNewCategory("");
    setShowNew(false);
    load();
  }

  async function handleUpdate(id: string, e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const result = await updateFramework(id, editName, editDescription, editCategory, editActive);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setEditingId(null);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este framework?")) return;
    setError(null);
    const result = await deleteFramework(id);
    if (result?.error) {
      setError(result.error);
      return;
    }
    load();
  }

  function startEdit(f: Framework) {
    setEditingId(f.id);
    setEditName(f.name);
    setEditDescription(f.description ?? "");
    setEditCategory(f.category ?? "");
    setEditActive(f.is_active);
  }

  if (loading) {
    return (
      <PageLayout title="Frameworks de Processo" description="Gerencie os frameworks padrão de processos disponíveis na plataforma." iconName="Layers">
        <p className="text-muted-foreground">Carregando...</p>
      </PageLayout>
    );
  }

  const frameworksAtivos = frameworks.filter((f) => f.is_active);
  const frameworksArquivados = frameworks.filter((f) => !f.is_active);
  const frameworksVisiveis = aba === "arquivados" ? frameworksArquivados : frameworksAtivos;

  return (
    <PageLayout
      title="Frameworks de Processo"
      description="Gerencie os frameworks padrão de processos disponíveis na plataforma."
      iconName="Layers"
      actions={
        <Button onClick={() => setShowNew(!showNew)}>
          <Plus className="h-4 w-4" />
          Novo Framework
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
            <CardTitle>Novo Framework</CardTitle>
            <CardDescription>Adicione um novo framework de processo.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="new_name">Nome</Label>
                  <Input
                    id="new_name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Ex: BPM CBOK"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new_category">Categoria</Label>
                  <Input
                    id="new_category"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="Ex: Metodologia"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new_description">Descrição</Label>
                <Textarea
                  id="new_description"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Descrição do framework"
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
          <CardTitle>Lista de Frameworks</CardTitle>
          <CardDescription>
            Frameworks cadastrados para uso nos processos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="inline-flex rounded-md bg-muted p-1">
              <button
                type="button"
                onClick={() => setAba("lista")}
                className={`rounded-sm px-3 py-1.5 text-sm font-medium transition-colors ${
                  aba === "lista" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Lista
              </button>
              <button
                type="button"
                onClick={() => setAba("arquivados")}
                className={`rounded-sm px-3 py-1.5 text-sm font-medium transition-colors ${
                  aba === "arquivados" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Arquivados
              </button>
            </div>
            <div className="inline-flex rounded-md border border-input bg-background p-1">
              <button
                type="button"
                onClick={() => setVisualizacao("lista")}
                className={`rounded-sm p-2 transition-colors ${
                  visualizacao === "lista" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
                aria-label="Visualização em lista"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setVisualizacao("card")}
                className={`rounded-sm p-2 transition-colors ${
                  visualizacao === "card" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
                aria-label="Visualização em cards"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
          </div>

          {visualizacao === "lista" ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[120px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {frameworksVisiveis.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      {aba === "arquivados" ? "Nenhum framework arquivado." : "Nenhum framework ativo."}
                    </TableCell>
                  </TableRow>
                ) : (
                  frameworksVisiveis.map((f) =>
                    editingId === f.id ? (
                      <TableRow key={f.id}>
                        <TableCell colSpan={5}>
                          <form
                            onSubmit={(e) => handleUpdate(f.id, e)}
                            className="flex flex-col gap-3 py-2"
                          >
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label>Nome</Label>
                                <Input
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  required
                                />
                              </div>
                              <div className="space-y-1">
                                <Label>Categoria</Label>
                                <Input
                                  value={editCategory}
                                  onChange={(e) => setEditCategory(e.target.value)}
                                />
                              </div>
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
                              <Label>Ativo</Label>
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
                      <TableRow key={f.id}>
                        <TableCell className="font-medium">{f.name}</TableCell>
                        <TableCell className="text-muted-foreground max-w-[200px] truncate">
                          {f.description || "—"}
                        </TableCell>
                        <TableCell>{f.category || "—"}</TableCell>
                        <TableCell>
                          <Badge variant={f.is_active ? "success" : "secondary"}>
                            {f.is_active ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => startEdit(f)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(f.id)}
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
          ) : frameworksVisiveis.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              {aba === "arquivados" ? "Nenhum framework arquivado." : "Nenhum framework ativo."}
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {frameworksVisiveis.map((f) => (
                <Card key={f.id} className="border border-border/60">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">{f.name}</CardTitle>
                      <Badge variant={f.is_active ? "success" : "secondary"}>
                        {f.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                    <CardDescription>{f.category || "Sem categoria"}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {f.description || "Sem descrição"}
                    </p>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" onClick={() => startEdit(f)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(f.id)}>
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
