"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Bot, Loader2, Save, History, Download, Sparkles } from "lucide-react";
import { useAI } from "@/hooks/use-ai";

interface AIAssistantPanelProps {
  phase: string;
  projectId?: string;
  defaultInput?: string;
  placeholder?: string;
}

export function AIAssistantPanel({
  phase,
  projectId,
  defaultInput = "",
  placeholder = "Cole ou digite os dados de entrada para a IA processar...",
}: AIAssistantPanelProps) {
  const [input, setInput] = useState(defaultInput);
  const [editableResult, setEditableResult] = useState("");
  const [versionsList, setVersionsList] = useState<Array<{ id: string; versionNumber: number; content: string; createdAt: string }>>([]);

  const {
    generate,
    result,
    loading,
    error,
    versions,
    saveVersion,
    interactionId,
    clearError,
  } = useAI({ phase, projectId });

  useEffect(() => {
    if (result !== null) {
      setEditableResult(result);
    }
  }, [result]);

  useEffect(() => {
    if (interactionId) {
      fetch(`/api/ai/versions?interactionId=${interactionId}`)
        .then((r) => r.json())
        .then((data) => setVersionsList(data.versions ?? []))
        .catch(() => setVersionsList([]));
    } else {
      setVersionsList([]);
    }
  }, [interactionId, versions]);

  async function handleGenerate() {
    if (!input.trim()) return;
    await generate(input);
  }

  async function handleSaveVersion() {
    const content = editableResult.trim();
    if (!content) return;
    const v = await saveVersion(content);
    if (v && interactionId) {
      setVersionsList((prev) => [
        { id: v.id, versionNumber: v.versionNumber, content, createdAt: v.createdAt },
        ...prev,
      ]);
    }
  }

  function handleExport() {
    const blob = new Blob([editableResult], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ia-${phase}-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const allVersions = versionsList;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          <CardTitle>Assistente de IA</CardTitle>
        </div>
        <CardDescription>
          Gere conteúdo com inteligência artificial para esta fase. Cole os dados de entrada e clique em Gerar.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Entrada</label>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
            rows={4}
            className="resize-none"
          />
        </div>

        <Button onClick={handleGenerate} disabled={loading || !input.trim()}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Gerando...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Gerar com IA
            </>
          )}
        </Button>

        {error && (
          <div
            className="rounded-md bg-destructive/10 p-3 text-sm text-destructive flex items-center justify-between"
          >
            <span>{error}</span>
            <Button variant="ghost" size="sm" onClick={clearError}>
              Fechar
            </Button>
          </div>
        )}

        {(result !== null || editableResult) && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Resultado</label>
              <div className="flex gap-2">
                {allVersions.length > 0 && (
                  <div className="flex items-center gap-2">
                    <History className="h-4 w-4" />
                    <Select
                      defaultValue=""
                      onChange={(e) => {
                        const v = allVersions.find((x) => x.id === e.target.value);
                        if (v) setEditableResult(v.content);
                      }}
                      className="w-[180px]"
                    >
                      <option value="">Histórico de versões</option>
                      {allVersions.map((v) => (
                        <option key={v.id} value={v.id}>
                          v{v.versionNumber} - {new Date(v.createdAt).toLocaleString("pt-BR")}
                        </option>
                      ))}
                    </Select>
                  </div>
                )}
                <Button variant="outline" size="sm" onClick={handleSaveVersion} disabled={!editableResult.trim()}>
                  <Save className="h-4 w-4" />
                  Salvar Versão
                </Button>
                <Button variant="outline" size="sm" onClick={handleExport} disabled={!editableResult.trim()}>
                  <Download className="h-4 w-4" />
                  Exportar
                </Button>
              </div>
            </div>
            <Textarea
              value={editableResult}
              onChange={(e) => setEditableResult(e.target.value)}
              placeholder="O resultado aparecerá aqui..."
              rows={12}
              className="resize-none font-mono text-sm"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
