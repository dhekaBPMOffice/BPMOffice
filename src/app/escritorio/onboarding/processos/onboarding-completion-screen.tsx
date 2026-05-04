"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

type OnboardingCompletionScreenProps = {
  sectionsCount: number;
  answeredQuestions: number;
};

export function OnboardingCompletionScreen({
  sectionsCount,
  answeredQuestions,
}: OnboardingCompletionScreenProps) {
  return (
    <div className="w-full max-w-md text-center">
      <div className="mb-6 flex justify-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 ring-8 ring-primary/5">
          <Sparkles className="h-10 w-10 text-primary" />
        </div>
      </div>

      <h2 className="text-3xl font-bold">Diagnóstico concluído!</h2>
      <p className="mt-3 text-muted-foreground">
        Suas respostas foram salvas. O sistema foi ajustado ao seu escritório: a lista de
        processos passa a refletir o que você indicou neste questionário. Quando estiver pronto,
        avance para o painel do escritório.
      </p>
      <div className="mt-6 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-left text-sm text-foreground">
        <p className="font-medium text-primary">Personalização aplicada</p>
        <p className="mt-1 text-muted-foreground">
          Você verá apenas os processos vinculados às respostas que selecionou. Pode ajustar
          prioridades e detalhes a qualquer momento nas áreas de estratégia e processos.
        </p>
      </div>

      <div className="mt-8 flex items-center justify-center gap-8">
        <div className="text-center">
          <p className="text-3xl font-bold text-primary">{sectionsCount}</p>
          <p className="mt-1 text-sm text-muted-foreground">etapas</p>
        </div>
        <div className="h-10 w-px bg-border" />
        <div className="text-center">
          <p className="text-3xl font-bold text-primary">{answeredQuestions}</p>
          <p className="mt-1 text-sm text-muted-foreground">respostas</p>
        </div>
        <div className="h-10 w-px bg-border" />
        <div className="text-center">
          <p className="text-3xl font-bold text-primary">100%</p>
          <p className="mt-1 text-sm text-muted-foreground">completo</p>
        </div>
      </div>

      <p className="mt-8 text-xs text-muted-foreground">
        Quando quiser continuar, use o botão abaixo para abrir o painel do escritório.
      </p>
      <Button
        type="button"
        size="lg"
        className="mt-4 w-full gap-2 rounded-2xl text-base"
        onClick={() => {
          window.location.assign("/escritorio/dashboard");
        }}
      >
        Ir para o painel do escritório
        <ArrowRight className="h-5 w-5" />
      </Button>
    </div>
  );
}
