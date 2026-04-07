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
import { Briefcase, LayoutGrid, List, Plus, Pencil, Trash2 } from "lucide-react";
import {
  createService,
  updateService,
  deleteService,
} from "./actions";

interface BaseService {
  id: string;
  name: string;
  description: string | null;
  methodology: string | null;
  deliverables: string | null;
  is_active: boolean;
}

export default function ServicosPage() {
  const [services, setServices] = useState<BaseService[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newMethodology, setNewMethodology] = useState("");
  const [newDeliverables, setNewDeliverables] = useState("");
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editMethodology, setEditMethodology] = useState("");
  const [editDeliverables, setEditDeliverables] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [aba, setAba] = useState<"lista" | "arquivados">("lista");
  const [visualizacao, setVisualizacao] = useState<"lista" | "card">("lista");

  async function load() {
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("base_services")
      .select("id, name, description, methodology, deliverables, is_active")
      .order("name");

    if (err) {
      setError(err.message);
    } else {
      setServices(data ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const result = await createService(
      newName,
      newDescription,
      newMethodology,
      newDeliverables
    );
    if (result?.error) {
      setError(result.error);
      return;
    }
    setNewName("");
    setNewDescription("");
    setNewMethodology("");
    setNewDeliverables("");
    setShowNew(false);
    load();
  }

  async function handleUpdate(id: string, e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const result = await updateService(
      id,
      editName,
      editDescription,
      editMethodology,
      editDeliverables,
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
    if (!confirm("Excluir este serviço?")) return;
    setError(null);
    const result = await deleteService(id);
    if (result?.error) {
      setError(result.error);
      return;
    }
    load();
  }

  function startEdit(s: BaseService) {
    setEditingId(s.id);
    setEditName(s.name);
    setEditDescription(s.description ?? "");
    setEditMethodology(s.methodology ?? "");
    setEditDeliverables(s.deliverables ?? "");
    setEditActive(s.is_active);
  }

  if (loading) {
    return (
      <PageLayout title="Catálogo de Serviços" description="Gerencie o catálogo base de serviços da plataforma." iconName="Briefcase">
        <p className="text-muted-foreground">Carregando...</p>
      </PageLayout>
    );
  }

  const servicosAtivos = services.filter((s) => s.is_active);
  const servicosArquivados = services.filter((s) => !s.is_active);
  const servicosVisiveis = aba === "arquivados" ? servicosArquivados : servicosAtivos;

  return (
    <PageLayout
      title="Catálogo de Serviços"
      description="Gerencie o catálogo base de serviços da plataforma."
      iconName="Briefcase"
      actions={
        <Button onClick={() => setShowNew(!showNew)}>
          <Plus className="h-4 w-4" />
          Novo Serviço
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
            <CardTitle>Novo Serviço</CardTitle>
            <CardDescription>Adicione um novo serviço ao catálogo.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new_name">Nome</Label>
                <Input
                  id="new_name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: Mapeamento de Processos"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new_description">Descrição</Label>
                <Textarea
                  id="new_description"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Descrição do serviço"
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new_methodology">Metodologia</Label>
                <Input
                  id="new_methodology"
                  value={newMethodology}
                  onChange={(e) => setNewMethodology(e.target.value)}
                  placeholder="Metodologia utilizada"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new_deliverables">Entregas</Label>
                <Textarea
                  id="new_deliverables"
                  value={newDeliverables}
                  onChange={(e) => setNewDeliverables(e.target.value)}
                  placeholder="Entregas do serviço"
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
          <CardTitle>Lista de Serviços</CardTitle>
          <CardDescription>
            Serviços cadastrados no catálogo base.
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
                Inativos
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
                  <TableHead>Metodologia</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[120px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {servicosVisiveis.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      {aba === "arquivados" ? "Nenhum serviço arquivado." : "Nenhum serviço ativo."}
                    </TableCell>
                  </TableRow>
                ) : (
                  servicosVisiveis.map((s) =>
                    editingId === s.id ? (
                      <TableRow key={s.id}>
                        <TableCell colSpan={5}>
                          <form
                            onSubmit={(e) => handleUpdate(s.id, e)}
                            className="flex flex-col gap-3 py-2"
                          >
                            <div className="space-y-1">
                              <Label>Nome</Label>
                              <Input
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
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
                            <div className="space-y-1">
                              <Label>Metodologia</Label>
                              <Input
                                value={editMethodology}
                                onChange={(e) => setEditMethodology(e.target.value)}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label>Entregas</Label>
                              <Textarea
                                value={editDeliverables}
                                onChange={(e) => setEditDeliverables(e.target.value)}
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
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell className="text-muted-foreground max-w-[200px] truncate">
                          {s.description || "—"}
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate">
                          {s.methodology || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={s.is_active ? "success" : "secondary"}>
                            {s.is_active ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => startEdit(s)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(s.id)}
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
          ) : servicosVisiveis.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              {aba === "arquivados" ? "Nenhum serviço arquivado." : "Nenhum serviço ativo."}
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {servicosVisiveis.map((s) => (
                <Card key={s.id} className="border border-border/60">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">{s.name}</CardTitle>
                      <Badge variant={s.is_active ? "success" : "secondary"}>
                        {s.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                    <CardDescription>{s.methodology || "Sem metodologia"}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {s.description || "Sem descrição"}
                    </p>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      Entregas: {s.deliverables || "—"}
                    </p>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" onClick={() => startEdit(s)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(s.id)}>
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
