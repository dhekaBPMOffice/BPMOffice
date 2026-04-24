"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type {
  BaseProcess,
  FormQuestionType,
  ProcessQuestionnaire,
} from "@/types/database";
import {
  addOption,
  addQuestion,
  addSection,
  deleteOption,
  deleteQuestion,
  deleteSection,
  duplicateQuestion,
  reorderQuestions,
  reorderSections,
  setActiveForm,
  updateForm,
  updateOption,
  updateQuestion,
  updateSection,
} from "@/lib/forms/admin-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageLayout } from "@/components/layout/page-layout";
import { ProcessSelector } from "@/components/admin/process-selector";
import {
  ArrowDown,
  ArrowUp,
  BookOpenText,
  ChevronDown,
  ChevronRight,
  Circle,
  ClipboardList,
  Copy,
  Layers,
  Plus,
  Rocket,
  Sparkles,
  Square,
  Trash2,
  X,
} from "lucide-react";

type QuestionOption = {
  id: string;
  label: string;
  value: string | null;
  helper_text: string | null;
  sort_order: number;
  is_active: boolean;
  enable_process_linking: boolean;
  process_questionnaire_option_processes?: { base_process_id: string }[];
};

type QuestionItem = {
  id: string;
  section_id: string;
  prompt: string;
  helper_text: string | null;
  question_type: string;
  is_required: boolean;
  enable_process_linking: boolean;
  sort_order: number;
  process_questionnaire_question_processes?: { base_process_id: string }[];
  process_questionnaire_options?: QuestionOption[];
};

type SectionRow = {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  sort_order: number;
};

type SectionItem = SectionRow & {
  questions: QuestionItem[];
};

type BuilderPageProps = {
  formId: string;
  listHref: string;
  listLabel: string;
  pageDescription: string;
  lockActivationForm?: boolean;
};

type OptionDraft = {
  localId: string;
  id: string | null;
  label: string;
  value: string;
  helperText: string;
  isActive: boolean;
  enableProcessLinking: boolean;
  linkedProcessIds: string[];
  isExpanded: boolean;
};

const QUESTION_TYPES: { value: FormQuestionType; label: string }[] = [
  { value: "short_text", label: "Texto curto" },
  { value: "long_text", label: "Parágrafo" },
  { value: "single_select", label: "Escolha única" },
  { value: "multi_select", label: "Caixas de seleção" },
];

function normalizeDisplayType(type: string): FormQuestionType {
  if (type === "text" || type === "short_text") return "short_text";
  if (type === "long_text" || type === "single_select" || type === "multi_select") {
    return type;
  }
  return "short_text";
}

function buildOptionDrafts(options: QuestionOption[]): OptionDraft[] {
  return options.map((option) => ({
    localId: option.id,
    id: option.id,
    label: option.label,
    value: option.value ?? "",
    helperText: option.helper_text ?? "",
    isActive: option.is_active,
    enableProcessLinking: option.enable_process_linking,
    linkedProcessIds: (option.process_questionnaire_option_processes ?? []).map(
      (item) => item.base_process_id
    ),
    isExpanded: option.enable_process_linking || Boolean(option.helper_text),
  }));
}

function groupSections(
  rawSections: SectionRow[],
  rawQuestions: QuestionItem[]
): SectionItem[] {
  return rawSections
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((section) => ({
      ...section,
      questions: rawQuestions
        .filter((question) => question.section_id === section.id)
        .sort((a, b) => a.sort_order - b.sort_order),
    }));
}

