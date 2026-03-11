"use client";

import { useState, useEffect } from "react";
import {
  createSurveyScript,
  getSurveyScripts,
  saveSurveyResponse,
  getSurveyResponses,
} from "../actions";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, FileText } from "lucide-react";

interface LevantamentoPhaseProps {
  demandId: string;
  officeId: string;
}

interface SurveyScript {
  id: string;
  title: string;
  questions: unknown[];
}

export function LevantamentoPhase({ demandId }: LevantamentoPhaseProps) {
  const [scripts, setScripts] = useState<SurveyScript[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newQuestions, setNewQuestions] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedScript, setSelectedScript] = useState<SurveyScript | null>(null);
  const [responseDialogOpen, setResponseDialogOpen] = useState(false);
  const [respondent, setRespondent] = useState("");
  const [transcription, setTranscription] = useState("");
  const [answersJson, setAnswersJson] = useState("{}");
  const [responses, setResponses] = useState<{ id: string; respondent: string; created_at: string }[]>([]);

  useEffect(() => {
    loadScripts();
  }, [demandId]);

  async function loadScripts() {
    setLoading(true);
    const { data } = await getSurveyScripts(demandId);
    setScripts(data);
    setLoading(false);
  }

  async function handleCreateScript(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    let questions: unknown[] = [];
    try {
      questions = newQuestions.trim() ? JSON.parse(newQuestions) : [];
    } catch {
      setSaving(false);
      return;
    }
    const result = await createSurveyScript(demandId, newTitle, questions);
    setSaving(false);
    if (result.error) return;
    setDialogOpen(false);
    setNewTitle("");
    setNewQuestions("[]");
    loadScripts();
  }

  async function openResponseDialog(script: SurveyScript) {
    setSelectedScript(script);
    setResponseDialogOpen(true);
    const { data } = await getSurveyResponses(script.id);
    setResponses(data);
  }

  async function handleSaveResponse(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedScript) return;
    setSaving(true);
    let answers: Record<string, unknown> = {};
    try {
      answers = answersJson.trim() ? JSON.parse(answersJson) : {};
    } catch {
      setSaving(false);
      return;
    }
    const result = await saveSurveyResponse(selectedScript.id, {
      respondent,
      answers,
      transcription,
    });
    setSaving(false);
    if (result.error) return;
    setRespondent("");
    setTranscription("");
    setAnswersJson("{}");
    if (selectedScript) {
      const { data } = await getSurveyResponses(selectedScript.id);
      setResponses(data);
    }
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Scripts de Pesquisa</CardTitle>
              <CardDescription>
                Crie scripts de pesquisa e registre as respostas dos entrevistados.
              </CardDescription>
            </div>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Novo Script
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {scripts.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center">
              Nenhum script criado. Clique em &quot;Novo Script&quot; para começar.
            </p>
          ) : (
            <div className="space-y-4">
              {scripts.map((s) => (
                <Card key={s.id}>
                  <CardHeader className="py-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        {s.title}
                      </CardTitle>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openResponseDialog(s)}
                      >
                        Registrar Resposta
                      </Button>
                    </div>
                    <CardDescription>
                      {Array.isArray(s.questions) ? s.questions.length : 0} pergunta(s)
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <form onSubmit={handleCreateScript}>
            <DialogHeader>
              <DialogTitle>Novo Script de Pesquisa</DialogTitle>
              <DialogDescription>
                Título e perguntas em JSON (array de objetos com &quot;pergunta&quot; e &quot;tipo&quot;).
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="script_title">Título</Label>
                <Input
                  id="script_title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex: Entrevista com área de compras"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="script_questions">Perguntas (JSON)</Label>
                <Textarea
                  id="script_questions"
                  value={newQuestions}
                  onChange={(e) => setNewQuestions(e.target.value)}
                  placeholder='[{"pergunta": "Como funciona o processo?", "tipo": "text"}]'
                  rows={6}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Criando..." : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={responseDialogOpen} onOpenChange={setResponseDialogOpen}>
        <DialogContent className="max-w-2xl">
          <form onSubmit={handleSaveResponse}>
            <DialogHeader>
              <DialogTitle>
                Respostas - {selectedScript?.title}
              </DialogTitle>
              <DialogDescription>
                Registre a resposta do entrevistado.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-2">
                <Label htmlFor="respondent">Entrevistado</Label>
                <Input
                  id="respondent"
                  value={respondent}
                  onChange={(e) => setRespondent(e.target.value)}
                  placeholder="Nome ou cargo"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="answers">Respostas (JSON)</Label>
                <Textarea
                  id="answers"
                  value={answersJson}
                  onChange={(e) => setAnswersJson(e.target.value)}
                  placeholder='{"pergunta1": "resposta1", "pergunta2": "resposta2"}'
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="transcription">Transcrição</Label>
                <Textarea
                  id="transcription"
                  value={transcription}
                  onChange={(e) => setTranscription(e.target.value)}
                  placeholder="Transcrição da entrevista..."
                  rows={6}
                />
              </div>
              {responses.length > 0 && (
                <div>
                  <Label>Respostas registradas</Label>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Entrevistado</TableHead>
                        <TableHead>Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {responses.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell>{r.respondent || "—"}</TableCell>
                          <TableCell>
                            {new Date(r.created_at).toLocaleDateString("pt-BR")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setResponseDialogOpen(false)}>
                Fechar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Salvando..." : "Registrar Resposta"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
