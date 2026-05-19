"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addOfficeDemandFormOption,
  addOfficeDemandFormQuestion,
  addOfficeDemandFormSection,
  deleteOfficeDemandFormOption,
  deleteOfficeDemandFormQuestion,
  deleteOfficeDemandFormSection,
  regenerateOfficeDemandFormToken,
  reorderOfficeDemandFormQuestions,
  reorderOfficeDemandFormSections,
  updateOfficeDemandForm,
  updateOfficeDemandFormOption,
  updateOfficeDemandFormQuestion,
  updateOfficeDemandFormSection,
} from "./actions";
import type { FormQuestionType, OfficeDemandForm } from "@/types/database";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp, Copy, ExternalLink, Plus, RotateCcw, Trash2 } from "lucide-react";

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
  office_demand_form_id: string;
  section_id: string;
  prompt: string;
  helper_text: string | null;
  question_type: FormQuestionType;
  is_required: boolean;
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

type InitialData = {
  form: OfficeDemandForm;
  sections: SectionRow[];
  questions: QuestionRow[];
};

const QUESTION_TYPES: { value: FormQuestionType; label: string }[] = [
  { value: "short_text", label: "Texto curto" },
  { value: "long_text", label: "Parágrafo" },
  { value: "single_select", label: "Escolha única" },
  { value: "multi_select", label: "Caixas de seleção" },
];

function publicUrl(token: string) {
  if (typeof window === "undefined") return `/demandas/abrir/${token}`;
  return `${window.location.origin}/demandas/abrir/${token}`;
}

