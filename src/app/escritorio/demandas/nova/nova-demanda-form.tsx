"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createDemand } from "../actions";
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
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";

export function NovaDemandaForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = e.currentTarget;
    const formData = new FormData(form);

    const result = await createDemand({
      title: formData.get("title") as string,
      description: (formData.get("description") as string) || undefined,
      external_ticket_id: (formData.get("external_ticket_id") as string) || undefined,
      priority: (formData.get("priority") as string) || "medium",
    });

    setLoading(false);

    if (result.success && "id" in result) {
      router.push(`/escritorio/demandas/${result.id}`);
      router.refresh();
    } else {
      setError((result as { error?: string }).error ?? "Erro ao criar demanda.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dados da demanda</CardTitle>
        <CardDescription>
          Preencha os campos para criar uma nova demanda.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {error}
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              name="title"
              required
              placeholder="Ex: Mapeamento do processo de compras"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Descreva a demanda em detalhes..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="external_ticket_id">ID do ticket externo (opcional)</Label>
            <Input
              id="external_ticket_id"
              name="external_ticket_id"
              placeholder="Ex: JIRA-123, #456"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority">Prioridade</Label>
            <Select id="priority" name="priority">
              <option value="low">Baixa</option>
              <option value="medium">Média</option>
              <option value="high">Alta</option>
              <option value="urgent">Urgente</option>
            </Select>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={loading}>
              {loading ? "Criando..." : "Criar demanda"}
            </Button>
            <Link
              href="/escritorio/demandas"
              className="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 text-sm font-medium"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
