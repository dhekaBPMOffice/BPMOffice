"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Circle,
  ClipboardList,
  Copy,
  ExternalLink,
  Plus,
  RotateCcw,
  Square,
  Trash2,
} from "lucide-react";

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

type SectionItem = SectionRow & {
  questions: QuestionRow[];
};

type InitialData = {
  form: OfficeDemandForm;
  sections: SectionRow[];
  questions: QuestionRow[];
};

type SaveStatus = "idle" | "saving" | "saved" | "error";

const QUESTION_TYPES: { value: FormQuestionType; label: string }[] = [
  { value: "short_text", label: "Texto curto" },
  { value: "long_text", label: "Parágrafo" },
  { value: "single_select", label: "Escolha única" },
  { value: "multi_select", label: "Caixas de seleção" },
  { value: "date", label: "Data" },
  { value: "file_upload", label: "Upload de arquivos" },
];

function publicUrl(token: string) {
  if (typeof window === "undefined") return `/demandas/abrir/${token}`;
  return `${window.location.origin}/demandas/abrir/${token}`;
}

function useAutosave(
  enabled: boolean,
  save: () => Promise<void>,
  deps: React.DependencyList,
  delay = 700
) {
  const didStart = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    if (!didStart.current) {
      didStart.current = true;
      return;
    }

    const timeout = window.setTimeout(() => {
      void save();
    }, delay);

    return () => window.clearTimeout(timeout);
  }, deps);
}

function questionTypeLabel(questionType: FormQuestionType) {
  return QUESTION_TYPES.find((type) => type.value === questionType)?.label ?? questionType;
}

function ChoiceMarker({ questionType }: { questionType: FormQuestionType }) {
  const Icon = questionType === "multi_select" ? Square : Circle;
  return <Icon className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />;
}

