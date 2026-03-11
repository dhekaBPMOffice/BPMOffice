"use client";

import { useState, useEffect } from "react";
import { saveAnalysis, getAnalysis } from "../actions";
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
import { Save, Plus, X } from "lucide-react";

interface AnalisePhaseProps {
  demandId: string;
  officeId: string;
}

export function AnalisePhase({ demandId }: AnalisePhaseProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [technique, setTechnique] = useState("");
  const [strengths, setStrengths] = useState<string[]>([]);
  const [weaknesses, setWeaknesses] = useState<string[]>([]);
  const [criticalityLevel, setCriticalityLevel] = useState<string>("");
  const [recommendations, setRecommendations] = useState("");
  const [newStrength, setNewStrength] = useState("");
  const [newWeakness, setNewWeakness] = useState("");

  useEffect(() => {
    load();
  }, [demandId]);

  async function load() {
    setLoading(true);
    const { data } = await getAnalysis(demandId);
    setLoading(false);
    if (data) {
      setTechnique(data.technique ?? "");
      setStrengths(Array.isArray(data.strengths) ? data.strengths : []);
      setWeaknesses(Array.isArray(data.weaknesses) ? data.weaknesses : []);
      setCriticalityLevel(data.criticality_level ?? "");
      setRecommendations(data.recommendations ?? "");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const result = await saveAnalysis(demandId, {
      technique: technique || undefined,
      strengths,
      weaknesses,
      criticality_level: criticalityLevel
        ? (criticalityLevel as "baixa" | "media" | "alta" | "critica")
        : undefined,
      recommendations: recommendations || undefined,
    });
    setSaving(false);
    if (result.error) setError(result.error);
  }

  function addStrength() {
    if (newStrength.trim()) {
      setStrengths([...strengths, newStrength.trim()]);
      setNewStrength("");
    }
  }

  function removeStrength(i: number) {
    setStrengths(strengths.filter((_, idx) => idx !== i));
  }

  function addWeakness() {
    if (newWeakness.trim()) {
      setWeaknesses([...weaknesses, newWeakness.trim()]);
      setNewWeakness("");
    }
  }

  function removeWeakness(i: number) {
    setWeaknesses(weaknesses.filter((_, idx) => idx !== i));
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
          <CardTitle>Análise do Processo</CardTitle>
          <CardDescription>
            Registre pontos fortes, fracos, nível de criticidade e recomendações.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {error}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="technique">Técnica utilizada</Label>
              <Input
                id="technique"
                value={technique}
                onChange={(e) => setTechnique(e.target.value)}
                placeholder="Ex: Análise SWOT, Value Stream Mapping"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="criticality">Nível de criticidade</Label>
              <Select
                id="criticality"
                value={criticalityLevel}
                onChange={(e) => setCriticalityLevel(e.target.value)}
              >
                <option value="">Selecione</option>
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
                <option value="critica">Crítica</option>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Pontos fortes</Label>
            <div className="flex gap-2">
              <Input
                value={newStrength}
                onChange={(e) => setNewStrength(e.target.value)}
                placeholder="Adicionar ponto forte"
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addStrength())}
              />
              <Button type="button" variant="outline" size="icon" onClick={addStrength}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <ul className="space-y-1 mt-2">
              {strengths.map((s, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="flex-1">{s}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeStrength(i)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-2">
            <Label>Pontos fracos</Label>
            <div className="flex gap-2">
              <Input
                value={newWeakness}
                onChange={(e) => setNewWeakness(e.target.value)}
                placeholder="Adicionar ponto fraco"
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addWeakness())}
              />
              <Button type="button" variant="outline" size="icon" onClick={addWeakness}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <ul className="space-y-1 mt-2">
              {weaknesses.map((w, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="flex-1">{w}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeWeakness(i)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-2">
            <Label htmlFor="recommendations">Recomendações</Label>
            <Textarea
              id="recommendations"
              value={recommendations}
              onChange={(e) => setRecommendations(e.target.value)}
              placeholder="Recomendações da análise..."
              rows={5}
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
