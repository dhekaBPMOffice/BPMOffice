"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";

interface AISuggestButtonProps {
  phase: string;
  context: string;
  onResult: (text: string) => void;
  label?: string;
  className?: string;
  disabled?: boolean;
}

export function AISuggestButton({
  phase,
  context,
  onResult,
  label = "Sugerir Opções IA",
  className,
  disabled,
}: AISuggestButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase, input: context }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Erro ao gerar sugestão.");
      }

      onResult(data.text);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao gerar sugestão.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={className}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleGenerate}
        disabled={loading || disabled}
        className="gap-2 bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100 hover:text-teal-800"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        {loading ? "Gerando..." : label}
      </Button>
      {error && (
        <p className="text-xs text-destructive mt-1">{error}</p>
      )}
    </div>
  );
}
