"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertCircle, Users } from "lucide-react";
import { PageLayout } from "@/components/layout/page-layout";

export default function UsuariosError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Erro na área de usuários:", error);
  }, [error]);

  return (
    <PageLayout title="Usuários" iconName="Users">
      <div className="flex flex-col gap-4 rounded-lg border border-destructive/50 bg-destructive/10 p-6">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span className="font-medium">Algo deu errado ao carregar esta página.</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Se o problema continuar, faça logout e login novamente ou tente mais tarde.
        </p>
        <div className="flex gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center rounded-lg bg-[var(--identity-primary)] px-4 py-2 text-sm font-medium text-[var(--identity-primary-foreground)] shadow-sm hover:shadow hover:brightness-110 transition-all duration-150"
          >
            Tentar novamente
          </button>
          <Link
            href="/escritorio/dashboard"
            className="inline-flex items-center justify-center rounded-lg border border-border/70 bg-background px-4 py-2 text-sm font-medium hover:bg-accent/60 hover:text-accent-foreground transition-all duration-150"
          >
            Voltar ao escritório
          </Link>
        </div>
      </div>
    </PageLayout>
  );
}
