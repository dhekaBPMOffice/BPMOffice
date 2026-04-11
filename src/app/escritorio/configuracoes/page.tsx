"use client";

import { useEffect, useState } from "react";
import { PageLayout } from "@/components/layout/page-layout";
import { createClient } from "@/lib/supabase/client";
import { saveOfficeConfig } from "./actions";
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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowDown, ArrowUp, Plus, RotateCcw, Trash2 } from "lucide-react";
import type { OfficeConfig } from "@/types/database";
import { DEFAULT_PROCESS_TYPE_OPTIONS, normalizeProcessTypeOptions } from "@/lib/process-type-options";

export default function ConfiguracoesPage() {
  const [config, setConfig] = useState<OfficeConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [aiApiKey, setAiApiKey] = useState("");
  const [aiLearnFromHistory, setAiLearnFromHistory] = useState(true);
  const [notificationReviewReminders, setNotificationReviewReminders] = useState(true);
  const [processTypeOptionsList, setProcessTypeOptionsList] = useState<string[]>(() => [
    ...DEFAULT_PROCESS_TYPE_OPTIONS,
  ]);

  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("office_id")
        .eq("auth_user_id", user.id)
        .single();

      if (!profile?.office_id) return;

      const { data } = await supabase
        .from("office_config")
        .select("*")
        .eq("office_id", profile.office_id)
        .single();

      if (data) {
        setConfig(data as OfficeConfig);
        setAiApiKey(data.ai_api_key_encrypted ?? "");
        setAiLearnFromHistory(data.ai_learn_from_history ?? true);
        setNotificationReviewReminders(data.notification_review_reminders ?? true);
        const raw = (data as OfficeConfig & { process_type_options?: string[] })
          .process_type_options;
        setProcessTypeOptionsList(normalizeProcessTypeOptions(raw));
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const result = await saveOfficeConfig({
      ai_api_key: aiApiKey || null,
      ai_learn_from_history: aiLearnFromHistory,
      notification_review_reminders: notificationReviewReminders,
      process_type_options: processTypeOptionsList,
    });

    setSaving(false);

    if (result.success) {
      setConfig((prev) =>
        prev
          ? {
              ...prev,
              ai_learn_from_history: aiLearnFromHistory,
              notification_review_reminders: notificationReviewReminders,
              process_type_options: normalizeProcessTypeOptions(processTypeOptionsList),
            }
          : null
      );
    } else {
      setError(result.error ?? "Erro ao salvar.");
    }
  }

  if (loading) {
    return (
      <PageLayout title="Configurações" description="Carregando..." iconName="Settings">
        <span />
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Configurações"
      description="Configure IA, notificações e preferências do escritório."
      iconName="Settings"
    >
      <form onSubmit={handleSubmit}>
        <Tabs defaultValue="ai">
          <TabsList>
            <TabsTrigger value="ai">Configuração de IA</TabsTrigger>
            <TabsTrigger value="notifications">Notificações</TabsTrigger>
            <TabsTrigger value="processos">Tipos de processo</TabsTrigger>
          </TabsList>

          <TabsContent value="ai" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Inteligência Artificial</CardTitle>
                <CardDescription>
                  Use sua própria chave de API ou a padrão da plataforma.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {error && (
                  <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                    {error}
                  </p>
                )}
                <div className="space-y-2">
                  <Label htmlFor="ai_api_key">Chave de API própria (opcional)</Label>
                  <Input
                    id="ai_api_key"
                    type="password"
                    value={aiApiKey}
                    onChange={(e) => setAiApiKey(e.target.value)}
                    placeholder="sk-..."
                    autoComplete="off"
                  />
                  <p className="text-xs text-muted-foreground">
                    Deixe em branco para usar a chave padrão da plataforma.
                  </p>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <Label htmlFor="ai_learn">Aprender com histórico</Label>
                    <p className="text-sm text-muted-foreground">
                      Permitir que a IA use o histórico de conversas para melhorar respostas.
                    </p>
                  </div>
                  <Switch
                    id="ai_learn"
                    checked={aiLearnFromHistory}
                    onCheckedChange={setAiLearnFromHistory}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Notificações</CardTitle>
                <CardDescription>
                  Configure lembretes e alertas.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <Label htmlFor="review_reminders">Lembretes de revisão</Label>
                    <p className="text-sm text-muted-foreground">
                      Enviar lembretes para revisão de demandas e processos.
                    </p>
                  </div>
                  <Switch
                    id="review_reminders"
                    checked={notificationReviewReminders}
                    onCheckedChange={setNotificationReviewReminders}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="processos" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Tipos de processo</CardTitle>
                <CardDescription>
                  Defina a ordem e os rótulos do campo <strong>Tipo</strong> na gestão de processos. Pode
                  acrescentar novos itens ou substituir os padrões (Gestão, Negócio, Suporte).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {processTypeOptionsList.map((label, index) => (
                    <li
                      key={`${index}-${label}`}
                      className="flex flex-col gap-2 rounded-lg border border-border/60 p-3 sm:flex-row sm:items-center"
                    >
                      <Input
                        value={label}
                        onChange={(e) => {
                          const v = e.target.value;
                          setProcessTypeOptionsList((prev) =>
                            prev.map((x, i) => (i === index ? v : x))
                          );
                        }}
                        className="min-w-0 flex-1"
                        aria-label={`Tipo ${index + 1}`}
                      />
                      <div className="flex shrink-0 flex-wrap gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-9 w-9"
                          disabled={index === 0}
                          onClick={() =>
                            setProcessTypeOptionsList((prev) => {
                              const next = [...prev];
                              [next[index - 1], next[index]] = [next[index], next[index - 1]];
                              return next;
                            })
                          }
                          aria-label="Mover para cima"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-9 w-9"
                          disabled={index === processTypeOptionsList.length - 1}
                          onClick={() =>
                            setProcessTypeOptionsList((prev) => {
                              const next = [...prev];
                              [next[index], next[index + 1]] = [next[index + 1], next[index]];
                              return next;
                            })
                          }
                          aria-label="Mover para baixo"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 text-destructive hover:text-destructive"
                          onClick={() =>
                            setProcessTypeOptionsList((prev) =>
                              prev.length > 1 ? prev.filter((_, i) => i !== index) : prev
                            )
                          }
                          aria-label="Remover"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setProcessTypeOptionsList((prev) => [...prev, ""])}
                  >
                    <Plus className="h-4 w-4" aria-hidden />
                    Adicionar tipo
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() =>
                      setProcessTypeOptionsList([...DEFAULT_PROCESS_TYPE_OPTIONS])
                    }
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden />
                    Restaurar padrões
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-6">
          <Button type="submit" disabled={saving}>
            {saving ? "Salvando..." : "Salvar configurações"}
          </Button>
        </div>
      </form>
    </PageLayout>
  );
}
