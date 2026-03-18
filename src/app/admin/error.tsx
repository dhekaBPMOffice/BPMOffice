"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertCircle } from "lucide-react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Erro na área admin:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
      <div className="max-w-md w-full flex flex-col gap-4 rounded-xl border border-destructive/50 bg-destructive/10 p-6">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span className="font-medium">Algo deu errado ao carregar esta página.</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Se o problema continuar, faça logout e login novamente. Verifique também se as variáveis
          de ambiente (Supabase) estão configuradas corretamente.
        </p>
        <div className="flex gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center rounded-lg bg-[var(--identity-primary)] px-4 py-2 text-sm font-medium text-[var(--identity-primary-foreground)] hover:opacity-90 transition-opacity"
          >
            Tentar novamente
          </button>
          <Link
            href="/admin"
            className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-accent/60 transition-colors"
          >
            Ir ao painel
          </Link>
        </div>
      </div>
    </div>
  );
}
