"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { submitProcessOnboarding } from "@/app/escritorio/processos/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  ListChecks,
  Sparkles,
} from "lucide-react";

type QuestionnaireOption = {
  id: string;
  label: string;
  value: string | null;
  helper_text: string | null;
  sort_order: number;
  is_active: boolean;
};

type QuestionnaireQuestion = {
  id: string;
  section_id: string;
  prompt: string;
  helper_text: string | null;
  question_type: "text" | "short_text" | "long_text" | "single_select" | "multi_select";
  is_required: boolean;
  sort_order: number;
  process_questionnaire_options?: QuestionnaireOption[];
};

type QuestionnaireSection = {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  sort_order: number;
  process_questionnaire_questions?: QuestionnaireQuestion[];
};

type Questionnaire = {
  id: string;
  title: string;
  description: string | null;
  process_questionnaire_sections?: QuestionnaireSection[];
};

function sectionIcon(index: number) {
  const icons = [Building2, BriefcaseBusiness, ListChecks];
  return icons[index % icons.length];
}

function isQuestionAnswered(
  question: QuestionnaireQuestion,
  answers: Record<string, string | string[]>
) {
  const currentAnswer = answers[question.id];
  return Array.isArray(currentAnswer)
    ? currentAnswer.length > 0
    : typeof currentAnswer === "string" && currentAnswer.trim().length > 0;
}

function getMissingRequiredQuestions(
  questions: QuestionnaireQuestion[],
  answers: Record<string, string | string[]>
) {
  return questions.filter(
    (question) => question.is_required && !isQuestionAnswered(question, answers)
  );
}

