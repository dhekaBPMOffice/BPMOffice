"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Select } from "@/components/ui/select";
import { PageLayout } from "@/components/layout/page-layout";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Target, Plus, Pencil, Trash2, Tags } from "lucide-react";
import {
  createBaseObjective,
  updateBaseObjective,
  deleteBaseObjective,
  createCentralTheme,
  deleteCentralTheme,
} from "./actions";

interface CentralTheme {
  id: string;
  name: string;
}

interface BaseOfficeObjective {
  id: string;
  title: string;
  central_theme_id: string | null;
  central_theme_name: string | null;
  is_active: boolean;
  created_at: string;
}

type SortKey = "title_asc" | "title_desc" | "active_first" | "recent";

export default function AdminObjetivosEscritorioPage() {
  const [themes, setThemes] = useState<CentralTheme[]>([]);
  const [items, setItems] = useState<BaseOfficeObjective[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [newThemeId, setNewThemeId] = useState("");
  const [newActive, setNewActive] = useState(true);
  const [editTitle, setEditTitle] = useState("");
  const [editThemeId, setEditThemeId] = useState("");
  const [editActive, setEditActive] = useState(true);

  const [newThemeName, setNewThemeName] = useState("");
  const [themesDialogOpen, setThemesDialogOpen] = useState(false);
  const [listSearch, setListSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("title_asc");

  async function load() {
    const supabase = createClient();
    const [themesRes, objRes] = await Promise.all([
      supabase.from("central_themes").select("id, name").order("name"),
      supabase
        .from("base_office_objectives")
        .select(
          "id, title, is_active, created_at, central_theme_id, central_themes(name)"
        )
        .order("title"),
    ]);

    if (themesRes.error) {
      setError(themesRes.error.message);
    } else {
      setThemes((themesRes.data ?? []) as CentralTheme[]);
    }

    if (objRes.error) {
      setError(objRes.error.message);
    } else {
      const raw = (objRes.data ?? []) as Record<string, unknown>[];
      setItems(
        raw.map((r) => {
          const ct = r.central_themes;
          const themeRow =
            Array.isArray(ct) && ct[0] && typeof ct[0] === "object"
              ? (ct[0] as { name?: string })
              : ct && typeof ct === "object"
                ? (ct as { name?: string })
                : null;
          return {
            id: String(r.id),
            title: String(r.title),
            central_theme_id: (r.central_theme_id as string | null) ?? null,
            central_theme_name: themeRow?.name ?? null,
            is_active: Boolean(r.is_active),
            created_at: String(r.created_at),
          };
        })
      );
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filteredSorted = useMemo(() => {
    const q = listSearch.trim().toLowerCase();
    let list = items.filter((o) => {
      if (!q) return true;
      return (
        o.title.toLowerCase().includes(q) ||
        (o.central_theme_name?.toLowerCase().includes(q) ?? false)
      );
    });
    list = [...list];
    switch (sortKey) {
      case "title_asc":
        list.sort((a, b) => a.title.localeCompare(b.title, "pt"));
        break;
      case "title_desc":
        list.sort((a, b) => b.title.localeCompare(a.title, "pt"));
        break;
      case "active_first":
        list.sort((a, b) =>
          a.is_active === b.is_active ? 0 : a.is_active ? -1 : 1
        );
        break;
      case "recent":
        list.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        break;
      default:
        break;
    }
    return list;
  }, [items, listSearch, sortKey]);

  async function handleCreateTheme(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const result = await createCentralTheme(newThemeName);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setNewThemeName("");
    load();
  }

  async function handleDeleteTheme(id: string) {
    if (!confirm("Excluir este tema central?")) return;
    setError(null);
    const result = await deleteCentralTheme(id);
    if (result?.error) {
      setError(result.error);
      return;
    }
    load();
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const result = await createBaseObjective(
      newTitle,
      newThemeId,
      newActive
    );
    if (result?.error) {
      setError(result.error);
      return;
    }
    setNewTitle("");
    setNewThemeId("");
    setNewActive(true);
    setShowNew(false);
    load();
  }

  async function handleUpdate(id: string, e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const result = await updateBaseObjective(
      id,
      editTitle,
      editThemeId,
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
    if (!confirm("Excluir este objetivo?")) return;
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
    setEditThemeId(obj.central_theme_id ?? "");
    setEditActive(obj.is_active);
  }

  function openNewForm() {
    setShowNew(true);
    setNewTitle("");
    setNewThemeId("");
    setNewActive(true);
    setError(null);
  }

  if (loading) {
    return (
      <PageLayout title="Objetivos do Escritório" icon={Target}>
        <p className="text-muted-foreground">Carregando...</p>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Objetivos do Escritório"
      icon={Target}
      actions={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setThemesDialogOpen(true)}
          >
            <Tags className="h-4 w-4" />
            Temas centrais
          </Button>
          <Button
            type="button"
            onClick={() => (showNew ? setShowNew(false) : openNewForm())}
          >
            <Plus className="h-4 w-4" />
            Novo Objetivo
          </Button>
        </div>
      }
    >
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Dialog
        open={themesDialogOpen}
        onOpenChange={setThemesDialogOpen}
        containerClassName="max-w-lg"
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Temas centrais</DialogTitle>
            <DialogDescription>
              Itens da lista suspensa ao criar ou editar objetivos. Só é possível
              excluir um tema que não esteja em uso.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <form
              onSubmit={handleCreateTheme}
              className="flex flex-col gap-2 sm:flex-row sm:items-end"
            >
              <div className="flex-1 space-y-2">
                <Label htmlFor="new_theme_name">Novo tema</Label>
                <Input
                  id="new_theme_name"
                  value={newThemeName}
                  onChange={(e) => setNewThemeName(e.target.value)}
                  placeholder="Ex.: Crescimento sustentável"
                />
              </div>
              <Button type="submit" variant="secondary">
                Adicionar tema
              </Button>
            </form>
            {themes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum tema cadastrado. Adicione pelo menos um tema antes de criar
                objetivos.
              </p>
            ) : (
              <ul className="flex max-h-[min(40vh,280px)] flex-wrap gap-2 overflow-y-auto pr-1">
                {themes.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-1 text-sm"
                  >
                    <span>{t.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleDeleteTheme(t.id)}
                      aria-label={`Excluir tema ${t.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setThemesDialogOpen(false)}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showNew && (
        <Card>
          <CardHeader>
            <CardTitle>Novo objetivo</CardTitle>
            <CardDescription>
              Objetivos ativos aparecem para os escritórios; inativos ficam
              ocultos.
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
                <Label htmlFor="new_theme">Tema central</Label>
                <Select
                  id="new_theme"
                  value={newThemeId}
                  onChange={(e) => setNewThemeId(e.target.value)}
                  required
                  disabled={themes.length === 0}
                >
                  <option value="">
                    {themes.length === 0
                      ? "Cadastre temas em Temas centrais…"
                      : "Selecione…"}
                  </option>
                  {themes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="new_active"
                  checked={newActive}
                  onCheckedChange={setNewActive}
                />
                <Label htmlFor="new_active">Ativo (visível para escritórios)</Label>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={themes.length === 0}>
                  Criar
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

      <Card>
        <CardHeader>
          <CardTitle>Lista de objetivos</CardTitle>
          <CardDescription>
            Opções ativas aparecem para os escritórios; inativas ficam ocultas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="obj-search">Filtrar</Label>
              <Input
                id="obj-search"
                value={listSearch}
                onChange={(e) => setListSearch(e.target.value)}
                placeholder="Buscar por título ou tema central…"
                className="max-w-md"
              />
            </div>
            <div className="w-full space-y-2 sm:w-56">
              <Label htmlFor="obj-sort">Ordenar</Label>
              <Select
                id="obj-sort"
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
              >
                <option value="title_asc">Título (A–Z)</option>
                <option value="title_desc">Título (Z–A)</option>
                <option value="active_first">Status (ativo primeiro)</option>
                <option value="recent">Mais recentes</option>
              </Select>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Tema central</TableHead>
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
                    Nenhum objetivo cadastrado. Clique em &quot;Novo
                    Objetivo&quot; para começar.
                  </TableCell>
                </TableRow>
              ) : filteredSorted.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center text-muted-foreground py-8"
                  >
                    Nenhum resultado para a busca.
                  </TableCell>
                </TableRow>
              ) : (
                filteredSorted.map((obj) =>
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
                            <Label>Tema central</Label>
                            <Select
                              value={editThemeId}
                              onChange={(e) => setEditThemeId(e.target.value)}
                              required
                            >
                              <option value="">Selecione…</option>
                              {themes.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.name}
                                </option>
                              ))}
                            </Select>
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
                        {obj.central_theme_name || "—"}
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
