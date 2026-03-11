"use client";

import { useState, useEffect } from "react";
import { getProjectByDemand, savePlanningData } from "../actions";
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
import { Save } from "lucide-react";

interface PlanejamentoPhaseProps {
  demandId: string;
  officeId: string;
}

interface ScheduleItem {
  task: string;
  start: string;
  end: string;
  responsible: string;
}

export function PlanejamentoPhase({ demandId }: PlanejamentoPhaseProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scope, setScope] = useState("");
  const [estimates, setEstimates] = useState("");
  const [projectPlan, setProjectPlan] = useState("");
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await getProjectByDemand(demandId);
      setLoading(false);
      if (data) {
        setScope(data.scope ?? "");
        setEstimates(data.estimates ?? "");
        setProjectPlan(data.project_plan ?? "");
        const s = data.schedule as ScheduleItem[] | null;
        setSchedule(Array.isArray(s) && s.length > 0 ? s : [{ task: "", start: "", end: "", responsible: "" }]);
      } else {
        setSchedule([{ task: "", start: "", end: "", responsible: "" }]);
      }
    }
    load();
  }, [demandId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const result = await savePlanningData(demandId, {
      scope,
      estimates,
      project_plan: projectPlan,
      schedule: schedule.filter((s) => s.task.trim()),
    });
    setSaving(false);
    if (result.error) setError(result.error);
  }

  function addScheduleItem() {
    setSchedule([...schedule, { task: "", start: "", end: "", responsible: "" }]);
  }

  function removeScheduleItem(i: number) {
    setSchedule(schedule.filter((_, idx) => idx !== i));
  }

  function updateScheduleItem(i: number, field: keyof ScheduleItem, value: string) {
    const next = [...schedule];
    next[i] = { ...next[i], [field]: value };
    setSchedule(next);
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
          <CardTitle>Planejamento do Projeto</CardTitle>
          <CardDescription>
            Defina o escopo, estimativas, plano do projeto e cronograma.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {error}
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="scope">Escopo</Label>
            <Textarea
              id="scope"
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              placeholder="Descreva o escopo do projeto..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="estimates">Estimativas</Label>
            <Textarea
              id="estimates"
              value={estimates}
              onChange={(e) => setEstimates(e.target.value)}
              placeholder="Estimativas de tempo, recursos, etc."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="project_plan">Plano do Projeto</Label>
            <Textarea
              id="project_plan"
              value={projectPlan}
              onChange={(e) => setProjectPlan(e.target.value)}
              placeholder="Plano detalhado do projeto..."
              rows={4}
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Cronograma</Label>
              <Button type="button" variant="outline" size="sm" onClick={addScheduleItem}>
                Adicionar item
              </Button>
            </div>
            <div className="space-y-3">
              {schedule.map((item, i) => (
                <div key={i} className="grid gap-2 sm:grid-cols-5 items-end">
                  <div className="sm:col-span-2">
                    <Label className="text-xs">Tarefa</Label>
                    <Input
                      value={item.task}
                      onChange={(e) => updateScheduleItem(i, "task", e.target.value)}
                      placeholder="Nome da tarefa"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Início</Label>
                    <Input
                      type="date"
                      value={item.start}
                      onChange={(e) => updateScheduleItem(i, "start", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Fim</Label>
                    <Input
                      type="date"
                      value={item.end}
                      onChange={(e) => updateScheduleItem(i, "end", e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label className="text-xs">Responsável</Label>
                      <Input
                        value={item.responsible}
                        onChange={(e) => updateScheduleItem(i, "responsible", e.target.value)}
                        placeholder="Nome"
                      />
                    </div>
                    {schedule.length > 1 && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        onClick={() => removeScheduleItem(i)}
                      >
                        ×
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
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