export function ProcessOnboardingForm({
  questionnaire,
}: {
  questionnaire: Questionnaire;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const sections = useMemo(
    () =>
      (questionnaire.process_questionnaire_sections ?? [])
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order),
    [questionnaire.process_questionnaire_sections]
  );
  const [currentStep, setCurrentStep] = useState(0);

  const currentSection = sections[currentStep];
  const currentQuestions = currentSection?.process_questionnaire_questions ?? [];
  const totalQuestions = sections.reduce(
    (sum, section) => sum + (section.process_questionnaire_questions?.length ?? 0),
    0
  );
  const answeredQuestions = sections.reduce(
    (sum, section) =>
      sum +
      (section.process_questionnaire_questions ?? []).filter((question) =>
        isQuestionAnswered(question, answers)
      ).length,
    0
  );
  const completedSteps = sections.filter((section) => {
    const requiredQuestions = (section.process_questionnaire_questions ?? []).filter(
      (question) => question.is_required
    );
    return requiredQuestions.every((question) => isQuestionAnswered(question, answers));
  }).length;
  const progressPercent =
    totalQuestions === 0 ? 0 : Math.round((answeredQuestions / totalQuestions) * 100);

  async function handleSubmit() {
    setLoading(true);
    setError(null);

    const result = await submitProcessOnboarding(answers);
    if ("error" in result && result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push("/escritorio/estrategia/processos-escritorio");
    router.refresh();
  }

  function goToStep(step: number) {
    setCurrentStep(step);
    setError(null);
  }

  function goToNextStep() {
    const missingQuestions = getMissingRequiredQuestions(currentQuestions, answers);
    if (missingQuestions.length > 0) {
      setError(`Responda antes de continuar: ${missingQuestions[0].prompt}`);
      return;
    }

    setError(null);
    setCurrentStep((step) => Math.min(step + 1, sections.length - 1));
  }

  async function handleAdvance(e: React.FormEvent) {
    e.preventDefault();

    if (currentStep < sections.length - 1) {
      goToNextStep();
      return;
    }

    const firstIncompleteSection = sections.find((section) => {
      const requiredQuestions = (section.process_questionnaire_questions ?? []).filter(
        (question) => question.is_required
      );
      return requiredQuestions.some((question) => !isQuestionAnswered(question, answers));
    });

    if (firstIncompleteSection) {
      const targetIndex = sections.findIndex((section) => section.id === firstIncompleteSection.id);
      const missingQuestion = getMissingRequiredQuestions(
        firstIncompleteSection.process_questionnaire_questions ?? [],
        answers
      )[0];
      setCurrentStep(targetIndex);
      setError(`Responda antes de concluir: ${missingQuestion.prompt}`);
      return;
    }

    await handleSubmit();
  }

  if (!currentSection) {
    return (
      <Card className="mx-auto w-full max-w-4xl">
        <CardHeader>
          <CardTitle>Formulário indisponível</CardTitle>
          <CardDescription>Este formulário ainda não possui etapas configuradas.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const CurrentSectionIcon = sectionIcon(currentStep);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <section className="overflow-hidden rounded-[28px] border border-border/60 bg-card">
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-6 py-6 md:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="bg-background/80">
                  Onboarding guiado
                </Badge>
                <Badge variant="outline" className="bg-background/80">
                  Etapa {currentStep + 1} de {sections.length}
                </Badge>
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-semibold tracking-tight">
                  {questionnaire.title}
                </h2>
                <p className="max-w-3xl text-sm text-muted-foreground">
                  {questionnaire.description ||
                    "Vamos montar a estrutura inicial de processos do seu escritório com uma jornada mais leve, guiada e objetiva."}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-3 py-1.5">
                  <Sparkles className="h-4 w-4 text-primary" />
                  {completedSteps} etapa{completedSteps === 1 ? "" : "s"} pronta
                  {completedSteps === 1 ? "" : "s"}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-3 py-1.5">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  {answeredQuestions} de {totalQuestions} respostas preenchidas
                </span>
              </div>
            </div>

            <div className="min-w-[240px] rounded-2xl border border-border/60 bg-background/80 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progresso da ativação</span>
                <span className="font-medium">{progressPercent}%</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Faltam {Math.max(sections.length - completedSteps, 0)} etapa
                {Math.max(sections.length - completedSteps, 0) === 1 ? "" : "s"} para
                liberar a lista inicial de processos.
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 overflow-x-auto px-6 py-4 md:px-8">
          {sections.map((section, index) => {
            const Icon = sectionIcon(index);
            const isActive = index === currentStep;
            const isDone =
              index < currentStep ||
              getMissingRequiredQuestions(
                section.process_questionnaire_questions ?? [],
                answers
              ).length === 0;

            return (
              <button
                key={section.id}
                type="button"
                onClick={() => goToStep(index)}
                className={`min-w-[220px] rounded-2xl border px-4 py-3 text-left transition ${
                  isActive
                    ? "border-primary bg-primary/10"
                    : "border-border/60 bg-background hover:bg-accent/20"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary" />
                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Etapa {index + 1}
                    </span>
                  </div>
                  {isDone && <CheckCircle2 className="h-4 w-4 text-primary" />}
                </div>
                <p className="mt-2 text-sm font-medium">{section.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {section.subtitle ||
                    `${section.process_questionnaire_questions?.length ?? 0} perguntas`}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      <Card className="border-border/60 shadow-sm">
        <CardHeader className="space-y-5 border-b border-border/60 pb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="inline-flex items-center gap-3 rounded-full border border-border/60 bg-primary/5 px-4 py-2">
              <CurrentSectionIcon className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">Etapa {currentStep + 1}</span>
            </div>
            <Badge variant="outline">
              {currentQuestions.length} pergunta{currentQuestions.length === 1 ? "" : "s"}
            </Badge>
          </div>

          <div>
            <CardTitle className="text-2xl">{currentSection.title}</CardTitle>
            <CardDescription className="mt-2 max-w-3xl text-sm">
              {currentSection.subtitle ||
                currentSection.description ||
                "Responda com tranquilidade. Cada etapa foi organizada para facilitar seu avanço."}
            </CardDescription>
            {currentSection.description && currentSection.subtitle && (
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                {currentSection.description}
              </p>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <form onSubmit={handleAdvance} className="space-y-6">
            {currentQuestions.map((question, index) => {
              const options = (question.process_questionnaire_options ?? [])
                .filter((option) => option.is_active)
                .sort((a, b) => a.sort_order - b.sort_order);

              return (
                <div
                  key={question.id}
                  className="rounded-2xl border border-border/60 bg-background p-5 shadow-sm"
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">Pergunta {index + 1}</Badge>
                      {question.is_required && <Badge variant="outline">Obrigatória</Badge>}
                    </div>
                    <Label className="text-lg font-semibold leading-snug">
                      {question.prompt}
                    </Label>
                    {question.helper_text && (
                      <p className="text-sm text-muted-foreground">{question.helper_text}</p>
                    )}
                  </div>

                  {(question.question_type === "text" ||
                    question.question_type === "short_text") && (
                    <Input
                      value={
                        typeof answers[question.id] === "string"
                          ? (answers[question.id] as string)
                          : ""
                      }
                      onChange={(e) =>
                        setAnswers((current) => ({
                          ...current,
                          [question.id]: e.target.value,
                        }))
                      }
                      placeholder="Digite sua resposta"
                      className="mt-5 h-12 rounded-xl"
                    />
                  )}

                  {question.question_type === "long_text" && (
                    <Textarea
                      rows={5}
                      value={
                        typeof answers[question.id] === "string"
                          ? (answers[question.id] as string)
                          : ""
                      }
                      onChange={(e) =>
                        setAnswers((current) => ({
                          ...current,
                          [question.id]: e.target.value,
                        }))
                      }
                      placeholder="Conte um pouco mais sobre a realidade do seu escritório"
                      className="mt-5 rounded-xl"
                    />
                  )}

                  {question.question_type === "single_select" && (
                    <div className="mt-5 grid gap-3 md:grid-cols-2">
                      {options.map((option) => {
                        const isSelected = answers[question.id] === option.id;

                        return (
                          <label
                            key={option.id}
                            className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${
                              isSelected
                                ? "border-primary bg-primary/10"
                                : "border-border/60 hover:bg-accent/20"
                            }`}
                          >
                            <input
                              type="radio"
                              name={question.id}
                              value={option.id}
                              checked={isSelected}
                              onChange={() =>
                                setAnswers((current) => ({
                                  ...current,
                                  [question.id]: option.id,
                                }))
                              }
                              className="mt-1"
                            />
                            <span className="space-y-1">
                              <span className="block text-sm font-medium">{option.label}</span>
                              {option.helper_text && (
                                <span className="block text-sm text-muted-foreground">
                                  {option.helper_text}
                                </span>
                              )}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {question.question_type === "multi_select" && (
                    <div className="mt-5 grid gap-3 md:grid-cols-2">
                      {options.map((option) => {
                        const currentValue = Array.isArray(answers[question.id])
                          ? (answers[question.id] as string[])
                          : [];
                        const isSelected = currentValue.includes(option.id);

                        return (
                          <label
                            key={option.id}
                            className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${
                              isSelected
                                ? "border-primary bg-primary/10"
                                : "border-border/60 hover:bg-accent/20"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) =>
                                setAnswers((current) => {
                                  const selected = Array.isArray(current[question.id])
                                    ? [...(current[question.id] as string[])]
                                    : [];

                                  return {
                                    ...current,
                                    [question.id]: e.target.checked
                                      ? [...selected, option.id]
                                      : selected.filter((item) => item !== option.id),
                                  };
                                })
                              }
                              className="mt-1"
                            />
                            <span className="space-y-1">
                              <span className="block text-sm font-medium">{option.label}</span>
                              {option.helper_text && (
                                <span className="block text-sm text-muted-foreground">
                                  {option.helper_text}
                                </span>
                              )}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-4 border-t border-border/60 pt-6 md:flex-row md:items-center md:justify-between">
              <div className="text-sm text-muted-foreground">
                {currentStep === sections.length - 1
                  ? "Tudo certo. Ao concluir, vamos gerar a lista inicial de processos do escritório."
                  : "Avance etapa por etapa. Você pode voltar para revisar antes de concluir."}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  disabled={currentStep === 0 || loading}
                  onClick={() => goToStep(Math.max(currentStep - 1, 0))}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Etapa anterior
                </Button>

                <Button type="submit" disabled={loading}>
                  {loading ? (
                    "Gerando lista de processos..."
                  ) : currentStep === sections.length - 1 ? (
                    "Concluir ativação"
                  ) : (
                    <>
                      Próxima etapa
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
