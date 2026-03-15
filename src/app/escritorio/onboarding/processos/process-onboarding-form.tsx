"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitProcessOnboarding } from "@/app/escritorio/processos/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Questionnaire = {
  id: string;
  title: string;
  description: string | null;
  process_questionnaire_questions?: {
    id: string;
    prompt: string;
    helper_text: string | null;
    question_type: "text" | "short_text" | "long_text" | "single_select" | "multi_select";
    is_required: boolean;
    sort_order: number;
    process_questionnaire_options?: {
      id: string;
      label: string;
      value: string | null;
      helper_text: string | null;
      sort_order: number;
      is_active: boolean;
    }[];
  }[];
};

export function ProcessOnboardingForm({
  questionnaire,
}: {
  questionnaire: Questionnaire;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const orderedQuestions = (questionnaire.process_questionnaire_questions ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await submitProcessOnboarding(answers);
    if ("error" in result && result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push("/escritorio/processos");
    router.refresh();
  }

  return (
    <Card className="mx-auto w-full max-w-4xl">
      <CardHeader>
        <CardTitle>{questionnaire.title}</CardTitle>
        <CardDescription>
          {questionnaire.description ||
            "Suas respostas serão usadas para estruturar a área inicial de processos do escritório."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-8">
          {orderedQuestions.map((question, index) => {
            const options = (question.process_questionnaire_options ?? [])
              .filter((option) => option.is_active)
              .sort((a, b) => a.sort_order - b.sort_order);

            return (
              <div key={question.id} className="space-y-4 rounded-xl border border-border/60 p-5">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    Pergunta {index + 1}
                  </p>
                  <Label className="text-base font-semibold leading-snug">
                    {question.prompt}
                    {question.is_required && " *"}
                  </Label>
                  {question.helper_text && (
                    <p className="text-sm text-muted-foreground">{question.helper_text}</p>
                  )}
                </div>

                {(question.question_type === "text" ||
                  question.question_type === "short_text") && (
                  <Input
                    value={typeof answers[question.id] === "string" ? (answers[question.id] as string) : ""}
                    onChange={(e) =>
                      setAnswers((current) => ({
                        ...current,
                        [question.id]: e.target.value,
                      }))
                    }
                    placeholder="Digite sua resposta"
                  />
                )}

                {question.question_type === "long_text" && (
                  <Textarea
                    rows={4}
                    value={typeof answers[question.id] === "string" ? (answers[question.id] as string) : ""}
                    onChange={(e) =>
                      setAnswers((current) => ({
                        ...current,
                        [question.id]: e.target.value,
                      }))
                    }
                    placeholder="Digite sua resposta"
                  />
                )}

                {question.question_type === "single_select" && (
                  <div className="space-y-3">
                    {options.map((option) => (
                      <label
                        key={option.id}
                        className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/60 p-3"
                      >
                        <input
                          type="radio"
                          name={question.id}
                          value={option.id}
                          checked={answers[question.id] === option.id}
                          onChange={() =>
                            setAnswers((current) => ({
                              ...current,
                              [question.id]: option.id,
                            }))
                          }
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
                    ))}
                  </div>
                )}

                {question.question_type === "multi_select" && (
                  <div className="space-y-3">
                    {options.map((option) => {
                      const currentValue = Array.isArray(answers[question.id])
                        ? (answers[question.id] as string[])
                        : [];

                      return (
                        <label
                          key={option.id}
                          className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/60 p-3"
                        >
                          <input
                            type="checkbox"
                            checked={currentValue.includes(option.id)}
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

          <div className="flex justify-end">
            <Button type="submit" disabled={loading}>
              {loading ? "Gerando lista de processos..." : "Finalizar questionário"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
