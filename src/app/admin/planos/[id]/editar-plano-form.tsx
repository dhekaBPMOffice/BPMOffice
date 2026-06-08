"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { updatePlan } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
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
import { SYSTEM_AREAS } from "@/lib/system-areas";
import { CreditCard } from "lucide-react";

const FEATURES = [
  { key: "value_chain", label: "Cadeia de Valor" },
  { key: "swot", label: "Análise SWOT (F.O.F.A)" },
  { key: "portfolio", label: "Portfólio" },
  { key: "bpm_cycle", label: "Ciclo BPM" },
  { key: "ai", label: "IA" },
  { key: "knowledge_management", label: "Gestão do Conhecimento" },
  { key: "training", label: "Treinamentos" },
  { key: "custom_ai_api", label: "API IA Customizada" },
  { key: "backup_auto", label: "Backup Automático" },
] as const;

type ProcessManagementVersion = "essential" | "professional" | "complete";

interface Plan {
  id: string;
  name: string;
  description: string | null;
  max_users: number;
  max_processes: number;
  price_monthly: number;
  features: Record<string, boolean | string>;
  is_active: boolean;
}

export function EditarPlanoForm({ plan }: { plan: Plan }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processManagementVersion, setProcessManagementVersion] =
    useState<ProcessManagementVersion>(() => {
      const version = plan.features?.process_management_version;
      if (version === "simple" || version === "essential") return "essential";
      if (version === "professional") return "professional";
      return "complete";
    });
  const [features, setFeatures] = useState<Record<string, boolean>>(() => {
    const f: Record<string, boolean> = {};
    for (const { key } of FEATURES) {
      f[key] = plan.features?.[key] === true;
    }
    return f;
  });
  const [areas, setAreas] = useState<Record<string, boolean>>(() => {
    const f: Record<string, boolean> = {};
    for (const area of SYSTEM_AREAS) {
      f[area.featureKey] = plan.features?.[area.featureKey] === true;
    }
    return f;
  });
  const [isActive, setIsActive] = useState(plan.is_active);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const formData = new FormData(e.currentTarget);
    for (const { key } of FEATURES) {
      formData.set(`features_${key}`, (features[key] ?? false) ? "true" : "false");
    }
    for (const area of SYSTEM_AREAS) {
      formData.set(`features_${area.featureKey}`, (areas[area.featureKey] ?? false) ? "true" : "false");
    }
    formData.set("process_management_version", processManagementVersion);
    formData.set("is_active", isActive ? "true" : "false");

    const result = await updatePlan(plan.id, formData);

    if (result?.error) {
      setError(result.error);
      setSubmitting(false);
      return;
    }

    router.push("/admin/planos");
  }

  return (
    <PageLayout
      title="Editar Plano"
      description={`Alterar dados do plano ${plan.name}.`}
      iconName="CreditCard"
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
                defaultValue={plan.name}
                placeholder="Ex: Profissional"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={plan.description ?? ""}
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
                  defaultValue={plan.max_users}
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
                  defaultValue={plan.max_processes}
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
                defaultValue={plan.price_monthly}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="process_management_version">
                Versão da gestão de processos
              </Label>
              <Select
                id="process_management_version"
                value={processManagementVersion}
                onChange={(e) =>
                  setProcessManagementVersion(e.target.value as ProcessManagementVersion)
                }
              >
                <option value="essential">Plano Essencial</option>
                <option value="professional">Plano Profissional</option>
                <option value="complete">Plano Completo</option>
              </Select>
              <p className="text-xs text-muted-foreground">
                Define qual experiência será exibida para os processos dos escritórios deste plano.
              </p>
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

            <div className="space-y-3">
              <Label>Áreas do sistema</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SYSTEM_AREAS.map((area) => (
                  <div key={area.key} className="flex items-center justify-between rounded-lg border p-3">
                    <span className="text-sm">{area.label}</span>
                    <Switch
                      checked={areas[area.featureKey] ?? false}
                      onCheckedChange={(checked) =>
                        setAreas((prev) => ({ ...prev, [area.featureKey]: checked }))
                      }
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Label htmlFor="is_active">Plano ativo</Label>
              <Switch
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Salvando..." : "Salvar"}
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