export function FormBuilderPage({
  formId,
  listHref,
  listLabel,
  pageDescription,
  lockActivationForm = false,
}: BuilderPageProps) {
  const [form, setForm] = useState<ProcessQuestionnaire | null>(null);
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [processes, setProcesses] = useState<BaseProcess[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isRequiredFirstAccess, setIsRequiredFirstAccess] = useState(true);
  const [enableProcessLinking, setEnableProcessLinking] = useState(true);
  const [isProcessActivationForm, setIsProcessActivationForm] = useState(
    lockActivationForm
  );
  const [savingMeta, setSavingMeta] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [addingSection, setAddingSection] = useState(false);
  const [expandedSectionId, setExpandedSectionId] = useState<string | null>(null);
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const [
      { data: formData, error: formError },
      { data: processData, error: processError },
      { data: sectionData, error: sectionError },
      { data: questionData, error: questionError },
    ] = await Promise.all([
      supabase.from("process_questionnaires").select("*").eq("id", formId).single(),
      supabase
        .from("base_processes")
        .select("id, name, slug, description, category, sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("process_questionnaire_sections")
        .select("id, title, subtitle, description, sort_order")
        .eq("questionnaire_id", formId)
        .order("sort_order", { ascending: true }),
      supabase
        .from("process_questionnaire_questions")
        .select(
          `
          id,
          section_id,
          prompt,
          helper_text,
          question_type,
          is_required,
          enable_process_linking,
          sort_order,
          process_questionnaire_question_processes ( base_process_id ),
          process_questionnaire_options (
            id,
            label,
            value,
            helper_text,
            sort_order,
            is_active,
            enable_process_linking,
            process_questionnaire_option_processes ( base_process_id )
          )
        `
        )
        .eq("questionnaire_id", formId)
        .order("sort_order", { ascending: true }),
    ]);

    if (formError || !formData) {
      setError(formError?.message ?? "Formulário não encontrado.");
      setLoading(false);
      return;
    }

    if (processError || sectionError || questionError) {
      setError(processError?.message ?? sectionError?.message ?? questionError?.message ?? null);
      setLoading(false);
      return;
    }

    const currentForm = formData as ProcessQuestionnaire;
    setForm(currentForm);
    setTitle(currentForm.title);
    setDescription(currentForm.description ?? "");
    setIsRequiredFirstAccess(currentForm.is_required_first_access);
    setEnableProcessLinking(currentForm.enable_process_linking ?? true);
    setIsProcessActivationForm(lockActivationForm || currentForm.is_process_activation_form);
    setProcesses((processData ?? []) as BaseProcess[]);
    setSections(
      groupSections(
        (sectionData ?? []) as SectionRow[],
        (questionData ?? []) as QuestionItem[]
      )
    );
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [formId]);

  useEffect(() => {
    if (!expandedSectionId && sections.length > 0) {
      setExpandedSectionId(sections[0].id);
    }
  }, [sections, expandedSectionId]);

  const totalQuestions = useMemo(
    () => sections.reduce((sum, section) => sum + section.questions.length, 0),
    [sections]
  );

  async function handleSaveMeta(e: React.FormEvent) {
    e.preventDefault();
    setSavingMeta(true);
    setError(null);

    const result = await updateForm(formId, {
      title,
      description,
      isRequiredFirstAccess,
      enableProcessLinking,
      isProcessActivationForm: lockActivationForm ? true : isProcessActivationForm,
    });

    if ("error" in result && result.error) {
      setError(result.error);
      setSavingMeta(false);
      return;
    }

    await load();
    setSavingMeta(false);
  }

  async function handleActivate() {
    setError(null);
    const result = await setActiveForm(formId);
    if ("error" in result && result.error) {
      setError(result.error);
      return;
    }
    await load();
  }

  async function handleAddSection(e: React.FormEvent) {
    e.preventDefault();
    if (!newSectionTitle.trim()) return;
    setAddingSection(true);
    setError(null);

    const result = await addSection(formId, { title: newSectionTitle.trim() });
    if ("error" in result && result.error) {
      setError(result.error);
      setAddingSection(false);
      return;
    }

    setNewSectionTitle("");
    setExpandedSectionId(result.id);
    await load();
    setAddingSection(false);
  }

  async function handleMoveSection(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= sections.length) return;

    const next = [...sections];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];

    const result = await reorderSections(
      formId,
      next.map((section) => section.id)
    );
    if ("error" in result && result.error) {
      setError(result.error);
      return;
    }

    await load();
  }

  async function handleDeleteSection(sectionId: string) {
    if (!confirm("Excluir esta etapa?")) return;
    setError(null);
    const result = await deleteSection(sectionId, formId);
    if ("error" in result && result.error) {
      setError(result.error);
      return;
    }

    if (expandedSectionId === sectionId) {
      setExpandedSectionId(null);
    }
    await load();
  }

  if (loading) {
    return (
      <PageLayout
        title="Formulário"
        description="Carregando builder de etapas..."
        iconName="ClipboardList"
        backHref={listHref}
        backLabel={listLabel}
      >
        <p className="text-muted-foreground">Carregando...</p>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title={form?.title ?? "Formulário"}
      description={pageDescription}
      iconName="ClipboardList"
      backHref={listHref}
      backLabel={listLabel}
      actions={
        !form?.is_active ? (
          <Button onClick={handleActivate}>
            <Rocket className="mr-2 h-4 w-4" />
            Ativar
          </Button>
        ) : undefined
      }
    >
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-border/60 bg-card p-6">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant={form?.is_active ? "success" : "secondary"}>
                {form?.is_active ? "Ativo" : "Rascunho"}
              </Badge>
              {(lockActivationForm || form?.is_process_activation_form) && (
                <Badge variant="outline">Ativação</Badge>
              )}
              <Badge variant="outline">
                {sections.length} etapa{sections.length === 1 ? "" : "s"}
              </Badge>
              <Badge variant="outline">
                {totalQuestions} pergunta{totalQuestions === 1 ? "" : "s"}
              </Badge>
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
                  Defina o propósito do formulário e os comportamentos do primeiro acesso.
                </p>
              </div>
            </button>

            {showConfig && (
              <form onSubmit={handleSaveMeta} className="mt-4 space-y-4 border-t pt-4">
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Explique o contexto desta jornada."
                  />
                </div>
                <div className="flex flex-wrap gap-6">
                  <label className="flex items-center gap-2">
                    <Switch
                      checked={isRequiredFirstAccess}
                      onCheckedChange={setIsRequiredFirstAccess}
                    />
                    <span className="text-sm">Obrigatório no primeiro acesso</span>
                  </label>
                  {!lockActivationForm && (
                    <label className="flex items-center gap-2">
                      <Switch
                        checked={isProcessActivationForm}
                        onCheckedChange={setIsProcessActivationForm}
                      />
                      <span className="text-sm">Formulário de ativação</span>
                    </label>
                  )}
                  <label className="flex items-center gap-2">
                    <Switch
                      checked={enableProcessLinking}
                      onCheckedChange={setEnableProcessLinking}
                    />
                    <span className="text-sm">Permitir vínculo com processos</span>
                  </label>
                </div>
                <Button type="submit" disabled={savingMeta}>
                  {savingMeta ? "Salvando..." : "Salvar configuração"}
                </Button>
              </form>
            )}
          </div>

          {sections.length === 0 ? (
            <EmptyState
              icon={Layers}
              title="Nenhuma etapa cadastrada"
              description="Crie a primeira etapa para começar a estruturar a jornada do formulário."
            />
          ) : (
            <div className="space-y-4">
              {sections.map((section, index) => (
                <SectionCard
                  key={section.id}
                  formId={formId}
                  section={section}
                  index={index}
                  totalSections={sections.length}
                  processes={processes}
                  allSections={sections}
                  enableProcessLinking={enableProcessLinking}
                  isOpen={expandedSectionId === section.id}
                  expandedQuestionId={expandedQuestionId}
                  onToggle={() =>
                    setExpandedSectionId((current) =>
                      current === section.id ? null : section.id
                    )
                  }
                  onMoveUp={() => handleMoveSection(index, -1)}
                  onMoveDown={() => handleMoveSection(index, 1)}
                  onDelete={() => handleDeleteSection(section.id)}
                  onExpandQuestion={setExpandedQuestionId}
                  onChanged={load}
                />
              ))}
            </div>
          )}

          <form
            onSubmit={handleAddSection}
            className="flex items-center gap-3 rounded-2xl border border-dashed border-border/60 bg-muted/20 p-4"
          >
            <Plus className="h-5 w-5 shrink-0 text-muted-foreground" />
            <Input
              value={newSectionTitle}
              onChange={(e) => setNewSectionTitle(e.target.value)}
              placeholder="Adicionar nova etapa"
              required
              className="border-0 bg-transparent shadow-none"
            />
            <Button type="submit" disabled={addingSection}>
              {addingSection ? "Criando..." : "Criar etapa"}
            </Button>
          </form>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-border/60 bg-card p-5">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Jornada em etapas</p>
                <p className="text-sm text-muted-foreground">
                  Cada bloco pode ter subtítulo, descrição e perguntas próprias.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-5">
            <div className="flex items-center gap-3">
              <BookOpenText className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Resumo rápido</p>
                <p className="text-sm text-muted-foreground">
                  Organize a conversa do líder em passos menores e mais claros.
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {sections.map((section, index) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setExpandedSectionId(section.id)}
                  className="flex w-full items-center justify-between rounded-xl border border-border/60 px-3 py-2 text-left hover:bg-accent/20"
                >
                  <div>
                    <p className="text-sm font-medium">
                      Etapa {index + 1}: {section.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {section.questions.length} pergunta
                      {section.questions.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </PageLayout>
  );
}

function SectionCard({
  formId,
  section,
  index,
  totalSections,
  processes,
  allSections,
  enableProcessLinking,
  isOpen,
  expandedQuestionId,
  onToggle,
  onMoveUp,
  onMoveDown,
  onDelete,
  onExpandQuestion,
  onChanged,
}: {
  formId: string;
  section: SectionItem;
  index: number;
  totalSections: number;
  processes: BaseProcess[];
  allSections: SectionItem[];
  enableProcessLinking: boolean;
  isOpen: boolean;
  expandedQuestionId: string | null;
  onToggle: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  onExpandQuestion: (questionId: string | null) => void;
  onChanged: () => Promise<void>;
}) {
  const [title, setTitle] = useState(section.title);
  const [subtitle, setSubtitle] = useState(section.subtitle ?? "");
  const [description, setDescription] = useState(section.description ?? "");
  const [savingSection, setSavingSection] = useState(false);
  const [sectionError, setSectionError] = useState<string | null>(null);
  const [addingQuestion, setAddingQuestion] = useState(false);
  const [newQuestionPrompt, setNewQuestionPrompt] = useState("");
  const [newQuestionType, setNewQuestionType] =
    useState<FormQuestionType>("short_text");

  useEffect(() => {
    setTitle(section.title);
    setSubtitle(section.subtitle ?? "");
    setDescription(section.description ?? "");
  }, [section]);

  async function handleSaveSection() {
    setSectionError(null);
    setSavingSection(true);
    const result = await updateSection(section.id, formId, {
      title,
      subtitle,
      description,
    });
    if ("error" in result && result.error) {
      setSectionError(result.error);
      setSavingSection(false);
      return;
    }
    await onChanged();
    setSavingSection(false);
  }

  async function handleAddQuestion(e: React.FormEvent) {
    e.preventDefault();
    setSectionError(null);
    setAddingQuestion(true);
    const result = await addQuestion(formId, {
      sectionId: section.id,
      prompt: newQuestionPrompt,
      questionType: newQuestionType,
      isRequired: true,
      enableProcessLinking: false,
      linkedProcessIds: [],
    });

    if ("error" in result && result.error) {
      setSectionError(result.error);
      setAddingQuestion(false);
      return;
    }

    setNewQuestionPrompt("");
    setNewQuestionType("short_text");
    onExpandQuestion(result.id);
    await onChanged();
    setAddingQuestion(false);
  }

  async function handleMoveQuestion(questionIndex: number, direction: -1 | 1) {
    const nextIndex = questionIndex + direction;
    if (nextIndex < 0 || nextIndex >= section.questions.length) return;
    const next = [...section.questions];
    [next[questionIndex], next[nextIndex]] = [next[nextIndex], next[questionIndex]];

    const result = await reorderQuestions(
      formId,
      section.id,
      next.map((question) => question.id)
    );

    if ("error" in result && result.error) {
      setSectionError(result.error);
      return;
    }

    await onChanged();
  }

  async function handleDuplicateQuestion(questionId: string) {
    setSectionError(null);
    const result = await duplicateQuestion(questionId, formId);
    if ("error" in result && result.error) {
      setSectionError(result.error);
      return;
    }

    onExpandQuestion(result.id);
    await onChanged();
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
              <Badge variant="outline">Etapa {index + 1}</Badge>
              <span className="font-medium">{section.title}</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {section.questions.length} pergunta
              {section.questions.length === 1 ? "" : "s"}
            </p>
          </div>
        </button>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMoveUp}
            disabled={index === 0}
            aria-label="Mover etapa para cima"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onMoveDown}
            disabled={index === totalSections - 1}
            aria-label="Mover etapa para baixo"
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            aria-label="Excluir etapa"
            className="text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isOpen && (
        <div className="space-y-4 p-4">
          {sectionError && (
            <div className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">
              {sectionError}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Título da etapa</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Subtítulo</Label>
              <Input
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="Ex: Conheça melhor a operação"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Breve descrição</Label>
            <Textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explique o objetivo desta etapa antes das perguntas."
            />
          </div>

          <Button onClick={handleSaveSection} disabled={savingSection}>
            {savingSection ? "Salvando etapa..." : "Salvar etapa"}
          </Button>

          {section.questions.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="Nenhuma pergunta nesta etapa"
              description="Adicione a primeira pergunta para começar a compor este bloco."
            />
          ) : (
            <div className="space-y-3">
              {section.questions.map((question, questionIndex) => (
                <QuestionCard
                  key={question.id}
                  formId={formId}
                  question={question}
                  questionIndex={questionIndex}
                  sectionId={section.id}
                  sectionQuestionsCount={section.questions.length}
                  allSections={allSections}
                  processes={processes}
                  enableProcessLinking={enableProcessLinking}
                  isOpen={expandedQuestionId === question.id}
                  onToggle={() =>
                    onExpandQuestion(expandedQuestionId === question.id ? null : question.id)
                  }
                  onMoveUp={() => handleMoveQuestion(questionIndex, -1)}
                  onMoveDown={() => handleMoveQuestion(questionIndex, 1)}
                  onDuplicate={() => handleDuplicateQuestion(question.id)}
                  onChanged={onChanged}
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
              onChange={(e) => setNewQuestionPrompt(e.target.value)}
              placeholder="Adicionar pergunta nesta etapa"
              required
              className="border-0 bg-transparent shadow-none"
            />
            <Select
              value={newQuestionType}
              onChange={(e) => setNewQuestionType(e.target.value as FormQuestionType)}
              className="w-44"
            >
              {QUESTION_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </Select>
            <Button type="submit" size="sm" disabled={addingQuestion}>
              {addingQuestion ? "Adicionando..." : "Adicionar"}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}

function QuestionCard({
  formId,
  question,
  questionIndex,
  sectionId,
  sectionQuestionsCount,
  allSections,
  processes,
  enableProcessLinking,
  isOpen,
  onToggle,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onChanged,
}: {
  formId: string;
  question: QuestionItem;
  questionIndex: number;
  sectionId: string;
  sectionQuestionsCount: number;
  allSections: SectionItem[];
  processes: BaseProcess[];
  enableProcessLinking: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onChanged: () => Promise<void>;
}) {
  const [prompt, setPrompt] = useState(question.prompt);
  const [helperText, setHelperText] = useState(question.helper_text ?? "");
  const [questionType, setQuestionType] = useState<FormQuestionType>(
    normalizeDisplayType(question.question_type)
  );
  const [questionSectionId, setQuestionSectionId] = useState(sectionId);
  const [isRequired, setIsRequired] = useState(question.is_required);
  const [enableQuestionProcessLinking, setEnableQuestionProcessLinking] = useState(
    question.enable_process_linking
  );
  const [questionLinkedProcessIds, setQuestionLinkedProcessIds] = useState<string[]>(
    (question.process_questionnaire_question_processes ?? []).map(
      (item) => item.base_process_id
    )
  );
  const [optionDrafts, setOptionDrafts] = useState<OptionDraft[]>(
    buildOptionDrafts(question.process_questionnaire_options ?? [])
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPrompt(question.prompt);
    setHelperText(question.helper_text ?? "");
    setQuestionType(normalizeDisplayType(question.question_type));
    setQuestionSectionId(sectionId);
    setIsRequired(question.is_required);
    setEnableQuestionProcessLinking(question.enable_process_linking);
    setQuestionLinkedProcessIds(
      (question.process_questionnaire_question_processes ?? []).map(
        (item) => item.base_process_id
      )
    );
    setOptionDrafts(buildOptionDrafts(question.process_questionnaire_options ?? []));
  }, [question, sectionId]);

  const supportsOptions =
    questionType === "single_select" || questionType === "multi_select";
  const questionTypeLabel =
    QUESTION_TYPES.find((type) => type.value === questionType)?.label ?? questionType;

  function updateDraft(
    localId: string,
    updater: (draft: OptionDraft) => Partial<OptionDraft>
  ) {
    setOptionDrafts((current) =>
      current.map((draft) =>
        draft.localId === localId ? { ...draft, ...updater(draft) } : draft
      )
    );
  }

  function addOptionRow() {
    setOptionDrafts((current) => [
      ...current,
      {
        localId: crypto.randomUUID(),
        id: null,
        label: "",
        value: "",
        helperText: "",
        isActive: true,
        enableProcessLinking: false,
        linkedProcessIds: [],
        isExpanded: false,
      },
    ]);
  }

  function removeOptionRow(localId: string) {
    setOptionDrafts((current) => current.filter((draft) => draft.localId !== localId));
  }

  async function handleSave() {
    setError(null);
    setSaving(true);

    const invalidOption = optionDrafts.find((draft) => draft.id && !draft.label.trim());
    if (invalidOption) {
      setError("Preencha ou remova as alternativas vazias antes de salvar.");
      setSaving(false);
      return;
    }

    const questionResult = await updateQuestion(question.id, formId, {
      sectionId: questionSectionId,
      prompt,
      helperText,
      questionType,
      isRequired,
      enableProcessLinking: enableQuestionProcessLinking,
      linkedProcessIds: questionLinkedProcessIds,
    });

    if ("error" in questionResult && questionResult.error) {
      setError(questionResult.error);
      setSaving(false);
      return;
    }

    const originalOptions = question.process_questionnaire_options ?? [];
    const removedOptionIds = originalOptions
      .map((option) => option.id)
      .filter((id) => !optionDrafts.some((draft) => draft.id === id));

    for (const optionId of removedOptionIds) {
      const result = await deleteOption(optionId, formId);
      if ("error" in result && result.error) {
        setError(result.error);
        setSaving(false);
        return;
      }
    }

    for (const draft of optionDrafts.filter((item) => item.id && item.label.trim())) {
      const result = await updateOption(draft.id!, formId, {
        label: draft.label,
        value: draft.value,
        helperText: draft.helperText,
        enableProcessLinking: draft.enableProcessLinking,
        linkedProcessIds: draft.linkedProcessIds,
        isActive: draft.isActive,
      });

      if ("error" in result && result.error) {
        setError(result.error);
        setSaving(false);
        return;
      }
    }

    for (const draft of optionDrafts.filter((item) => !item.id && item.label.trim())) {
      const result = await addOption(question.id, formId, {
        label: draft.label,
        value: draft.value,
        helperText: draft.helperText,
        enableProcessLinking: draft.enableProcessLinking,
        linkedProcessIds: draft.linkedProcessIds,
      });

      if ("error" in result && result.error) {
        setError(result.error);
        setSaving(false);
        return;
      }
    }

    await onChanged();
    setSaving(false);
  }

  async function handleDelete() {
    if (!confirm("Excluir esta pergunta?")) return;
    const result = await deleteQuestion(question.id, formId);
    if ("error" in result && result.error) {
      setError(result.error);
      return;
    }
    await onChanged();
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
            {questionIndex + 1}. {questionTypeLabel}
            {question.is_required ? " *" : ""}
          </span>
          <span className="truncate font-medium">{question.prompt}</span>
        </button>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMoveUp}
            disabled={questionIndex === 0}
            aria-label="Mover pergunta para cima"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onMoveDown}
            disabled={questionIndex === sectionQuestionsCount - 1}
            aria-label="Mover pergunta para baixo"
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDuplicate}
            aria-label="Duplicar pergunta"
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            aria-label="Excluir pergunta"
            className="text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isOpen && (
        <div className="space-y-4 p-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label>Pergunta</Label>
            <Input value={prompt} onChange={(e) => setPrompt(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Texto de apoio</Label>
            <Textarea
              rows={2}
              value={helperText}
              onChange={(e) => setHelperText(e.target.value)}
              placeholder="Ajude o líder a responder com mais confiança."
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={questionType}
                onChange={(e) => setQuestionType(e.target.value as FormQuestionType)}
              >
                {QUESTION_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Etapa</Label>
              <Select
                value={questionSectionId}
                onChange={(e) => setQuestionSectionId(e.target.value)}
              >
                {allSections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.title}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex items-center gap-2 pt-7">
              <Switch checked={isRequired} onCheckedChange={setIsRequired} />
              <span className="text-sm">Obrigatória</span>
            </div>
          </div>

          {supportsOptions && (
            <div className="space-y-2">
              <Label>Alternativas</Label>
              <div className="rounded-xl border border-border/60">
                {optionDrafts.map((option, optionIndex) => (
                  <OptionRow
                    key={option.localId}
                    index={optionIndex}
                    questionType={questionType}
                    option={option}
                    enableProcessLinking={enableProcessLinking}
                    processes={processes}
                    onChange={(updater) => updateDraft(option.localId, updater)}
                    onRemove={() => removeOptionRow(option.localId)}
                  />
                ))}
                <button
                  type="button"
                  onClick={addOptionRow}
                  className="flex w-full items-center gap-2 px-3 py-3 text-left text-sm text-muted-foreground hover:bg-accent/20"
                >
                  <ChoiceMarker questionType={questionType} />
                  Adicionar opção
                </button>
              </div>
            </div>
          )}

          {enableProcessLinking && (
            <div className="rounded-xl border border-border/60 p-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={enableQuestionProcessLinking}
                  onCheckedChange={(checked) => {
                    setEnableQuestionProcessLinking(checked);
                    if (!checked) setQuestionLinkedProcessIds([]);
                  }}
                />
                <span className="text-sm">Vincular processos diretamente na pergunta</span>
              </div>

              {enableQuestionProcessLinking && (
                <div className="mt-3">
                  <ProcessSelector
                    processes={processes}
                    selectedIds={questionLinkedProcessIds}
                    onToggle={(id, checked) =>
                      setQuestionLinkedProcessIds((current) =>
                        checked ? [...current, id] : current.filter((item) => item !== id)
                      )
                    }
                  />
                </div>
              )}
            </div>
          )}

          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar pergunta"}
          </Button>
        </div>
      )}
    </div>
  );
}

function OptionRow({
  index,
  questionType,
  option,
  enableProcessLinking,
  processes,
  onChange,
  onRemove,
}: {
  index: number;
  questionType: FormQuestionType;
  option: OptionDraft;
  enableProcessLinking: boolean;
  processes: BaseProcess[];
  onChange: (updater: (draft: OptionDraft) => Partial<OptionDraft>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="border-b border-border/60 last:border-b-0">
      <div className="flex items-center gap-2 px-3 py-2">
        <ChoiceMarker questionType={questionType} />
        <Input
          value={option.label}
          onChange={(e) =>
            onChange(() => ({
              label: e.target.value,
              value: e.target.value || option.value,
            }))
          }
          className="flex-1 border-0 shadow-none"
          placeholder={`Opção ${index + 1}`}
        />
        <button
          type="button"
          onClick={() => onChange((draft) => ({ isExpanded: !draft.isExpanded }))}
          className="rounded p-1 text-muted-foreground hover:bg-accent"
          aria-label={option.isExpanded ? "Ocultar detalhes" : "Exibir detalhes"}
        >
          {option.isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="rounded p-1 text-muted-foreground hover:text-destructive"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {option.isExpanded && (
        <div className="space-y-3 border-t border-border/60 bg-muted/20 px-3 py-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">Valor técnico</Label>
              <Input
                value={option.value}
                onChange={(e) => onChange(() => ({ value: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Texto complementar</Label>
              <Input
                value={option.helperText}
                onChange={(e) => onChange(() => ({ helperText: e.target.value }))}
                placeholder="Opcional"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={option.isActive}
              onCheckedChange={(checked) => onChange(() => ({ isActive: checked }))}
            />
            <span className="text-sm">Alternativa ativa</span>
          </div>

          {enableProcessLinking && (
            <div className="space-y-2 rounded-lg border border-border/60 bg-background p-3">
              <div className="flex items-center gap-2">
                <Switch
                  checked={option.enableProcessLinking}
                  onCheckedChange={(checked) =>
                    onChange((draft) => ({
                      enableProcessLinking: checked,
                      linkedProcessIds: checked ? draft.linkedProcessIds : [],
                    }))
                  }
                />
                <span className="text-sm">Vincular processos nesta alternativa</span>
              </div>

              {option.enableProcessLinking && (
                <ProcessSelector
                  processes={processes}
                  selectedIds={option.linkedProcessIds}
                  onToggle={(id, checked) =>
                    onChange((draft) => ({
                      linkedProcessIds: checked
                        ? [...draft.linkedProcessIds, id]
                        : draft.linkedProcessIds.filter((item) => item !== id),
                    }))
                  }
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ChoiceMarker({
  questionType,
}: {
  questionType: FormQuestionType;
}) {
  const Icon = questionType === "multi_select" ? Square : Circle;
  return <Icon className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />;
}
