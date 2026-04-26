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
import { Select } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageLayout } from "@/components/layout/page-layout";
import { Sparkles } from "lucide-react";
import { saveAiConfig } from "./actions";

const BPM_PHASES = [
  { key: "levantamento", label: "Levantamento" },
  { key: "modelagem", label: "Modelagem" },
  { key: "analise", label: "Análise" },
  { key: "melhorias", label: "Melhorias" },
  { key: "implantacao", label: "Implantação" },
  { key: "encerramento", label: "Encerramento" },
] as const;

const GEMINI_DEFAULT_MODEL = "gemini-2.5-flash";
const DEFAULT_MODEL_BY_PROVIDER: Record<string, string> = {
  openai: "gpt-4",
  anthropic: "claude-3",
  google: GEMINI_DEFAULT_MODEL,
};

export default function IaPage() {
  const [defaultProvider, setDefaultProvider] = useState("openai");
  const [defaultModel, setDefaultModel] = useState("gpt-4");
  const [defaultApiKey, setDefaultApiKey] = useState("");
  const [prompts, setPrompts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data, error: err } = await supabase
        .from("ai_configs")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (err) {
        setError(err.message);
        setLoading(false);
        return;
      }

      if (data) {
        setDefaultProvider(data.default_provider || "openai");
        setDefaultModel(data.default_model || "gpt-4");
        setDefaultApiKey(data.default_api_key_encrypted || "");
        setPrompts((data.prompts as Record<string, string>) || {});
      } else {
        for (const { key } of BPM_PHASES) {
          setPrompts((prev) => ({ ...prev, [key]: "" }));
        }
      }
      setLoading(false);
    }
    load();
  }, []);

  function handleProviderChange(provider: string) {
    setDefaultProvider(provider);

    const knownDefaultModels = new Set(Object.values(DEFAULT_MODEL_BY_PROVIDER));
    if (!defaultModel.trim() || knownDefaultModels.has(defaultModel)) {
      setDefaultModel(DEFAULT_MODEL_BY_PROVIDER[provider] ?? defaultModel);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const result = await saveAiConfig({
      default_provider: defaultProvider,
      default_model: defaultModel,
      default_api_key: defaultApiKey || undefined,
      prompts,
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
      <PageLayout title="Configuração de IA" description="Configure o provedor, modelo e prompts padrão para as fases do ciclo BPM." iconName="Sparkles">
        <p className="text-muted-foreground">Carregando...</p>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Configuração de IA" description="Configure o provedor, modelo e prompts padrão para as fases do ciclo BPM." iconName="Sparkles">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Provedor e Modelo</CardTitle>
            <CardDescription>
              Defina o provedor de IA padrão e o modelo a ser utilizado.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="default_provider">Provedor padrão</Label>
              <Select
                id="default_provider"
                value={defaultProvider}
                onChange={(e) => handleProviderChange(e.target.value)}
              >
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="google">Google Gemini</option>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="default_model">Modelo padrão</Label>
              <Input
                id="default_model"
                value={defaultModel}
                onChange={(e) => setDefaultModel(e.target.value)}
                placeholder={`Ex: gpt-4, claude-3, ${GEMINI_DEFAULT_MODEL}`}
              />
              {defaultProvider === "google" && (
                <p className="text-xs text-muted-foreground">
                  Para Gemini, use um modelo compatível com a API Google AI, como{" "}
                  {GEMINI_DEFAULT_MODEL} ou gemini-2.5-pro.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="default_api_key">Chave API (opcional)</Label>
              <Input
                id="default_api_key"
                type="password"
                value={defaultApiKey}
                onChange={(e) => setDefaultApiKey(e.target.value)}
                placeholder="••••••••••••••••"
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                Mantenha em branco para não alterar a chave atual.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Prompts por fase BPM</CardTitle>
            <CardDescription>
              Personalize os prompts utilizados em cada fase do ciclo BPM.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="levantamento">
              <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
                {BPM_PHASES.map(({ key, label }) => (
                  <TabsTrigger key={key} value={key}>
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>
              {BPM_PHASES.map(({ key, label }) => (
                <TabsContent key={key} value={key} className="mt-4">
                  <Label htmlFor={`prompt_${key}`}>Prompt para {label}</Label>
                  <Textarea
                    id={`prompt_${key}`}
                    className="mt-2 min-h-[120px]"
                    value={prompts[key] ?? ""}
                    onChange={(e) =>
                      setPrompts((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                    placeholder={`Digite o prompt padrão para a fase de ${label.toLowerCase()}...`}
                  />
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>

        <Button type="submit" disabled={saving}>
          {saving ? "Salvando..." : "Salvar configurações"}
        </Button>
      </form>
    </PageLayout>
  );
}
