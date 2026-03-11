"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createPlan } from "../actions";
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
import { Switch } from "@/components/ui/switch";
import { PageLayout } from "@/components/layout/page-layout";
import { CreditCard } from "lucide-react";

const FEATURES = [
  { key: "value_chain", label: "Cadeia de Valor" },
  { key: "swot", label: "Análise SWOT" },
  { key: "portfolio", label: "Portfólio" },
  { key: "bpm_cycle", label: "Ciclo BPM" },
  { key: "ai", label: "IA" },
  { key: "knowledge_management", label: "Gestão do Conhecimento" },
  { key: "training", label: "Treinamentos" },
  { key: "custom_ai_api", label: "API IA Customizada" },
  { key: "backup_auto", label: "Backup Automático" },
] as const;

export function NovoPlanoForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [features, setFeatures] = useState<Record<string, boolean>>(
    Object.fromEntries(FEATURES.map((f) => [f.key, false]))
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const formData = new FormData(e.currentTarget);
    for (const [key, checked] of Object.entries(features)) {
      formData.set(`features_${key}`, checked ? "true" : "false");
    }

    const result = await createPlan(formData);

    if (result?.error) {
      setError(result.error);
      setSubmitting(false);
      return;
    }

    router.push("/admin/planos");
  }

  return (
    <PageLayout
      title="Novo Plano"
      description="Cadastre um novo plano comercial na plataforma."
      icon={CreditCard}
      backHref="/admin/planos"
      backLabel="Voltar para planos"
    >

      <Card>
        <CardHeader>
          <CardTitle>Dados do Plano</CardTitle>
          <CardDescription>
            Preencha os campos e selecione as funcionalidades incluídas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                name="name"
                placeholder="Ex: Profissional"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Descrição do plano"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="max_users">Máximo de usuários</Label>
                <Input
                  id="max_users"
                  name="max_users"
                  type="number"
                  min={0}
                  defaultValue={5}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max_processes">Máximo de processos</Label>
                <Input
                  id="max_processes"
                  name="max_processes"
                  type="number"
                  min={0}
                  defaultValue={50}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="price_monthly">Preço mensal (R$)</Label>
              <Input
                id="price_monthly"
                name="price_monthly"
                type="number"
                min={0}
                step={0.01}
                defaultValue={0}
                required
              />
            </div>

            <div className="space-y-3">
              <Label>Funcionalidades incluídas</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {FEATURES.map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between rounded-lg border p-3">
                    <span className="text-sm">{label}</span>
                    <Switch
                      checked={features[key] ?? false}
                      onCheckedChange={(checked) =>
                        setFeatures((prev) => ({ ...prev, [key]: checked }))
                      }
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Criando..." : "Criar Plano"}
              </Button>
              <Link href="/admin/planos">
                <Button type="button" variant="outline">Cancelar</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </PageLayout>
  );
}
