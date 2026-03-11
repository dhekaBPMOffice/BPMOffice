"use client";

import { useState, useEffect } from "react";
import { saveImprovements, getImprovements, getProcessModels } from "../actions";
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

interface MelhoriasPhaseProps {
  demandId: string;
  officeId: string;
}

export function MelhoriasPhase({ demandId }: MelhoriasPhaseProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [technique, setTechnique] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [newSuggestion, setNewSuggestion] = useState("");
  const [prioritizationJson, setPrioritizationJson] = useState("{}");
  const [roadmapJson, setRoadmapJson] = useState("[]");
  const [associatedProblems, setAssociatedProblems] = useState("");
  const [toBeModels, setToBeModels] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    load();
  }, [demandId]);

  async function load() {
    setLoading(true);
    const [improvementsRes, modelsRes] = await Promise.all([
      getImprovements(demandId),
      getProcessModels(demandId),
    ]);
    setLoading(false);
    if (improvementsRes.data) {
      setTechnique(improvementsRes.data.technique ?? "");
      setSuggestions(Array.isArray(improvementsRes.data.suggestions) ? improvementsRes.data.suggestions : []);
      setPrioritizationJson(
        JSON.stringify(improvementsRes.data.prioritization ?? {}, null, 2)
      );
      setRoadmapJson(
        JSON.stringify(Array.isArray(improvementsRes.data.roadmap) ? improvementsRes.data.roadmap : [], null, 2)
      );
      setAssociatedProblems(improvementsRes.data.associated_problems ?? "");
    }
    if (modelsRes.data) {
      setToBeModels(
        modelsRes.data
          .filter((m: { model_type: string }) => m.model_type === "to_be")
          .map((m: { id: string; name: string }) => ({ id: m.id, name: m.name }))
      );
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    let prioritization: Record<string, unknown> = {};
    let roadmap: unknown[] = [];
    try {
      prioritization = prioritizationJson.trim() ? JSON.parse(prioritizationJson) : {};
    } catch {
      setError("JSON de priorização inválido.");
      setSaving(false);
      return;
    }
    try {
      roadmap = roadmapJson.trim() ? JSON.parse(roadmapJson) : [];
    } catch {
      setError("JSON do roadmap inválido.");
      setSaving(false);
      return;
    }
    const result = await saveImprovements(demandId, {
      technique: technique || undefined,
      suggestions,
      prioritization,
      roadmap,
      associated_problems: associatedProblems || undefined,
    });
    setSaving(false);
    if (result.error) setError(result.error);
  }

  function addSuggestion() {
    if (newSuggestion.trim()) {
      setSuggestions([...suggestions, newSuggestion.trim()]);
      setNewSuggestion("");
    }
  }

  function removeSuggestion(i: number) {
    setSuggestions(suggestions.filter((_, idx) => idx !== i));
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
          <CardTitle>Melhorias Propostas</CardTitle>
          <CardDescription>
            Técnica, sugestões, priorização e roadmap. Referência aos modelos TO-BE.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {error}
            </p>
          )}

          {toBeModels.length > 0 && (
            <div className="space-y-2">
              <Label>Modelos TO-BE relacionados</Label>
              <ul className="text-sm text-muted-foreground list-disc list-inside">
                {toBeModels.map((m) => (
                  <li key={m.id}>{m.name}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="technique">Técnica utilizada</Label>
            <Input
              id="technique"
              value={technique}
              onChange={(e) => setTechnique(e.target.value)}
              placeholder="Ex: Brainstorming, Análise de valor"
            />
          </div>

          <div className="space-y-2">
            <Label>Sugestões</Label>
            <div className="flex gap-2">
              <Input
                value={newSuggestion}
                onChange={(e) => setNewSuggestion(e.target.value)}
                placeholder="Adicionar sugestão"
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSuggestion())}
              />
              <Button type="button" variant="outline" size="icon" onClick={addSuggestion}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <ul className="space-y-1 mt-2">
              {suggestions.map((s, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="flex-1">{s}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeSuggestion(i)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-2">
            <Label htmlFor="prioritization">Priorização (JSON)</Label>
            <Textarea
              id="prioritization"
              value={prioritizationJson}
              onChange={(e) => setPrioritizationJson(e.target.value)}
              placeholder='{"item1": "alta", "item2": "media"}'
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="roadmap">Roadmap (JSON)</Label>
            <Textarea
              id="roadmap"
              value={roadmapJson}
              onChange={(e) => setRoadmapJson(e.target.value)}
              placeholder='[{"fase": "1", "entregas": ["..."]}]'
              rows={5}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="associated_problems">Problemas associados</Label>
            <Textarea
              id="associated_problems"
              value={associatedProblems}
              onChange={(e) => setAssociatedProblems(e.target.value)}
              placeholder="Problemas identificados e associados às melhorias..."
              rows={4}
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
