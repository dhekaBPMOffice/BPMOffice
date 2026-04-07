"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Layers } from "lucide-react";
import { PageLayout } from "@/components/layout/page-layout";
import { toggleFramework, type ProcessFramework } from "./actions";

interface FrameworkContentProps {
  frameworks: ProcessFramework[];
  activeIds: string[];
  initialError: string | null;
}

export function FrameworkContent({
  frameworks: initialFrameworks,
  activeIds: initialActiveIds,
  initialError,
}: FrameworkContentProps) {
  const [activeIds, setActiveIds] = useState<Set<string>>(new Set(initialActiveIds));
  const [error, setError] = useState<string | null>(initialError);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function handleToggle(frameworkId: string, checked: boolean) {
    setError(null);
    setLoadingId(frameworkId);
    const result = await toggleFramework(frameworkId, checked);
    setLoadingId(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    setActiveIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(frameworkId);
      else next.delete(frameworkId);
      return next;
    });
  }

  return (
    <PageLayout
      title="Framework de Processos"
      description="Selecione quais frameworks de processo estão ativos para o seu escritório."
      iconName="Layers"
      backHref="/escritorio/estrategia"
    >
      <div className="space-y-6">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Frameworks disponíveis</CardTitle>
          <CardDescription>
            Ative os frameworks que deseja utilizar nos processos do escritório.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {initialFrameworks.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                Nenhum framework cadastrado na plataforma.
              </p>
            ) : (
              initialFrameworks.map((fw) => (
                <div
                  key={fw.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{fw.name}</p>
                      {fw.category && (
                        <Badge variant="secondary">{fw.category}</Badge>
                      )}
                    </div>
                    {fw.description && (
                      <p className="text-sm text-muted-foreground mt-1">{fw.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={activeIds.has(fw.id)}
                      onCheckedChange={(checked) => handleToggle(fw.id, checked)}
                      disabled={loadingId === fw.id}
                    />
                    <Label className="text-sm">
                      {activeIds.has(fw.id) ? "Ativo" : "Inativo"}
                    </Label>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
      </div>
    </PageLayout>
  );
}