export function OfficeDemandFormBuilder({ initialData }: { initialData: InitialData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState(initialData.form.title);
  const [description, setDescription] = useState(initialData.form.description ?? "");
  const [isActive, setIsActive] = useState(initialData.form.is_active);
  const [newSectionTitle, setNewSectionTitle] = useState("");

  const sections = useMemo(
    () =>
      initialData.sections
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((section) => ({
          ...section,
          questions: initialData.questions
            .filter((question) => question.section_id === section.id)
            .sort((a, b) => a.sort_order - b.sort_order),
        })),
    [initialData]
  );

  const totalQuestions = initialData.questions.length;
  const link = publicUrl(initialData.form.public_token);

  async function run(action: () => Promise<{ error?: string; success?: boolean }>) {
    setError(null);
    const result = await action();
    if (result.error) {
      setError(result.error);
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Configuração geral</CardTitle>
              <CardDescription>
                Esta é a cópia independente do formulário padrão para o seu escritório.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant={isActive ? "success" : "secondary"}>
                {isActive ? "Público ativo" : "Desativado"}
              </Badge>
              <Badge variant="outline">
                {sections.length} etapa{sections.length === 1 ? "" : "s"}
              </Badge>
              <Badge variant="outline">
                {totalQuestions} pergunta{totalQuestions === 1 ? "" : "s"}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input value={title} onChange={(event) => setTitle(event.target.value)} />
            </div>
            <label className="flex items-center gap-2 pt-8">
              <Switch checked={isActive} onCheckedChange={setIsActive} />
              <span className="text-sm">Permitir envio pelo link público</span>
            </label>
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Explique quando este formulário deve ser usado."
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={isPending || !title.trim()}
              onClick={() =>
                run(() =>
                  updateOfficeDemandForm({
                    title,
                    description,
                    isActive,
                  })
                )
              }
            >
              Salvar configuração
            </Button>
            <Button
              variant="outline"
              disabled={isPending}
              onClick={() => navigator.clipboard.writeText(link)}
            >
              <Copy className="h-4 w-4" />
              Copiar link
            </Button>
            <a
              href={link}
              target="_blank"
              rel="noreferrer"
              className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
            >
              <ExternalLink className="h-4 w-4" />
              Abrir link
            </a>
            <Button
              variant="outline"
              disabled={isPending}
              onClick={() => {
                if (confirm("Regenerar o link público? O link antigo deixará de funcionar.")) {
                  run(regenerateOfficeDemandFormToken);
                }
              }}
            >
              <RotateCcw className="h-4 w-4" />
              Regenerar link
            </Button>
          </div>
          <div className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground break-all">
            {link}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Etapas e perguntas</CardTitle>
          <CardDescription>
            Edite o conteúdo que será apresentado para as áreas solicitantes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (!newSectionTitle.trim()) return;
              run(() => addOfficeDemandFormSection({ title: newSectionTitle })).then(() =>
                setNewSectionTitle("")
              );
            }}
          >
            <Input
              value={newSectionTitle}
              onChange={(event) => setNewSectionTitle(event.target.value)}
              placeholder="Nova etapa"
            />
            <Button type="submit" disabled={isPending || !newSectionTitle.trim()}>
              <Plus className="h-4 w-4" />
              Etapa
            </Button>
          </form>

          {sections.map((section, index) => (
            <SectionEditor
              key={section.id}
              section={section}
              index={index}
              totalSections={sections.length}
              allSectionIds={sections.map((item) => item.id)}
              run={run}
              isPending={isPending}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function SectionEditor({
  section,
  index,
  totalSections,
  allSectionIds,
  run,
  isPending,
}: {
  section: SectionRow & { questions: QuestionRow[] };
  index: number;
  totalSections: number;
  allSectionIds: string[];
  run: (action: () => Promise<{ error?: string; success?: boolean }>) => Promise<void>;
  isPending: boolean;
}) {
  const [title, setTitle] = useState(section.title);
  const [subtitle, setSubtitle] = useState(section.subtitle ?? "");
  const [description, setDescription] = useState(section.description ?? "");
  const [newQuestionPrompt, setNewQuestionPrompt] = useState("");
  const [newQuestionType, setNewQuestionType] = useState<FormQuestionType>("short_text");

  const moveSection = (direction: -1 | 1) => {
    const next = [...allSectionIds];
    const targetIndex = index + direction;
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    run(() => reorderOfficeDemandFormSections(next));
  };

  return (
    <div className="rounded-xl border border-border/60 p-4">
      <div className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Etapa</Label>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Subtítulo</Label>
            <Input value={subtitle} onChange={(event) => setSubtitle(event.target.value)} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Descrição</Label>
          <Textarea
            rows={2}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={isPending || !title.trim()}
            onClick={() =>
              run(() =>
                updateOfficeDemandFormSection(section.id, {
                  title,
                  subtitle,
                  description,
                })
              )
            }
          >
            Salvar etapa
          </Button>
          <Button size="sm" variant="outline" disabled={isPending || index === 0} onClick={() => moveSection(-1)}>
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={isPending || index === totalSections - 1}
            onClick={() => moveSection(1)}
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={isPending}
            onClick={() => {
              if (confirm("Excluir esta etapa e suas perguntas?")) {
                run(() => deleteOfficeDemandFormSection(section.id));
              }
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mt-4 space-y-3 border-t pt-4">
        <form
          className="grid gap-2 md:grid-cols-[1fr_180px_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            if (!newQuestionPrompt.trim()) return;
            run(() =>
              addOfficeDemandFormQuestion(section.id, {
                prompt: newQuestionPrompt,
                questionType: newQuestionType,
                isRequired: true,
              })
            ).then(() => setNewQuestionPrompt(""));
          }}
        >
          <Input
            value={newQuestionPrompt}
            onChange={(event) => setNewQuestionPrompt(event.target.value)}
            placeholder="Nova pergunta"
          />
          <Select
            value={newQuestionType}
            onChange={(event) => setNewQuestionType(event.target.value as FormQuestionType)}
          >
            {QUESTION_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </Select>
          <Button type="submit" disabled={isPending || !newQuestionPrompt.trim()}>
            <Plus className="h-4 w-4" />
            Pergunta
          </Button>
        </form>

        {section.questions.map((question, questionIndex) => (
          <QuestionEditor
            key={question.id}
            question={question}
            questionIndex={questionIndex}
            questionIds={section.questions.map((item) => item.id)}
            run={run}
            isPending={isPending}
          />
        ))}
      </div>
    </div>
  );
}

function QuestionEditor({
  question,
  questionIndex,
  questionIds,
  run,
  isPending,
}: {
  question: QuestionRow;
  questionIndex: number;
  questionIds: string[];
  run: (action: () => Promise<{ error?: string; success?: boolean }>) => Promise<void>;
  isPending: boolean;
}) {
  const [prompt, setPrompt] = useState(question.prompt);
  const [helperText, setHelperText] = useState(question.helper_text ?? "");
  const [questionType, setQuestionType] = useState<FormQuestionType>(question.question_type);
  const [isRequired, setIsRequired] = useState(question.is_required);
  const [newOptionLabel, setNewOptionLabel] = useState("");
  const options = (question.office_demand_form_options ?? []).slice().sort((a, b) => a.sort_order - b.sort_order);
  const needsOptions = questionType === "single_select" || questionType === "multi_select";

  const moveQuestion = (direction: -1 | 1) => {
    const next = [...questionIds];
    const targetIndex = questionIndex + direction;
    [next[questionIndex], next[targetIndex]] = [next[targetIndex], next[questionIndex]];
    run(() => reorderOfficeDemandFormQuestions(question.section_id, next));
  };

  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
      <div className="grid gap-3 md:grid-cols-[1fr_180px]">
        <div className="space-y-2">
          <Label>Pergunta</Label>
          <Input value={prompt} onChange={(event) => setPrompt(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Tipo</Label>
          <Select
            value={questionType}
            onChange={(event) => setQuestionType(event.target.value as FormQuestionType)}
          >
            {QUESTION_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div className="mt-3 space-y-2">
        <Label>Texto de ajuda</Label>
        <Input value={helperText} onChange={(event) => setHelperText(event.target.value)} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2">
          <Switch checked={isRequired} onCheckedChange={setIsRequired} />
          <span className="text-sm">Obrigatória</span>
        </label>
        <Button
          size="sm"
          disabled={isPending || !prompt.trim()}
          onClick={() =>
            run(() =>
              updateOfficeDemandFormQuestion(question.id, {
                prompt,
                helperText,
                questionType,
                isRequired,
              })
            )
          }
        >
          Salvar pergunta
        </Button>
        <Button size="sm" variant="outline" disabled={isPending || questionIndex === 0} onClick={() => moveQuestion(-1)}>
          <ArrowUp className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={isPending || questionIndex === questionIds.length - 1}
          onClick={() => moveQuestion(1)}
        >
          <ArrowDown className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="destructive"
          disabled={isPending}
          onClick={() => {
            if (confirm("Excluir esta pergunta?")) {
              run(() => deleteOfficeDemandFormQuestion(question.id));
            }
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {needsOptions && (
        <div className="mt-4 space-y-2 border-t pt-3">
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (!newOptionLabel.trim()) return;
              run(() => addOfficeDemandFormOption(question.id, { label: newOptionLabel })).then(() =>
                setNewOptionLabel("")
              );
            }}
          >
            <Input
              value={newOptionLabel}
              onChange={(event) => setNewOptionLabel(event.target.value)}
              placeholder="Nova alternativa"
            />
            <Button type="submit" size="sm" disabled={isPending || !newOptionLabel.trim()}>
              <Plus className="h-4 w-4" />
              Alternativa
            </Button>
          </form>
          {options.map((option) => (
            <OptionEditor key={option.id} option={option} run={run} isPending={isPending} />
          ))}
        </div>
      )}
    </div>
  );
}

function OptionEditor({
  option,
  run,
  isPending,
}: {
  option: OptionRow;
  run: (action: () => Promise<{ error?: string; success?: boolean }>) => Promise<void>;
  isPending: boolean;
}) {
  const [label, setLabel] = useState(option.label);
  const [isActive, setIsActive] = useState(option.is_active);

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md bg-background p-2">
      <Input
        className="min-w-56 flex-1"
        value={label}
        onChange={(event) => setLabel(event.target.value)}
      />
      <label className="flex items-center gap-2">
        <Switch checked={isActive} onCheckedChange={setIsActive} />
        <span className="text-sm">Ativa</span>
      </label>
      <Button
        size="sm"
        variant="outline"
        disabled={isPending || !label.trim()}
        onClick={() => run(() => updateOfficeDemandFormOption(option.id, { label, isActive }))}
      >
        Salvar
      </Button>
      <Button
        size="sm"
        variant="destructive"
        disabled={isPending}
        onClick={() => run(() => deleteOfficeDemandFormOption(option.id))}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
