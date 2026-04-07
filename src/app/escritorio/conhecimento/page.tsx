"use client";

import { useEffect, useState } from "react";
import { PageLayout } from "@/components/layout/page-layout";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BookOpen, FileText, Pencil, Plus, Trash2 } from "lucide-react";
import {
  getKnowledgeItems,
  createKnowledgeItem,
  updateKnowledgeItem,
  deleteKnowledgeItem,
  type KnowledgeItem,
  type KnowledgeCategory,
} from "./actions";

const CATEGORIES: { key: KnowledgeCategory; label: string }[] = [
  { key: "communication_plan", label: "Plano de Comunicação" },
  { key: "event", label: "Eventos" },
  { key: "activity", label: "Atividades" },
  { key: "best_practice", label: "Melhores Práticas" },
  { key: "training_material", label: "Materiais de Treinamento" },
  { key: "lecture", label: "Palestras" },
  { key: "document_template", label: "Modelos de Documentos" },
  { key: "prompt_template", label: "Base de Prompts" },
];

export default function ConhecimentoPage() {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<KnowledgeCategory>("communication_plan");

  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formContent, setFormContent] = useState("");

  async function load(category?: KnowledgeCategory) {
    setLoading(true);
    const res = await getKnowledgeItems(category ?? activeCategory);
    setLoading(false);
    if (res.error) setError(res.error);
    else setItems(res.data ?? []);
  }

  useEffect(() => {
    load(activeCategory);
  }, [activeCategory]);

  function openCreate() {
    setEditingId(null);
    setFormTitle("");
    setFormDescription("");
    setFormContent("");
    setShowDialog(true);
  }

  function openEdit(item: KnowledgeItem) {
    setEditingId(item.id);
    setFormTitle(item.title);
    setFormDescription(item.description ?? "");
    setFormContent(item.content ?? "");
    setShowDialog(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (editingId) {
      const result = await updateKnowledgeItem(editingId, {
        title: formTitle,
        description: formDescription || undefined,
        content: formContent || undefined,
      });
      if (result.error) setError(result.error);
      else {
        setShowDialog(false);
        load(activeCategory);
      }
    } else {
      const result = await createKnowledgeItem({
        category: activeCategory,
        title: formTitle,
        description: formDescription || undefined,
        content: formContent || undefined,
      });
      if (result.error) setError(result.error);
      else {
        setShowDialog(false);
        load(activeCategory);
      }
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este item?")) return;
    setError(null);
    const result = await deleteKnowledgeItem(id);
    if (result.error) setError(result.error);
    else load(activeCategory);
  }

  return (
    <PageLayout
      title="Base de Conhecimento"
      description="Gerencie planos de comunicação, eventos, materiais e modelos."
      iconName="BookOpen"
      actions={
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Novo item
        </Button>
      }
    >
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as KnowledgeCategory)}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          {CATEGORIES.map(({ key, label }) => (
            <TabsTrigger key={key} value={key}>
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        {CATEGORIES.map(({ key, label }) => (
          <TabsContent key={key} value={key} className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>{label}</CardTitle>
                <CardDescription>
                  Itens cadastrados nesta categoria.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-muted-foreground py-4">Carregando...</p>
                ) : items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Nenhum item nesta categoria.</p>
                    <Button variant="outline" className="mt-4" onClick={openCreate}>
                      <Plus className="h-4 w-4" />
                      Adicionar primeiro item
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((item) => (
                      <Card key={item.id} className="relative">
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between gap-2">
                            <CardTitle className="text-base">{item.title}</CardTitle>
                            <div className="flex gap-1 shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEdit(item)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(item.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          {item.description && (
                            <CardDescription className="line-clamp-2">
                              {item.description}
                            </CardDescription>
                          )}
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar item" : "Novo item"}
            </DialogTitle>
            <DialogDescription>
              {CATEGORIES.find((c) => c.key === activeCategory)?.label}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Título do item"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Descrição breve"
              />
            </div>
            <div className="space-y-2">
              <Label>Conteúdo</Label>
              <Textarea
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                placeholder="Conteúdo detalhado"
                rows={5}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                Cancelar
              </Button>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
