"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AISuggestButton } from "./ai-suggest-button";
import { SwotMatrix } from "./SwotMatrix";
import { createSwotItem, type SwotItem, type SwotType } from "../actions";

interface StepSwotProps {
  planId: string;
  planName: string;
  mission: string | null;
  vision: string | null;
  swotItems: SwotItem[];
  onReload: () => Promise<void>;
  importedFromImage?: boolean;
}

export function StepSwot({ planId, planName, mission, vision, swotItems, onReload, importedFromImage = false }: StepSwotProps) {
  const [importBannerDismissed, setImportBannerDismissed] = useState(false);

  function handleAIResult(text: string) {
    parseAndAddItems(text);
  }

  async function parseAndAddItems(text: string) {
    const lines = text.split("\n").filter((l) => l.trim());
    let currentType: SwotType | null = null;

    for (const line of lines) {
      const lower = line.toLowerCase().trim();
      if (lower.startsWith("forças") || lower.startsWith("forcas") || lower.startsWith("strengths")) {
        currentType = "strength";
        continue;
      }
      if (lower.startsWith("fraquezas") || lower.startsWith("weaknesses")) {
        currentType = "weakness";
        continue;
      }
      if (lower.startsWith("oportunidades") || lower.startsWith("opportunities")) {
        currentType = "opportunity";
        continue;
      }
      if (lower.startsWith("ameaças") || lower.startsWith("ameacas") || lower.startsWith("threats")) {
        currentType = "threat";
        continue;
      }

      if (currentType && line.trim().startsWith("-")) {
        const content = line.trim().replace(/^-\s*/, "").trim();
        if (content) {
          await createSwotItem(currentType, content, "escritorio", planId);
        }
      }
    }

    await onReload();
  }

  const aiContext = `Escritório: ${planName}\nMissão: ${mission || "Não definida"}\nVisão: ${vision || "Não definida"}\nItens SWOT existentes: ${swotItems.length}`;

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">Análise SWOT (F.O.F.A.)</h2>
        <p className="text-muted-foreground">
          Mapeie forças, fraquezas, oportunidades e ameaças. Também conhecida como F.O.F.A. (Forças, Oportunidades, Fraquezas, Ameaças).
        </p>
      </div>

      <div className="flex justify-center">
        <AISuggestButton
          phase="swot"
          context={aiContext}
          onResult={handleAIResult}
          label="Gerar Análise SWOT com IA"
        />
      </div>

      {importedFromImage && !importBannerDismissed && (
        <div className="rounded-lg bg-teal-50 border border-teal-200 p-4 flex items-start justify-between gap-3">
          <p className="text-sm text-teal-800">
            Matriz importada com sucesso. Revise os itens e arraste entre quadrantes se algo foi classificado em outro lugar.
          </p>
          <Button variant="ghost" size="sm" className="shrink-0 text-teal-700" onClick={() => setImportBannerDismissed(true)}>
            Fechar
          </Button>
        </div>
      )}

      <SwotMatrix
        planId={planId}
        planName={planName}
        mission={mission}
        vision={vision}
        swotItems={swotItems}
        onReload={onReload}
      />
    </div>
  );
}
