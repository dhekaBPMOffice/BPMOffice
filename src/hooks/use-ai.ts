"use client";

import { useState, useCallback } from "react";

export interface AIVersion {
  id: string;
  versionNumber: number;
  createdAt: string;
}

export interface UseAIOptions {
  phase: string;
  projectId?: string;
}

export interface UseAIResult {
  generate: (input: string) => Promise<void>;
  result: string | null;
  loading: boolean;
  error: string | null;
  versions: AIVersion[];
  saveVersion: (content: string) => Promise<AIVersion | null>;
  interactionId: string | null;
  clearError: () => void;
}

export function useAI({ phase, projectId }: UseAIOptions): UseAIResult {
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [versions, setVersions] = useState<AIVersion[]>([]);
  const [interactionId, setInteractionId] = useState<string | null>(null);

  const generate = useCallback(
    async (input: string) => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/ai/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phase,
            input,
            projectId: projectId ?? undefined,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error ?? "Erro ao gerar conteúdo com IA.");
        }

        setResult(data.text);
        setInteractionId(data.interactionId ?? null);
        setVersions([]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao gerar conteúdo com IA.");
      } finally {
        setLoading(false);
      }
    },
    [phase, projectId]
  );

  const saveVersion = useCallback(
    async (content: string): Promise<AIVersion | null> => {
      if (!interactionId) return null;

      try {
        const res = await fetch("/api/ai/save-version", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ interactionId, content }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error ?? "Erro ao salvar versão.");
        }

        const v: AIVersion = {
          id: data.id,
          versionNumber: data.versionNumber,
          createdAt: data.createdAt,
        };
        setVersions((prev) => [...prev, v]);
        return v;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao salvar versão.");
        return null;
      }
    },
    [interactionId]
  );

  const clearError = useCallback(() => setError(null), []);

  return {
    generate,
    result,
    loading,
    error,
    versions,
    saveVersion,
    interactionId,
    clearError,
  };
}