export function OfficeDemandFormBuilder({ initialData }: { initialData: InitialData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState(initialData.form.title);
  const [description, setDescription] = useState(initialData.form.description ?? "");
  const [isActive, setIsActive] = useState(initialData.form.is_active);
  const [usesSections, setUsesSections] = useState(initialData.form.uses_sections ?? true);
  const [showConfig, setShowConfig] = useState(false);
  const [metaStatus, setMetaStatus] = useState<SaveStatus>("idle");
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [addingSection, setAddingSection] = useState(false);
  const [expandedSectionId, setExpandedSectionId] = useState<string | null>(
    initialData.sections[0]?.id ?? null
  );
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);

  const groupedSections = useMemo<SectionItem[]>(
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

  const firstSection = groupedSections[0] ?? null;
  const visibleSections = useMemo<SectionItem[]>(() => {
    if (usesSections) return groupedSections;
    if (!firstSection) return [];
    return [
      {
        ...firstSection,
        title: "Perguntas",
        subtitle: null,
        description: null,
        questions: groupedSections
          .flatMap((section) => section.questions)
          .sort((a, b) => a.sort_order - b.sort_order),
      },
    ];
  }, [firstSection, groupedSections, usesSections]);

  const totalQuestions = initialData.questions.length;
  const link = publicUrl(initialData.form.public_token);

  async function run(
    action: () => Promise<{ error?: string; success?: boolean }>,
    options: { refresh?: boolean } = { refresh: true }
  ) {
    setError(null);
    const result = await action();
    if (result.error) {
      setError(result.error);
      return false;
    }
    if (options.refresh !== false) {
      startTransition(() => router.refresh());
    }
    return true;
  }

  const saveMeta = useCallback(async () => {
    if (!title.trim()) return;
    setMetaStatus("saving");
    const ok = await run(
      () =>
        updateOfficeDemandForm({
          title,
          description,
          isActive,
          usesSections,
        }),
      { refresh: false }
    );
    setMetaStatus(ok ? "saved" : "error");
  }, [description, isActive, title, usesSections]);

  useAutosave(true, saveMeta, [title, description, isActive, usesSections]);

  async function handleAddSection(event: React.FormEvent) {
    event.preventDefault();
    if (!newSectionTitle.trim()) return;

    setAddingSection(true);
    const ok = await run(() => addOfficeDemandFormSection({ title: newSectionTitle.trim() }));
    if (ok) setNewSectionTitle("");
    setAddingSection(false);
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-border/60 bg-card p-6">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant={isActive ? "success" : "secondary"}>
            {isActive ? "Público ativo" : "Desativado"}
          </Badge>
          <Badge variant="outline">{usesSections ? "Com etapas" : "Sem etapas"}</Badge>
          <Badge variant="outline">
            {visibleSections.length} etapa{visibleSections.length === 1 ? "" : "s"}
          </Badge>
          <Badge variant="outline">
            {totalQuestions} pergunta{totalQuestions === 1 ? "" : "s"}
          </Badge>
          {metaStatus === "saving" && <Badge variant="outline">Salvando...</Badge>}
          {metaStatus === "saved" && <Badge variant="outline">Salvo</Badge>}
          {metaStatus === "error" && <Badge variant="destructive">Erro ao salvar</Badge>}
        </div>

        <button
          type="button"
          onClick={() => setShowConfig((current) => !current)}
          className="mt-4 flex w-full items-center gap-3 rounded-xl border border-border/60 bg-background px-4 py-3 text-left"
        >
          {showConfig ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <div className="flex-1">
            <p className="font-medium">Configuração geral</p>
            <p className="text-sm text-muted-foreground">
              Defina o conteúdo do formulário e o comportamento do link público.
            </p>
          </div>
        </button>

        {showConfig && (
          <div className="mt-4 space-y-4 border-t pt-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Título</Label>
                <Input value={title} onChange={(event) => setTitle(event.target.value)} />
              </div>
              <div className="flex flex-wrap items-center gap-6 pt-7">
                <label className="flex items-center gap-2">
                  <Switch checked={isActive} onCheckedChange={setIsActive} />
                  <span className="text-sm">Permitir envio pelo link público</span>
                </label>
                <label className="flex items-center gap-2">
                  <Switch checked={usesSections} onCheckedChange={setUsesSections} />
                  <span className="text-sm">Organizar em etapas</span>
                </label>
              </div>
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
                type="button"
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
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => {
                  if (confirm("Regenerar o link público? O link antigo deixará de funcionar.")) {
                    void run(regenerateOfficeDemandFormToken);
                  }
                }}
              >
                <RotateCcw className="h-4 w-4" />
                Regenerar link
              </Button>
            </div>

            <div className="break-all rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">
              {link}
            </div>
            <p className="text-xs text-muted-foreground">
              As alterações são salvas automaticamente.
            </p>
          </div>
        )}
      </div>

      {visibleSections.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Nenhuma etapa cadastrada"
          description="Crie a primeira etapa para começar a estruturar o formulário."
        />
      ) : (
        <div className="space-y-4">
          {visibleSections.map((section, index) => (
            <SectionEditor
              key={section.id}
              section={section}
              index={index}
              totalSections={visibleSections.length}
              allSectionIds={visibleSections.map((item) => item.id)}
              usesSections={usesSections}
              isOpen={expandedSectionId === section.id || !usesSections}
              expandedQuestionId={expandedQuestionId}
              isPending={isPending}
              onToggle={() =>
                setExpandedSectionId((current) => (current === section.id ? null : section.id))
              }
              onExpandQuestion={setExpandedQuestionId}
              run={run}
            />
          ))}
        </div>
      )}

      {usesSections && (
        <form
          onSubmit={handleAddSection}
          className="flex items-center gap-3 rounded-2xl border border-dashed border-border/60 bg-muted/20 p-4"
        >
          <Plus className="h-5 w-5 shrink-0 text-muted-foreground" />
          <Input
            value={newSectionTitle}
            onChange={(event) => setNewSectionTitle(event.target.value)}
            placeholder="Adicionar nova etapa"
            required
            className="border-0 bg-transparent shadow-none"
          />
          <Button type="submit" disabled={addingSection || !newSectionTitle.trim()}>
            {addingSection ? "Criando..." : "Criar etapa"}
          </Button>
        </form>
      )}
    </div>
  );
}

