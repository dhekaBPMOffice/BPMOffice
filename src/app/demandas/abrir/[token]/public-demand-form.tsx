"use client";

import { useMemo, useState } from "react";
import { submitPublicDemand } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type OptionRow = {
  id: string;
  label: string;
  value: string | null;
  helper_text: string | null;
  sort_order: number;
  is_active: boolean;
};

type QuestionRow = {
  id: string;
  section_id: string;
  prompt: string;
  helper_text: string | null;
  question_type: "short_text" | "long_text" | "single_select" | "multi_select";
  is_required: boolean;
  demand_field_key: string | null;
  sort_order: number;
  office_demand_form_options?: OptionRow[];
};

type SectionRow = {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  sort_order: number;
};

type FormRow = {
  id: string;
  title: string;
  description: string | null;
  public_token: string;
  is_active: boolean;
  offices?: { name: string } | { name: string }[] | null;
};

function getOfficeName(form: FormRow) {
  const office = Array.isArray(form.offices) ? form.offices[0] : form.offices;
  return office?.name;
}

export function PublicDemandForm({
  token,
  form,
  sections,
  questions,
}: {
  token: string;
  form: FormRow;
  sections: SectionRow[];
  questions: QuestionRow[];
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successCode, setSuccessCode] = useState<string | null>(null);

  const groupedSections = useMemo(
    () =>
      sections
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((section) => ({
          ...section,
          questions: questions
            .filter((question) => question.section_id === section.id)
            .sort((a, b) => a.sort_order - b.sort_order),
        })),
    [sections, questions]
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const answers = questions.map((question) => {
      if (question.question_type === "multi_select") {
        return {
          questionId: question.id,
          selectedOptionIds: formData.getAll(`question_${question.id}`).map(String),
        };
      }
      if (question.question_type === "single_select") {
        const selected = formData.get(`question_${question.id}`);
        return {
          questionId: question.id,
          selectedOptionIds: selected ? [String(selected)] : [],
        };
      }
      return {
        questionId: question.id,
        answerText: String(formData.get(`question_${question.id}`) ?? ""),
      };
    });

    const result = await submitPublicDemand(token, {
      answers,
    });

    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setSuccessCode(result.code ?? null);
  }

  if (successCode) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Demanda enviada</CardTitle>
          <CardDescription>
            Sua solicitação foi registrada e será analisada pelo Escritório de Processos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Código da solicitação: <span className="font-medium text-foreground">{successCode}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Guarde esse código caso precise consultar o escritório posteriormente.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{form.title}</CardTitle>
        <CardDescription>
          {form.description || "Preencha os dados abaixo para solicitar uma demanda ao Escritório de Processos."}
          {getOfficeName(form) ? ` Escritório: ${getOfficeName(form)}.` : ""}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          {groupedSections.map((section) => (
            <section key={section.id} className="space-y-4 border-t pt-6 first:border-t-0 first:pt-0">
              <div>
                <h2 className="text-base font-semibold">{section.title}</h2>
                {section.subtitle && <p className="text-sm text-muted-foreground">{section.subtitle}</p>}
                {section.description && <p className="text-sm text-muted-foreground">{section.description}</p>}
              </div>
              {section.questions.map((question) => (
                <QuestionField key={question.id} question={question} />
              ))}
            </section>
          ))}

          <Button type="submit" disabled={submitting}>
            {submitting ? "Enviando..." : "Enviar demanda"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function QuestionField({ question }: { question: QuestionRow }) {
  const name = `question_${question.id}`;
  const options = (question.office_demand_form_options ?? [])
    .filter((option) => option.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="space-y-2">
      <Label htmlFor={name}>
        {question.prompt}
        {question.is_required ? " *" : ""}
      </Label>
      {question.helper_text && (
        <p className="text-sm text-muted-foreground">{question.helper_text}</p>
      )}
      {question.question_type === "long_text" && (
        <Textarea id={name} name={name} required={question.is_required} rows={4} />
      )}
      {question.question_type === "short_text" && (
        <Input
          id={name}
          name={name}
          type={question.demand_field_key === "requester_email" ? "email" : "text"}
          required={question.is_required}
        />
      )}
      {question.question_type === "single_select" && (
        <Select id={name} name={name} required={question.is_required} defaultValue="">
          <option value="" disabled>
            Selecione
          </option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </Select>
      )}
      {question.question_type === "multi_select" && (
        <div className="space-y-2">
          {options.map((option) => (
            <label key={option.id} className="flex items-start gap-2 rounded-lg border border-border/60 p-3">
              <input
                type="checkbox"
                name={name}
                value={option.id}
                className="mt-1"
              />
              <span>
                <span className="block text-sm font-medium">{option.label}</span>
                {option.helper_text && (
                  <span className="block text-sm text-muted-foreground">{option.helper_text}</span>
                )}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
