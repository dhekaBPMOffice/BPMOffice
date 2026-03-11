"use client";

import { useState, useEffect } from "react";
import { saveProcessModel, getProcessModels } from "../actions";
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
import { Select } from "@/components/ui/select";
import { Plus } from "lucide-react";

interface ModelagemPhaseProps {
  demandId: string;
  officeId: string;
}

interface ProcessModel {
  id: string;
  name: string;
  bpmn_file_url: string | null;
  png_file_url: string | null;
  description: string | null;
  procedures: string | null;
  version: number;
  model_type: string;
}

export function ModelagemPhase({ demandId }: ModelagemPhaseProps) {
  const [models, setModels] = useState<ProcessModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [bpmnUrl, setBpmnUrl] = useState("");
  const [pngUrl, setPngUrl] = useState("");
  const [description, setDescription] = useState("");
  const [procedures, setProcedures] = useState("");
  const [modelType, setModelType] = useState<"as_is" | "to_be">("as_is");

  useEffect(() => {
    loadModels();
  }, [demandId]);

  async function loadModels() {
    setLoading(true);
    const { data } = await getProcessModels(demandId);
    setModels(data);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const result = await saveProcessModel(demandId, {
      name,
      bpmn_file_url: bpmnUrl || undefined,
      png_file_url: pngUrl || undefined,
      description: description || undefined,
      procedures: procedures || undefined,
      model_type: modelType,
    });
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setName("");
    setBpmnUrl("");
    setPngUrl("");
    setDescription("");
    setProcedures("");
    loadModels();
  }

  const asIsModels = models.filter((m) => m.model_type === "as_is");
  const toBeModels = models.filter((m) => m.model_type === "to_be");

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Carregando...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Novo Modelo de Processo</CardTitle>
          <CardDescription>
            Adicione modelos BPMN. Informe as URLs dos arquivos (BPMN e PNG).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                {error}
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Processo de compras AS-IS"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model_type">Tipo</Label>
                <Select
                  id="model_type"
                  value={modelType}
                  onChange={(e) => setModelType(e.target.value as "as_is" | "to_be")}
                >
                  <option value="as_is">AS-IS</option>
                  <option value="to_be">TO-BE</option>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="bpmn_url">URL do arquivo BPMN</Label>
                <Input
                  id="bpmn_url"
                  value={bpmnUrl}
                  onChange={(e) => setBpmnUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="png_url">URL da imagem PNG</Label>
                <Input
                  id="png_url"
                  value={pngUrl}
                  onChange={(e) => setPngUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descrição do modelo..."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="procedures">Procedimentos</Label>
              <Textarea
                id="procedures"
                value={procedures}
                onChange={(e) => setProcedures(e.target.value)}
                placeholder="Procedimentos relacionados..."
                rows={4}
              />
            </div>
            <Button type="submit" disabled={saving}>
              <Plus className="h-4 w-4" />
              {saving ? "Adicionando..." : "Adicionar Modelo"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {asIsModels.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Modelos AS-IS</CardTitle>
            <CardDescription>Processos no estado atual.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {asIsModels.map((m) => (
                <li key={m.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <span className="font-medium">{m.name}</span>
                    <span className="text-muted-foreground text-sm ml-2">v{m.version}</span>
                    {m.description && (
                      <p className="text-sm text-muted-foreground">{m.description}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {toBeModels.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Modelos TO-BE</CardTitle>
            <CardDescription>Processos no estado desejado.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {toBeModels.map((m) => (
                <li key={m.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <span className="font-medium">{m.name}</span>
                    <span className="text-muted-foreground text-sm ml-2">v{m.version}</span>
                    {m.description && (
                      <p className="text-sm text-muted-foreground">{m.description}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {models.length === 0 && (
        <p className="text-muted-foreground text-center py-8">
          Nenhum modelo cadastrado. Preencha o formulário acima para adicionar.
        </p>
      )}
    </div>
  );
}
