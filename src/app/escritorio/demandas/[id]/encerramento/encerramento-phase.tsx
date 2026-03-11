"use client";

import { useState, useEffect } from "react";
import { saveClosure, getClosure } from "../actions";
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

interface EncerramentoPhaseProps {
  demandId: string;
  officeId: string;
}

interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
}

export function EncerramentoPhase({ demandId }: EncerramentoPhaseProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [newCheckItem, setNewCheckItem] = useState("");
  const [presentationContent, setPresentationContent] = useState("");
  const [finalReport, setFinalReport] = useState("");
  const [status, setStatus] = useState("pending");

  useEffect(() => {
    load();
  }, [demandId]);

  async function load() {
    setLoading(true);
    const { data } = await getClosure(demandId);
    setLoading(false);
    if (data) {
      const items = Array.isArray(data.checklist) ? data.checklist : [];
      setChecklist(
        items.map((c: { label?: string; checked?: boolean } | string, i: number) => ({
          id: `item-${i}`,
          label: typeof c === "object" && c !== null && "label" in c ? String(c.label) : String(c),
          checked: typeof c === "object" && c !== null && "checked" in c ? Boolean(c.checked) : false,
        }))
      );
      setPresentationContent(data.presentation_content ?? "");
      setFinalReport(data.final_report ?? "");
      setStatus(data.status ?? "pending");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const checklistData = checklist.map((c) => ({ label: c.label, checked: c.checked }));
    const result = await saveClosure(demandId, {
      checklist: checklistData,
      presentation_content: presentationContent || undefined,
      final_report: finalReport || undefined,
      status,
    });
    setSaving(false);
    if (result.error) setError(result.error);
  }

  function addCheckItem() {
    if (newCheckItem.trim()) {
      setChecklist([
        ...checklist,
        { id: `item-${Date.now()}`, label: newCheckItem.trim(), checked: false },
      ]);
      setNewCheckItem("");
    }
  }

  function removeCheckItem(id: string) {
    setChecklist(checklist.filter((c) => c.id !== id));
  }

  function toggleCheck(id: string) {
    setChecklist(
      checklist.map((c) => (c.id === id ? { ...c, checked: !c.checked } : c))
    );
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
          <CardTitle>Encerramento do Projeto</CardTitle>
          <CardDescription>
            Checklist, conteúdo da apresentação, relatório final e status.
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
              <option value="pending">Pendente</option>
              <option value="in_progress">Em andamento</option>
              <option value="completed">Concluído</option>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Checklist</Label>
            <div className="flex gap-2">
              <Input
                value={newCheckItem}
                onChange={(e) => setNewCheckItem(e.target.value)}
                placeholder="Adicionar item ao checklist"
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCheckItem())}
              />
              <Button type="button" variant="outline" size="icon" onClick={addCheckItem}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <ul className="space-y-2 mt-2">
              {checklist.map((c) => (
                <li key={c.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={c.checked}
                    onChange={() => toggleCheck(c.id)}
                    className="rounded"
                  />
                  <span className={c.checked ? "line-through text-muted-foreground" : ""}>
                    {c.label}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeCheckItem(c.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-2">
            <Label htmlFor="presentation">Conteúdo da apresentação</Label>
            <Textarea
              id="presentation"
              value={presentationContent}
              onChange={(e) => setPresentationContent(e.target.value)}
              placeholder="Conteúdo da apresentação de encerramento..."
              rows={6}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="final_report">Relatório final</Label>
            <Textarea
              id="final_report"
              value={finalReport}
              onChange={(e) => setFinalReport(e.target.value)}
              placeholder="Relatório final do projeto..."
              rows={8}
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