function SectionEditor({
  section,
  index,
  totalSections,
  allSectionIds,
  usesSections,
  isOpen,
  expandedQuestionId,
  isPending,
  onToggle,
  onExpandQuestion,
  run,
}: {
  section: SectionItem;
  index: number;
  totalSections: number;
  allSectionIds: string[];
  usesSections: boolean;
  isOpen: boolean;
  expandedQuestionId: string | null;
  isPending: boolean;
  onToggle: () => void;
  onExpandQuestion: (questionId: string | null) => void;
  run: (
    action: () => Promise<{ error?: string; success?: boolean }>,
    options?: { refresh?: boolean }
  ) => Promise<boolean>;
}) {
  const [title, setTitle] = useState(section.title);
  const [subtitle, setSubtitle] = useState(section.subtitle ?? "");
  const [description, setDescription] = useState(section.description ?? "");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [newQuestionPrompt, setNewQuestionPrompt] = useState("");
  const [newQuestionType, setNewQuestionType] = useState<FormQuestionType>("short_text");
  const [addingQuestion, setAddingQuestion] = useState(false);

  useEffect(() => {
    setTitle(section.title);
    setSubtitle(section.subtitle ?? "");
    setDescription(section.description ?? "");
  }, [section]);

  const saveSection = useCallback(async () => {
    if (!usesSections || !title.trim()) return;
    setSaveStatus("saving");
    const ok = await run(
      () =>
        updateOfficeDemandFormSection(section.id, {
          title,
          subtitle,
          description,
        }),
      { refresh: false }
    );
    setSaveStatus(ok ? "saved" : "error");
  }, [description, run, section.id, subtitle, title, usesSections]);

  useAutosave(usesSections, saveSection, [title, subtitle, description, usesSections]);

  function moveSection(direction: -1 | 1) {
    const next = [...allSectionIds];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= next.length) return;
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    void run(() => reorderOfficeDemandFormSections(next));
  }

  async function handleAddQuestion(event: React.FormEvent) {
    event.preventDefault();
    if (!newQuestionPrompt.trim()) return;

    setAddingQuestion(true);
    const ok = await run(() =>
      addOfficeDemandFormQuestion(section.id, {
        prompt: newQuestionPrompt.trim(),
        questionType: newQuestionType,
        isRequired: true,
      })
    );
    if (ok) {
      setNewQuestionPrompt("");
      setNewQuestionType("short_text");
    }
    setAddingQuestion(false);
  }

  function moveQuestion(questionIndex: number, direction: -1 | 1) {
    const next = section.questions.map((question) => question.id);
    const targetIndex = questionIndex + direction;
    if (targetIndex < 0 || targetIndex >= next.length) return;
    [next[questionIndex], next[targetIndex]] = [next[targetIndex], next[questionIndex]];
    void run(() => reorderOfficeDemandFormQuestions(section.id, next));
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
      <div className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
        <button
          type="button"
          onClick={onToggle}
          className="flex flex-1 items-center gap-3 text-left"
        >
          {isOpen ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {usesSections && <Badge variant="outline">Etapa {index + 1}</Badge>}
              <span className="font-medium">{usesSections ? title : "Perguntas"}</span>
              {saveStatus === "saving" && <Badge variant="outline">Salvando...</Badge>}
              {saveStatus === "saved" && <Badge variant="outline">Salvo</Badge>}
              {saveStatus === "error" && <Badge variant="destructive">Erro</Badge>}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {section.questions.length} pergunta{section.questions.length === 1 ? "" : "s"}
            </p>
          </div>
        </button>

        {usesSections && (
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => moveSection(-1)}
              disabled={isPending || index === 0}
              aria-label="Mover etapa para cima"
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => moveSection(1)}
              disabled={isPending || index === totalSections - 1}
              aria-label="Mover etapa para baixo"
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => {
                if (confirm("Excluir esta etapa e suas perguntas?")) {
                  void run(() => deleteOfficeDemandFormSection(section.id));
                }
              }}
              disabled={isPending}
              aria-label="Excluir etapa"
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {isOpen && (
        <div className="space-y-4 p-4">
          {usesSections && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Título da etapa</Label>
                  <Input value={title} onChange={(event) => setTitle(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Subtítulo</Label>
                  <Input
                    value={subtitle}
                    onChange={(event) => setSubtitle(event.target.value)}
                    placeholder="Ex: Conheça melhor a operação"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Breve descrição</Label>
                <Textarea
                  rows={2}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Explique o objetivo desta etapa antes das perguntas."
                />
              </div>
            </div>
          )}

          {section.questions.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="Nenhuma pergunta nesta etapa"
              description="Adicione a primeira pergunta para começar a compor este bloco."
            />
          ) : (
            <div className="space-y-3">
              {section.questions.map((question, questionIndex) => (
                <QuestionEditor
                  key={question.id}
                  question={question}
                  questionIndex={questionIndex}
                  questionCount={section.questions.length}
                  isOpen={expandedQuestionId === question.id}
                  isPending={isPending}
                  onToggle={() =>
                    onExpandQuestion(expandedQuestionId === question.id ? null : question.id)
                  }
                  onMoveUp={() => moveQuestion(questionIndex, -1)}
                  onMoveDown={() => moveQuestion(questionIndex, 1)}
                  run={run}
                />
              ))}
            </div>
          )}

          <form
            onSubmit={handleAddQuestion}
            className="flex items-center gap-2 rounded-xl border border-dashed border-border/60 bg-muted/20 p-4"
          >
            <Plus className="h-5 w-5 shrink-0 text-muted-foreground" />
            <Input
              value={newQuestionPrompt}
              onChange={(event) => setNewQuestionPrompt(event.target.value)}
              placeholder="Adicionar pergunta nesta etapa"
              required
              className="border-0 bg-transparent shadow-none"
            />
            <Select
              value={newQuestionType}
              onChange={(event) => setNewQuestionType(event.target.value as FormQuestionType)}
              className="w-48"
            >
              {QUESTION_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </Select>
            <Button type="submit" size="sm" disabled={addingQuestion || !newQuestionPrompt.trim()}>
              {addingQuestion ? "Adicionando..." : "Adicionar"}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}

function QuestionEditor({
  question,
  questionIndex,
  questionCount,
  isOpen,
  isPending,
  onToggle,
  onMoveUp,
  onMoveDown,
  run,
}: {
  question: QuestionRow;
  questionIndex: number;
  questionCount: number;
  isOpen: boolean;
  isPending: boolean;
  onToggle: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  run: (
    action: () => Promise<{ error?: string; success?: boolean }>,
    options?: { refresh?: boolean }
  ) => Promise<boolean>;
}) {
  const [prompt, setPrompt] = useState(question.prompt);
  const [helperText, setHelperText] = useState(question.helper_text ?? "");
  const [questionType, setQuestionType] = useState<FormQuestionType>(question.question_type);
  const [isRequired, setIsRequired] = useState(question.is_required);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [newOptionLabel, setNewOptionLabel] = useState("");
  const options = (question.office_demand_form_options ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order);
  const needsOptions = questionType === "single_select" || questionType === "multi_select";

  useEffect(() => {
    setPrompt(question.prompt);
    setHelperText(question.helper_text ?? "");
    setQuestionType(question.question_type);
    setIsRequired(question.is_required);
  }, [question]);

  const saveQuestion = useCallback(async () => {
    if (!prompt.trim()) return;
    setSaveStatus("saving");
    const ok = await run(
      () =>
        updateOfficeDemandFormQuestion(question.id, {
          prompt,
          helperText,
          questionType,
          isRequired,
        }),
      { refresh: false }
    );
    setSaveStatus(ok ? "saved" : "error");
  }, [helperText, isRequired, prompt, question.id, questionType, run]);

  useAutosave(isOpen, saveQuestion, [prompt, helperText, questionType, isRequired, isOpen]);

  async function handleAddOption(event: React.FormEvent) {
    event.preventDefault();
    if (!newOptionLabel.trim()) return;
    const ok = await run(() => addOfficeDemandFormOption(question.id, { label: newOptionLabel.trim() }));
    if (ok) setNewOptionLabel("");
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-background">
      <div className="flex items-center gap-2 border-b border-border/60 px-4 py-2">
        <button
          type="button"
          onClick={onToggle}
          className="flex flex-1 items-center gap-3 py-2 text-left"
        >
          {isOpen ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-sm text-muted-foreground">
            {questionIndex + 1}. {questionTypeLabel(questionType)}
            {isRequired ? " *" : ""}
          </span>
          <span className="truncate font-medium">{prompt}</span>
          {saveStatus === "saving" && <Badge variant="outline">Salvando...</Badge>}
          {saveStatus === "saved" && <Badge variant="outline">Salvo</Badge>}
          {saveStatus === "error" && <Badge variant="destructive">Erro</Badge>}
        </button>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onMoveUp}
            disabled={isPending || questionIndex === 0}
            aria-label="Mover pergunta para cima"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onMoveDown}
            disabled={isPending || questionIndex === questionCount - 1}
            aria-label="Mover pergunta para baixo"
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => {
              if (confirm("Excluir esta pergunta?")) {
                void run(() => deleteOfficeDemandFormQuestion(question.id));
              }
            }}
            disabled={isPending}
            aria-label="Excluir pergunta"
            className="text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isOpen && (
        <div className="space-y-4 p-4">
          <div className="space-y-2">
            <Label>Pergunta</Label>
            <Input value={prompt} onChange={(event) => setPrompt(event.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Texto de apoio</Label>
            <Textarea
              rows={2}
              value={helperText}
              onChange={(event) => setHelperText(event.target.value)}
              placeholder="Ajude o solicitante a responder com mais clareza."
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
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
            <label className="flex items-center gap-2 pt-7">
              <Switch checked={isRequired} onCheckedChange={setIsRequired} />
              <span className="text-sm">Obrigatória</span>
            </label>
          </div>

          {needsOptions && (
            <div className="space-y-2">
              <Label>Alternativas</Label>
              <div className="rounded-xl border border-border/60">
                {options.map((option) => (
                  <OptionEditor key={option.id} option={option} run={run} />
                ))}
                <form
                  onSubmit={handleAddOption}
                  className="flex w-full items-center gap-2 px-3 py-3 text-sm text-muted-foreground"
                >
                  <ChoiceMarker questionType={questionType} />
                  <Input
                    value={newOptionLabel}
                    onChange={(event) => setNewOptionLabel(event.target.value)}
                    placeholder="Adicionar opção"
                    className="border-0 bg-transparent shadow-none"
                  />
                  <Button type="submit" size="sm" disabled={!newOptionLabel.trim()}>
                    Adicionar
                  </Button>
                </form>
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            As alterações desta pergunta são salvas automaticamente.
          </p>
        </div>
      )}
    </div>
  );
}

function OptionEditor({
  option,
  run,
}: {
  option: OptionRow;
  run: (
    action: () => Promise<{ error?: string; success?: boolean }>,
    options?: { refresh?: boolean }
  ) => Promise<boolean>;
}) {
  const [label, setLabel] = useState(option.label);
  const [isActive, setIsActive] = useState(option.is_active);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  useEffect(() => {
    setLabel(option.label);
    setIsActive(option.is_active);
  }, [option]);

  const saveOption = useCallback(async () => {
    if (!label.trim()) return;
    setSaveStatus("saving");
    const ok = await run(
      () => updateOfficeDemandFormOption(option.id, { label, isActive }),
      { refresh: false }
    );
    setSaveStatus(ok ? "saved" : "error");
  }, [isActive, label, option.id, run]);

  useAutosave(true, saveOption, [label, isActive]);

  return (
    <div className="border-b border-border/60 last:border-b-0">
      <div className="flex items-center gap-2 px-3 py-2">
        <Input
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          className="flex-1 border-0 shadow-none"
          placeholder="Opção"
        />
        <label className="flex items-center gap-2">
          <Switch checked={isActive} onCheckedChange={setIsActive} />
          <span className="text-sm">Ativa</span>
        </label>
        {saveStatus === "saving" && <Badge variant="outline">Salvando...</Badge>}
        {saveStatus === "saved" && <Badge variant="outline">Salvo</Badge>}
        {saveStatus === "error" && <Badge variant="destructive">Erro</Badge>}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => void run(() => deleteOfficeDemandFormOption(option.id))}
          aria-label="Excluir alternativa"
          className="text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
