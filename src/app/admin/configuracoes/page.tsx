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
import { PageLayout } from "@/components/layout/page-layout";
import { Settings } from "lucide-react";
import { savePlatformSettings } from "./actions";

const SETTING_KEYS = {
  review_period: "review_period",
  review_unit: "review_unit",
  default_techniques_analysis: "default_techniques_analysis",
  default_techniques_improvement: "default_techniques_improvement",
  closure_checklist: "closure_checklist",
  implementation_plan_fields: "implementation_plan_fields",
} as const;

export default function ConfiguracoesPage() {
  const [reviewPeriod, setReviewPeriod] = useState(12);
  const [reviewUnit, setReviewUnit] = useState("months");
  const [techniquesAnalysis, setTechniquesAnalysis] = useState<string[]>([]);
  const [techniquesImprovement, setTechniquesImprovement] = useState<string[]>([]);
  const [closureChecklist, setClosureChecklist] = useState<string[]>([]);
  const [implementationFields, setImplementationFields] = useState<string[]>([]);

  const [techniquesAnalysisText, setTechniquesAnalysisText] = useState("");
  const [techniquesImprovementText, setTechniquesImprovementText] = useState("");
  const [closureChecklistText, setClosureChecklistText] = useState("");
  const [implementationFieldsText, setImplementationFieldsText] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data, error: err } = await supabase
        .from("platform_settings")
        .select("key, value");

      if (err) {
        setError(err.message);
        setLoading(false);
        return;
      }

      const settings: Record<string, unknown> = {};
      for (const row of data ?? []) {
        settings[row.key] = row.value;
      }

      const rp = settings[SETTING_KEYS.review_period] as number | undefined;
      const ru = settings[SETTING_KEYS.review_unit] as string | undefined;
      setReviewPeriod(rp ?? 12);
      setReviewUnit(ru ?? "months");

      const ta = settings[SETTING_KEYS.default_techniques_analysis] as string[] | undefined;
      const ti = settings[SETTING_KEYS.default_techniques_improvement] as string[] | undefined;
      const cc = settings[SETTING_KEYS.closure_checklist] as string[] | undefined;
      const ip = settings[SETTING_KEYS.implementation_plan_fields] as string[] | undefined;

      setTechniquesAnalysis(ta ?? []);
      setTechniquesImprovement(ti ?? []);
      setClosureChecklist(cc ?? []);
      setImplementationFields(ip ?? []);

      setTechniquesAnalysisText((ta ?? []).join("\n"));
      setTechniquesImprovementText((ti ?? []).join("\n"));
      setClosureChecklistText((cc ?? []).join("\n"));
      setImplementationFieldsText((ip ?? []).join("\n"));

      setLoading(false);
    }
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const ta = techniquesAnalysisText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const ti = techniquesImprovementText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const cc = closureChecklistText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const ip = implementationFieldsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const result = await savePlatformSettings({
      review_period: reviewPeriod,
      review_unit: reviewUnit,
      default_techniques_analysis: ta,
      default_techniques_improvement: ti,
      closure_checklist: cc,
      implementation_plan_fields: ip,
    });

    if (result?.error) {
      setError(result.error);
      setSaving(false);
      return;
    }

    setSaving(false);
  }

  if (loading) {
    return (
      <PageLayout title="Configurações Globais" description="Configure parâmetros padrão da plataforma." icon={Settings}>
        <p className="text-muted-foreground">Carregando...</p>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Configurações Globais" description="Configure parâmetros padrão da plataforma." icon={Settings}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Período de Revisão</CardTitle>
            <CardDescription>
              Intervalo padrão para revisão de processos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4 items-end">
              <div className="space-y-2 w-24">
                <Label htmlFor="review_period">Valor</Label>
                <Input
                  id="review_period"
                  type="number"
                  min={1}
                  value={reviewPeriod}
                  onChange={(e) => setReviewPeriod(parseInt(e.target.value, 10) || 1)}
                />
              </div>
              <div className="space-y-2 w-32">
                <Label htmlFor="review_unit">Unidade</Label>
                <select
                  id="review_unit"
                  value={reviewUnit}
                  onChange={(e) => setReviewUnit(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="days">Dias</option>
                  <option value="months">Meses</option>
                  <option value="years">Anos</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Técnicas Padrão para Análise</CardTitle>
            <CardDescription>
              Uma técnica por linha.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={techniquesAnalysisText}
              onChange={(e) => setTechniquesAnalysisText(e.target.value)}
              placeholder="Análise de valor&#10;Análise de tempo&#10;..."
              rows={4}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Técnicas Padrão para Melhorias</CardTitle>
            <CardDescription>
              Uma técnica por linha.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={techniquesImprovementText}
              onChange={(e) => setTechniquesImprovementText(e.target.value)}
              placeholder="Lean&#10;Six Sigma&#10;..."
              rows={4}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Checklist de Encerramento</CardTitle>
            <CardDescription>
              Itens do checklist de encerramento de processo. Um por linha.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={closureChecklistText}
              onChange={(e) => setClosureChecklistText(e.target.value)}
              placeholder="Documentação atualizada&#10;Treinamento realizado&#10;..."
              rows={4}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Campos do Plano de Implantação</CardTitle>
            <CardDescription>
              Campos padrão do plano de implantação. Um por linha.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={implementationFieldsText}
              onChange={(e) => setImplementationFieldsText(e.target.value)}
              placeholder="Responsável&#10;Prazo&#10;Recursos&#10;..."
              rows={4}
            />
          </CardContent>
        </Card>

        <Button type="submit" disabled={saving}>
          {saving ? "Salvando..." : "Salvar configurações"}
        </Button>
      </form>
    </PageLayout>
  );
}
