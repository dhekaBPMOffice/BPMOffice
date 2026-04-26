"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { submitProcessOnboarding } from "@/app/escritorio/processos/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  Clock,
  Layers,
  ListChecks,
  Rocket,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

type Phase = "welcome" | "questions" | "section-done" | "submitting-done";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SUBMIT_PROCESS_ONBOARDING_NETWORK_ERROR =
  "A operação excedeu o tempo ou a rede falhou. Tente de novo; se o problema continuar, contacte o suporte.";

const SECTION_ICONS = [Building2, Target, ListChecks, BriefcaseBusiness, Layers, Trophy];

function getSectionIcon(index: number) {
  return SECTION_ICONS[index % SECTION_ICONS.length];
}

function isQuestionAnswered(
  question: QuestionnaireQuestion,
  answers: Record<string, string | string[]>
) {
  const ans = answers[question.id];
  return Array.isArray(ans)
    ? ans.length > 0
    : typeof ans === "string" && ans.trim().length > 0;
}

function isSectionComplete(
  section: QuestionnaireSection,
  answers: Record<string, string | string[]>
) {
  const required = (section.process_questionnaire_questions ?? []).filter((q) => q.is_required);
  return required.every((q) => isQuestionAnswered(q, answers));
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProcessOnboardingForm({
  questionnaire,
}: {
  questionnaire: Questionnaire;
}) {
  const router = useRouter();

  // ── State ────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>("welcome");
  const [currentStep, setCurrentStep] = useState(0);
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // ── Derived ──────────────────────────────────────────────────────────────
  const sections = useMemo(
    () =>
      (questionnaire.process_questionnaire_sections ?? [])
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order),
    [questionnaire.process_questionnaire_sections]
  );

  const currentSection = sections[currentStep];

  const currentQuestions = useMemo(
    () =>
      (currentSection?.process_questionnaire_questions ?? [])
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order),
    [currentSection]
  );

  const currentQuestion = currentQuestions[qIndex] ?? null;

  const totalQuestions = useMemo(
    () =>
      sections.reduce(
        (sum, s) => sum + (s.process_questionnaire_questions?.length ?? 0),
        0
      ),
    [sections]
  );

  const answeredQuestions = useMemo(
    () =>
      sections.reduce(
        (sum, s) =>
          sum +
          (s.process_questionnaire_questions ?? []).filter((q) =>
            isQuestionAnswered(q, answers)
          ).length,
        0
      ),
    [sections, answers]
  );

  const progressPercent =
    totalQuestions === 0 ? 0 : Math.round((answeredQuestions / totalQuestions) * 100);

  const estimatedMinutes = Math.max(1, Math.ceil(totalQuestions / 8));

  // ── Navigation helpers ────────────────────────────────────────────────────

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    try {
      const result = await submitProcessOnboarding(answers);
      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }
      setPhase("submitting-done");
      setTimeout(() => {
        router.push("/escritorio/estrategia/processos-escritorio");
        router.refresh();
      }, 3500);
    } catch {
      setError(SUBMIT_PROCESS_ONBOARDING_NETWORK_ERROR);
    } finally {
      setLoading(false);
    }
  }

  async function goToNextQuestion() {
    if (!currentQuestion) {
      if (currentStep < sections.length - 1) {
        setPhase("section-done");
      } else {
        await handleSubmit();
      }
      return;
    }

    if (currentQuestion.is_required && !isQuestionAnswered(currentQuestion, answers)) {
      setError(`Responda antes de continuar: ${currentQuestion.prompt}`);
      return;
    }

    setError(null);
    const isLastQuestion = qIndex >= currentQuestions.length - 1;
    const isLastSection = currentStep >= sections.length - 1;

    if (!isLastQuestion) {
      setQIndex(qIndex + 1);
    } else if (!isLastSection) {
      setPhase("section-done");
    } else {
      await handleSubmit();
    }
  }

  function goToPrevQuestion() {
    setError(null);
    if (qIndex > 0) {
      setQIndex(qIndex - 1);
    } else if (currentStep > 0) {
      const prevSection = sections[currentStep - 1];
      const prevQs = (prevSection?.process_questionnaire_questions ?? [])
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order);
      setCurrentStep(currentStep - 1);
      setQIndex(Math.max(0, prevQs.length - 1));
    } else {
      setPhase("welcome");
    }
  }

  function jumpToSection(index: number) {
    setCurrentStep(index);
    setQIndex(0);
    setPhase("questions");
    setError(null);
  }

  function continueToNextSection() {
    setCurrentStep(currentStep + 1);
    setQIndex(0);
    setPhase("questions");
    setError(null);
  }

  // ── Shared full-bleed wrapper used by all phases ─────────────────────────
  const FocusWrapper = ({ children }: { children: React.ReactNode }) => (
    <div
      style={{ margin: "calc(-1 * var(--spacing-page))" }}
      className="flex min-h-[calc(100vh-64px)] items-start justify-center bg-muted/30 px-4 py-10 sm:px-6 sm:py-12"
    >
      {children}
    </div>
  );

  // ── Empty guard ───────────────────────────────────────────────────────────
  if (sections.length === 0) {
    return (
      <FocusWrapper>
        <div className="flex flex-col items-center justify-center text-center">
          <p className="text-muted-foreground">
            Este formulário ainda não possui etapas configuradas.
          </p>
        </div>
      </FocusWrapper>
    );
  }

  // =========================================================================
  // WELCOME SCREEN
  // =========================================================================
  if (phase === "welcome") {
    return (
      <FocusWrapper>
        <div className="w-full max-w-lg">
          {/* Icon */}
          <div className="mb-8 flex justify-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 ring-8 ring-primary/5">
              <Rocket className="h-10 w-10 text-primary" />
            </div>
          </div>

          {/* Title */}
          <div className="mb-8 space-y-3 text-center">
            <h1 className="text-3xl font-bold tracking-tight">
              {questionnaire.title || "Diagnóstico inicial do escritório"}
            </h1>
            <p className="text-muted-foreground">
              {questionnaire.description ||
                "Vamos mapear a realidade do seu escritório de processos para montar a estrutura inicial de forma precisa e personalizada."}
            </p>
          </div>

          {/* Info chips */}
          <div className="mb-8 flex flex-wrap justify-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background px-4 py-2 text-sm">
              <ListChecks className="h-4 w-4 text-primary" />
              {sections.length} etapas temáticas
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background px-4 py-2 text-sm">
              <Clock className="h-4 w-4 text-primary" />~{estimatedMinutes} min
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background px-4 py-2 text-sm">
              <Sparkles className="h-4 w-4 text-primary" />
              Resultados imediatos
            </span>
          </div>

          {/* What happens */}
          <div className="mb-8 rounded-2xl border border-border/60 bg-muted/30 p-5">
            <p className="text-sm font-semibold">O que acontece depois</p>
            <ul className="mt-3 space-y-2.5 text-sm text-muted-foreground">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                O sistema monta automaticamente a lista inicial de processos do escritório
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                Você poderá ajustar processos e prioridades a qualquer momento
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                Suas respostas ficam salvas permanentemente
              </li>
            </ul>
          </div>

          {/* Sections preview */}
          <div className="mb-8 space-y-2">
            {sections.map((section, i) => {
              const Icon = getSectionIcon(i);
              return (
                <div
                  key={section.id}
                  className="flex items-center gap-3 rounded-xl border border-border/40 bg-background px-4 py-3"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/8">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-tight">{section.title}</p>
                    {section.subtitle && (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {section.subtitle}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {section.process_questionnaire_questions?.length ?? 0} perguntas
                  </span>
                </div>
              );
            })}
          </div>

          {/* CTA */}
          <Button
            size="lg"
            className="w-full gap-2 rounded-2xl text-base"
            onClick={() => {
              setPhase("questions");
              setCurrentStep(0);
              setQIndex(0);
            }}
          >
            Iniciar diagnóstico
            <ArrowRight className="h-5 w-5" />
          </Button>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Suas respostas ficam salvas. Você pode pausar e continuar depois.
          </p>
        </div>
      </FocusWrapper>
    );
  }

  // =========================================================================
  // SECTION DONE SCREEN
  // =========================================================================
  if (phase === "section-done") {
    const nextSection = sections[currentStep + 1];
    const NextIcon = getSectionIcon(currentStep + 1);
    const completedCount = sections.filter((s) => isSectionComplete(s, answers)).length;

    return (
      <FocusWrapper>
        <div className="w-full max-w-md text-center">
          {/* Check icon */}
          <div className="mb-6 flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2 className="h-10 w-10 text-primary" />
            </div>
          </div>

          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Etapa {currentStep + 1} concluída
          </p>
          <h2 className="mt-2 text-2xl font-bold">{currentSection?.title}</h2>
          {currentSection?.subtitle && (
            <p className="mt-1.5 text-sm text-muted-foreground">{currentSection.subtitle}</p>
          )}

          {/* Progress nudge */}
          <p className="mt-4 text-sm text-muted-foreground">
            {completedCount} de {sections.length} etapas concluídas
          </p>
          <div className="mx-auto mt-3 h-1.5 w-48 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.round((completedCount / sections.length) * 100)}%` }}
            />
          </div>

          {/* Next section preview */}
          {nextSection && (
            <div className="mt-8 rounded-2xl border border-border/60 bg-muted/30 p-4 text-left">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                A seguir
              </p>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <NextIcon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">{nextSection.title}</p>
                  {nextSection.subtitle && (
                    <p className="mt-0.5 text-sm text-muted-foreground">{nextSection.subtitle}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          <Button
            size="lg"
            className="mt-8 w-full gap-2 rounded-2xl"
            onClick={continueToNextSection}
          >
            Continuar
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </FocusWrapper>
    );
  }

  // =========================================================================
  // COMPLETION SCREEN
  // =========================================================================
  if (phase === "submitting-done") {
    return (
      <FocusWrapper>
        <div className="w-full max-w-md text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 ring-8 ring-primary/5">
              <Sparkles className="h-10 w-10 text-primary" />
            </div>
          </div>

          <h2 className="text-3xl font-bold">Diagnóstico concluído!</h2>
          <p className="mt-3 text-muted-foreground">
            Suas respostas foram salvas. O sistema está montando a estrutura inicial de processos do
            escritório.
          </p>

          {/* Stats */}
          <div className="mt-8 flex items-center justify-center gap-8">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">{sections.length}</p>
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

          {/* Loading */}
          <div className="mt-10 flex items-center justify-center gap-3 text-sm text-muted-foreground">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            Gerando lista de processos...
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Você será redirecionado automaticamente
          </p>
        </div>
      </FocusWrapper>
    );
  }

  // =========================================================================
  // QUESTIONS SCREEN  (phase === "questions")
  // =========================================================================
  if (!currentSection || !currentQuestion) {
    return null;
  }

  const CurrentSectionIcon = getSectionIcon(currentStep);

  const options = (currentQuestion.process_questionnaire_options ?? [])
    .filter((o) => o.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);

  const isLastQuestion = qIndex >= currentQuestions.length - 1;
  const isLastSection = currentStep >= sections.length - 1;
  const isVeryLast = isLastQuestion && isLastSection;

  const nextLabel = isVeryLast
    ? "Concluir diagnóstico"
    : isLastQuestion
    ? `Próxima: ${sections[currentStep + 1]?.title ?? "Próxima etapa"}`
    : "Próxima";

  return (
    <FocusWrapper>
      {/* ── FOCUS CARD ────────────────────────────────────────────────────── */}
      <div
        className="flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl"
        style={{ maxHeight: "calc(100vh - 130px)" }}
      >
        {/* ── [A] CARD HEADER: progress + section chips ─────────────────── */}
        <div className="shrink-0 border-b border-border/60 bg-card px-5 pt-4 pb-3">
          {/* Progress bar */}
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Stats row */}
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{progressPercent}% concluído</span>
            <span>
              {answeredQuestions} de {totalQuestions} respostas
            </span>
          </div>

          {/* Section chips */}
          <div className="mt-3 flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {sections.map((section, i) => {
              const Icon = getSectionIcon(i);
              const isActive = i === currentStep;
              const isDone = isSectionComplete(section, answers);

              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => jumpToSection(i)}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                    isActive
                      ? "border-primary bg-primary/10 text-primary"
                      : isDone
                      ? "border-primary/30 bg-primary/5 text-primary/70"
                      : "border-border/60 bg-background text-muted-foreground hover:bg-accent/20"
                  )}
                >
                  {isDone && !isActive ? (
                    <CheckCircle2 className="h-3 w-3 text-primary" />
                  ) : (
                    <Icon className="h-3 w-3" />
                  )}
                  {section.title}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── [B] CARD BODY: question + options ─────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {/* Section pill + counter */}
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2 rounded-full border border-border/60 bg-primary/5 px-3 py-1.5">
              <CurrentSectionIcon className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold text-primary">{currentSection.title}</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {qIndex + 1}&thinsp;/&thinsp;{currentQuestions.length}
            </span>
          </div>

          {/* Question text */}
          <div className="mb-5 space-y-2">
            <h2 className="text-xl font-semibold leading-snug tracking-tight">
              {currentQuestion.prompt}
              {currentQuestion.is_required && (
                <span className="ml-1 text-primary" aria-hidden="true">
                  *
                </span>
              )}
            </h2>
            {currentQuestion.helper_text && (
              <p className="text-sm text-muted-foreground">{currentQuestion.helper_text}</p>
            )}
          </div>

          {/* ── text / short_text ── */}
          {(currentQuestion.question_type === "text" ||
            currentQuestion.question_type === "short_text") && (
            <Input
              value={
                typeof answers[currentQuestion.id] === "string"
                  ? (answers[currentQuestion.id] as string)
                  : ""
              }
              onChange={(e) =>
                setAnswers((curr) => ({ ...curr, [currentQuestion.id]: e.target.value }))
              }
              placeholder="Digite sua resposta aqui..."
              className="h-12 rounded-xl text-base"
              autoFocus
            />
          )}

          {/* ── long_text ── */}
          {currentQuestion.question_type === "long_text" && (
            <Textarea
              rows={4}
              value={
                typeof answers[currentQuestion.id] === "string"
                  ? (answers[currentQuestion.id] as string)
                  : ""
              }
              onChange={(e) =>
                setAnswers((curr) => ({ ...curr, [currentQuestion.id]: e.target.value }))
              }
              placeholder="Descreva com suas palavras..."
              className="rounded-xl text-base"
              autoFocus
            />
          )}

          {/* ── single_select ── */}
          {currentQuestion.question_type === "single_select" && (
            <div className="space-y-2">
              {options.map((option) => {
                const isSelected = answers[currentQuestion.id] === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() =>
                      setAnswers((curr) => ({ ...curr, [currentQuestion.id]: option.id }))
                    }
                    className={cn(
                      "flex w-full items-center justify-between gap-4 rounded-xl border p-3.5 text-left transition-all",
                      isSelected
                        ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                        : "border-border/60 hover:border-border hover:bg-accent/20"
                    )}
                  >
                    <span className="space-y-0.5">
                      <span className="block text-sm font-medium">{option.label}</span>
                      {option.helper_text && (
                        <span className="block text-xs text-muted-foreground">
                          {option.helper_text}
                        </span>
                      )}
                    </span>
                    {isSelected && (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* ── multi_select ── */}
          {currentQuestion.question_type === "multi_select" && (
            <div className="space-y-2">
              <p className="mb-1 text-xs text-muted-foreground">Selecione todas que se aplicam</p>
              {options.map((option) => {
                const selected = Array.isArray(answers[currentQuestion.id])
                  ? (answers[currentQuestion.id] as string[])
                  : [];
                const isSelected = selected.includes(option.id);
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() =>
                      setAnswers((curr) => {
                        const prev = Array.isArray(curr[currentQuestion.id])
                          ? [...(curr[currentQuestion.id] as string[])]
                          : [];
                        return {
                          ...curr,
                          [currentQuestion.id]: isSelected
                            ? prev.filter((id) => id !== option.id)
                            : [...prev, option.id],
                        };
                      })
                    }
                    className={cn(
                      "flex w-full items-center justify-between gap-4 rounded-xl border p-3.5 text-left transition-all",
                      isSelected
                        ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                        : "border-border/60 hover:border-border hover:bg-accent/20"
                    )}
                  >
                    <span className="space-y-0.5">
                      <span className="block text-sm font-medium">{option.label}</span>
                      {option.helper_text && (
                        <span className="block text-xs text-muted-foreground">
                          {option.helper_text}
                        </span>
                      )}
                    </span>
                    {isSelected && (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Micro copy */}
          {!error && (
            <p className="mt-4 text-center text-xs text-muted-foreground">
              {isVeryLast
                ? "Ao concluir, vamos gerar a lista inicial de processos do escritório."
                : currentSection.description || "Você poderá ajustar essas informações depois."}
            </p>
          )}
        </div>

        {/* ── [C] CARD FOOTER: navigation ───────────────────────────────── */}
        <div className="shrink-0 border-t border-border/60 bg-card px-5 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Back */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={goToPrevQuestion}
              disabled={loading}
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Voltar
            </Button>

            {/* Dot indicators */}
            {currentQuestions.length > 1 && currentQuestions.length <= 10 && (
              <div className="flex items-center gap-1">
                {currentQuestions.map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-300",
                      i === qIndex ? "w-5 bg-primary" : "w-1.5 bg-border"
                    )}
                  />
                ))}
              </div>
            )}

            {/* Next / Submit */}
            <Button
              type="button"
              size="sm"
              onClick={goToNextQuestion}
              disabled={loading}
              className="gap-1.5"
            >
              {loading ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-background border-t-transparent" />
                  Salvando...
                </>
              ) : (
                <>
                  {nextLabel}
                  {!isVeryLast && <ArrowRight className="h-4 w-4" />}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </FocusWrapper>
  );
}
