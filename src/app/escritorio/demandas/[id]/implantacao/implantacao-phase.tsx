"use client";

import { useState, useEffect } from "react";
import { saveImplementation, getImplementation } from "../actions";
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
import { Save } from "lucide-react";

interface ImplantacaoPhaseProps {
  demandId: string;
  officeId: string;
}

export function ImplantacaoPhase({ demandId }: ImplantacaoPhaseProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [planFieldsJson, setPlanFieldsJson] = useState("{}");
  const [observations, setObservations] = useState("");
  const [status, setStatus] = useState("planning");
  const [progressJson, setProgressJson] = useState("{}");
  const [report, setReport] = useState("");

  useEffect(() => {
    load();
  }, [demandId]);

  async function load() {
    setLoading(true);
    const { data } = await getImplementation(demandId);
    setLoading(false);
    if (data) {
      setPlanFieldsJson(
        JSON.stringify(data.plan_fields ?? {}, null, 2)
      );
      setObservations(data.observations ?? "");
      setStatus(data.status ?? "planning");
      setProgressJson(
        JSON.stringify(data.progress ?? {}, null, 2)
      );
      setReport(data.report ?? "");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    let planFields: Record<string, unknown> = {};
    let progress: Record<string, unknown> = {};
    try {
      planFields = planFieldsJson.trim() ? JSON.parse(planFieldsJson) : {};
    } catch {
      setError("JSON dos campos do plano inválido.");
      setSaving(false);
      return;
    }
    try {
      progress = progressJson.trim() ? JSON.parse(progressJson) : {};
    } catch {
      setError("JSON do progresso inválido.");
      setSaving(false);
      return;
    }
    const result = await saveImplementation(demandId, {
      plan_fields: planFields,
      observations: observations || undefined,
      status,
      progress,
      report: report || undefined,
    });
    setSaving(false);
    if (result.error) setError(result.error);
  }

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
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Plano de Implantação</CardTitle>
          <CardDescription>
            Campos dinâmicos, observações, status, indicadores de progresso e relatório.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {error}
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="planning">Planejamento</option>
              <option value="in_progress">Em andamento</option>
              <option value="completed">Concluído</option>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="plan_fields">Campos do plano (JSON)</Label>
            <Textarea
              id="plan_fields"
              value={planFieldsJson}
              onChange={(e) => setPlanFieldsJson(e.target.value)}
              placeholder='{"campo1": "valor1", "campo2": "valor2"}'
              rows={5}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="observations">Observações</Label>
            <Textarea
              id="observations"
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Observações sobre a implantação..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="progress">Indicadores de progresso (JSON)</Label>
            <Textarea
              id="progress"
              value={progressJson}
              onChange={(e) => setProgressJson(e.target.value)}
              placeholder='{"etapa1": 100, "etapa2": 50}'
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="report">Relatório</Label>
            <Textarea
              id="report"
              value={report}
              onChange={(e) => setReport(e.target.value)}
              placeholder="Relatório da implantação..."
              rows={6}
            />
          </div>

          <Button type="submit" disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
