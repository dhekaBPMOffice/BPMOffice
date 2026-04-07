"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type {
  BaseProcess,
  ProcessQuestionType,
  ProcessQuestionnaire,
} from "@/types/database";
import {
  addOption,
  addQuestion,
  deleteOption,
  deleteQuestion,
  setActiveQuestionnaire,
  updateOption,
  updateQuestion,
  updateQuestionnaire,
} from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageLayout } from "@/components/layout/page-layout";
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Circle,
  ClipboardList,
  Plus,
  Rocket,
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
  prompt: string;
  helper_text: string | null;
  question_type: ProcessQuestionType;
  is_required: boolean;
  enable_process_linking: boolean;
  sort_order: number;
  process_questionnaire_question_processes?: { base_process_id: string }[];
  process_questionnaire_options?: QuestionOption[];
};

const QUESTION_TYPES: { value: ProcessQuestionType; label: string }[] = [
  { value: "text", label: "Texto livre" },
  { value: "single_select", label: "Escolha única" },
  { value: "multi_select", label: "Múltipla escolha" },
];

export default function QuestionarioProcessosDetailPage() {
  const params = useParams<{ id: string }>();
  const questionnaireId = params.id;

  const [questionnaire, setQuestionnaire] =
    useState<ProcessQuestionnaire | null>(null);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [processes, setProcesses] = useState<BaseProcess[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isRequiredFirstAccess, setIsRequiredFirstAccess] = useState(true);
  const [savingMeta, setSavingMeta] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(
    null
  );
  const [pendingExpandLast, setPendingExpandLast] = useState(false);

  const [newQuestionPrompt, setNewQuestionPrompt] = useState("");
  const [newQuestionType, setNewQuestionType] =
    useState<ProcessQuestionType>("single_select");

  useEffect(() => {
    if (pendingExpandLast && questions.length > 0) {
      setExpandedQuestionId(questions[questions.length - 1].id);
      setPendingExpandLast(false);
    }
  }, [questions, pendingExpandLast]);

  async function load() {
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const [
      { data: questionnaireData, error: questionnaireError },
      { data: processData, error: processError },
    ] = await Promise.all([
      supabase
        .from("process_questionnaires")
        .select("*")
        .eq("id", questionnaireId)
        .single(),
      supabase
        .from("base_processes")
        .select(
          "id, name, slug, description, category, template_url, template_label, flowchart_image_url, management_checklist, is_active, sort_order, created_at, updated_at"
        )
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),
    ]);

    if (questionnaireError || !questionnaireData) {
      setError(questionnaireError?.message ?? "Questionário não encontrado.");
      setLoading(false);
      return;
    }

    if (processError) {
      setError(processError.message);
      setLoading(false);
      return;
    }

    const { data: questionData, error: questionError } = await supabase
      .from("process_questionnaire_questions")
      .select(
        `
        id,
        prompt,
        helper_text,
        question_type,
        is_required,
        enable_process_linking,
        sort_order,
        process_questionnaire_question_processes (
          base_process_id
        ),
        process_questionnaire_options (
          id,
          label,
          value,
          helper_text,
          sort_order,
          is_active,
          enable_process_linking,
          process_questionnaire_option_processes (
            base_process_id
          )
        )
      `
      )
      .eq("questionnaire_id", questionnaireId)
      .order("sort_order", { ascending: true });

    if (questionError) {
      setError(questionError.message);
      setLoading(false);
      return;
    }

    const currentQuestionnaire = questionnaireData as ProcessQuestionnaire;
    setQuestionnaire(currentQuestionnaire);
    setTitle(currentQuestionnaire.title);
    setDescription(currentQuestionnaire.description ?? "");
    setIsRequiredFirstAccess(currentQuestionnaire.is_required_first_access);
    setQuestions((questionData ?? []) as QuestionItem[]);
    setProcesses((processData ?? []) as BaseProcess[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [questionnaireId]);

  async function handleSaveMeta(e: React.FormEvent) {
    e.preventDefault();
    setSavingMeta(true);
    setError(null);

    const result = await updateQuestionnaire(questionnaireId, {
      title,
      description,
      isRequiredFirstAccess,
    });

    if ("error" in result && result.error) {
      setError(result.error);
      setSavingMeta(false);
      return;
    }

    await load();
    setSavingMeta(false);
  }

  async function handleAddQuestion(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const result = await addQuestion(questionnaireId, {
      prompt: newQuestionPrompt,
      helperText: "",
      questionType: newQuestionType,
      isRequired: true,
      enableProcessLinking: false,
      linkedProcessIds: [],
    });

    if ("error" in result && result.error) {
      setError(result.error);
      return;
    }

    setNewQuestionPrompt("");
    setNewQuestionType("single_select");
    setPendingExpandLast(true);
    load();
  }

  async function handleActivate() {
    setError(null);
    const result = await setActiveQuestionnaire(questionnaireId);
    if ("error" in result && result.error) {
      setError(result.error);
      return;
    }
    load();
  }

  if (loading) {
    return (
      <PageLayout
        title="Questionário"
        description="Carregando builder."
        iconName="ClipboardList"
        backHref="/admin/questionario-processos"
      >
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title={questionnaire?.title ?? "Questionário"}
      description="Builder de questionário de ativação"
      iconName="ClipboardList"
      backHref="/admin/questionario-processos"
      backLabel="Voltar"
      actions={
        !questionnaire?.is_active ? (
          <Button onClick={handleActivate}>
            <Rocket className="mr-2 h-4 w-4" />
            Ativar versão
          </Button>
        ) : undefined
      }
    >
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {/* ── Config colapsável ──────────────────────────────── */}
        <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
          <button
            type="button"
            onClick={() => setShowConfig((v) => !v)}
            className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-accent/10"
          >
            {showConfig ? (
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <span className="flex-1">Configuração geral</span>
            <Badge
              variant={questionnaire?.is_active ? "success" : "secondary"}
              className="shrink-0"
            >
              {questionnaire?.is_active ? "Ativo" : "Rascunho"}
            </Badge>
          </button>

          {showConfig && (
            <form
              onSubmit={handleSaveMeta}
              className="space-y-3 border-t border-border/60 px-4 py-4"
            >
              <div className="space-y-1">
                <Label htmlFor="cfg-title" className="text-xs">
                  Título
                </Label>
                <Input
                  id="cfg-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cfg-desc" className="text-xs">
                  Descrição
                </Label>
                <Textarea
                  id="cfg-desc"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={isRequiredFirstAccess}
                    onCheckedChange={setIsRequiredFirstAccess}
                  />
                  <Label className="text-sm">
                    Obrigatório no primeiro acesso
                  </Label>
                </div>
                <Button type="submit" size="sm" disabled={savingMeta}>
                  {savingMeta ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* ── Lista de perguntas (acordeão) ─────────────────── */}
        {questions.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="Nenhuma pergunta cadastrada"
            description="Use o campo abaixo para adicionar a primeira pergunta."
          />
        ) : (
          <div className="space-y-2">
            {questions.map((question, index) => (
              <QuestionCard
                key={question.id}
                index={index}
                questionnaireId={questionnaireId}
                question={question}
                processes={processes}
                isOpen={expandedQuestionId === question.id}
                onToggle={() =>
                  setExpandedQuestionId(
                    expandedQuestionId === question.id ? null : question.id
                  )
                }
                onChanged={load}
              />
            ))}
          </div>
        )}

        {/* ── Adicionar pergunta (inline) ───────────────────── */}
        <form
          onSubmit={handleAddQuestion}
          className="flex items-center gap-2 rounded-xl border border-dashed border-border/60 px-4 py-3"
        >
          <Plus className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            value={newQuestionPrompt}
            onChange={(e) => setNewQuestionPrompt(e.target.value)}
            placeholder="Nova pergunta..."
            required
            className="flex-1 border-0 px-0 shadow-none focus-visible:ring-0"
          />
          <Select
            value={newQuestionType}
            onChange={(e) =>
              setNewQuestionType(e.target.value as ProcessQuestionType)
            }
            className="w-40 shrink-0"
          >
            {QUESTION_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </Select>
          <Button type="submit" size="sm">
            Adicionar
          </Button>
        </form>
      </div>
    </PageLayout>
  );
}

// ─── QuestionCard (acordeão) ──────────────────────────────────────────────────

function QuestionCard({
  index,
  questionnaireId,
  question,
  processes,
  isOpen,
  onToggle,
  onChanged,
}: {
  index: number;
  questionnaireId: string;
  question: QuestionItem;
  processes: BaseProcess[];
  isOpen: boolean;
  onToggle: () => void;
  onChanged: () => void;
}) {
  const [prompt, setPrompt] = useState(question.prompt);
  const [helperText, setHelperText] = useState(question.helper_text ?? "");
  const [questionType, setQuestionType] = useState<ProcessQuestionType>(
    question.question_type
  );
  const [isRequired, setIsRequired] = useState(question.is_required);
  const [enableProcessLinking, setEnableProcessLinking] = useState(
    question.enable_process_linking
  );
  const [questionLinkedProcessIds, setQuestionLinkedProcessIds] = useState<
    string[]
  >(
    (question.process_questionnaire_question_processes ?? []).map(
      (item) => item.base_process_id
    )
  );
  const [optionDrafts, setOptionDrafts] = useState<OptionDraft[]>(
    buildOptionDrafts(question.process_questionnaire_options ?? [])
  );
  const [savingBlock, setSavingBlock] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPrompt(question.prompt);
    setHelperText(question.helper_text ?? "");
    setQuestionType(question.question_type);
    setIsRequired(question.is_required);
    setEnableProcessLinking(question.enable_process_linking);
    setQuestionLinkedProcessIds(
      (question.process_questionnaire_question_processes ?? []).map(
        (item) => item.base_process_id
      )
    );
    setOptionDrafts(
      buildOptionDrafts(question.process_questionnaire_options ?? [])
    );
  }, [question]);

  const supportsOptions = questionType !== "text";
  const optionCount = optionDrafts.length;
  const questionTypeLabel =
    QUESTION_TYPES.find((item) => item.value === question.question_type)
      ?.label ?? question.question_type;

  function updateOptionDraft(
    localId: string,
    updater: (draft: OptionDraft) => OptionDraft
  ) {
    setOptionDrafts((current) =>
      current.map((draft) =>
        draft.localId === localId ? updater(draft) : draft
      )
    );
  }

  function handleAddOptionRow() {
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

  function handleRemoveOptionRow(localId: string) {
    setOptionDrafts((current) =>
      current.filter((draft) => draft.localId !== localId)
    );
  }

  async function handleSaveBlock() {
    setError(null);
    setSavingBlock(true);

    const invalidOption = optionDrafts.find(
      (draft) => draft.id && !draft.label.trim()
    );
    if (invalidOption) {
      setError("Preencha ou remova as alternativas vazias antes de salvar.");
      setSavingBlock(false);
      return;
    }

    const questionResult = await updateQuestion(question.id, questionnaireId, {
      prompt,
      helperText,
      questionType,
      isRequired,
      enableProcessLinking,
      linkedProcessIds: questionLinkedProcessIds,
    });

    if ("error" in questionResult && questionResult.error) {
      setError(questionResult.error);
      setSavingBlock(false);
      return;
    }

    const originalOptions = question.process_questionnaire_options ?? [];
    const removedOptionIds = originalOptions
      .map((o) => o.id)
      .filter((id) => !optionDrafts.some((d) => d.id === id));

    for (const optionId of removedOptionIds) {
      const r = await deleteOption(optionId, questionnaireId);
      if ("error" in r && r.error) {
        setError(r.error);
        setSavingBlock(false);
        return;
      }
    }

    for (const draft of optionDrafts.filter((d) => d.id && d.label.trim())) {
      const r = await updateOption(draft.id!, questionnaireId, {
        label: draft.label,
        value: draft.value,
        helperText: draft.helperText,
        enableProcessLinking: draft.enableProcessLinking,
        linkedProcessIds: draft.linkedProcessIds,
        isActive: draft.isActive,
      });
      if ("error" in r && r.error) {
        setError(r.error);
        setSavingBlock(false);
        return;
      }
    }

    for (const draft of optionDrafts.filter((d) => !d.id && d.label.trim())) {
      const r = await addOption(question.id, questionnaireId, {
        label: draft.label,
        value: draft.value,
        helperText: draft.helperText,
        enableProcessLinking: draft.enableProcessLinking,
        linkedProcessIds: draft.linkedProcessIds,
      });
      if ("error" in r && r.error) {
        setError(r.error);
        setSavingBlock(false);
        return;
      }
    }

    setSavingBlock(false);
    onChanged();
  }

  async function handleDeleteQuestion() {
    if (!confirm("Excluir esta pergunta?")) return;
    const result = await deleteQuestion(question.id, questionnaireId);
    if ("error" in result && result.error) {
      setError(result.error);
      return;
    }
    onChanged();
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
      {/* ── Header compacto (sempre visível) ── */}
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/10"
      >
        {isOpen ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <span className="w-5 shrink-0 text-xs font-semibold text-muted-foreground">
          {index + 1}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          {question.prompt || "Sem texto"}
        </span>
        <Badge variant="outline" className="shrink-0 text-[11px]">
          {questionTypeLabel}
        </Badge>
        {question.question_type !== "text" && (
          <Badge variant="outline" className="shrink-0 text-[11px]">
            {optionCount} alt.
          </Badge>
        )}
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteQuestion();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.stopPropagation();
              handleDeleteQuestion();
            }
          }}
          className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent/30 hover:text-destructive"
          aria-label="Excluir pergunta"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </span>
      </button>

      {/* ── Corpo expandido ── */}
      {isOpen && (
        <div className="space-y-4 border-t border-border/60 px-4 py-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Campos da pergunta */}
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Pergunta</Label>
              <Input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Texto de apoio</Label>
              <Textarea
                rows={2}
                value={helperText}
                onChange={(e) => setHelperText(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Tipo</Label>
                <Select
                  value={questionType}
                  onChange={(e) =>
                    setQuestionType(e.target.value as ProcessQuestionType)
                  }
                >
                  {QUESTION_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex items-center gap-2 pt-5">
                <Switch
                  checked={isRequired}
                  onCheckedChange={setIsRequired}
                />
                <Label className="text-sm">Obrigatória</Label>
              </div>
            </div>
          </div>

          {/* Vínculo de processos na pergunta */}
          <div className="space-y-3 rounded-lg border border-border/60 p-3">
            <div className="flex items-center gap-3">
              <Switch
                checked={enableProcessLinking}
                onCheckedChange={(checked) => {
                  setEnableProcessLinking(checked);
                  if (!checked) setQuestionLinkedProcessIds([]);
                }}
              />
              <Label className="text-sm">
                Vincular processos à pergunta
              </Label>
            </div>
            {enableProcessLinking && (
              <ProcessSelector
                processes={processes}
                selectedIds={questionLinkedProcessIds}
                onToggle={(processId, checked) =>
                  setQuestionLinkedProcessIds((current) =>
                    checked
                      ? [...current, processId]
                      : current.filter((item) => item !== processId)
                  )
                }
              />
            )}
          </div>

          {/* Alternativas */}
          {supportsOptions && (
            <div className="overflow-hidden rounded-lg border border-border/60">
              {optionDrafts.map((option, optionIndex) => (
                <OptionRow
                  key={option.localId}
                  index={optionIndex}
                  questionType={questionType}
                  option={option}
                  processes={processes}
                  onChange={(updater) =>
                    updateOptionDraft(option.localId, updater)
                  }
                  onRemove={() => handleRemoveOptionRow(option.localId)}
                />
              ))}
              <button
                type="button"
                onClick={handleAddOptionRow}
                className="flex w-full items-center gap-3 border-t border-border/60 px-3 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:bg-accent/20 hover:text-foreground"
              >
                <ChoiceMarker questionType={questionType} />
                <span>Adicionar opção</span>
              </button>
            </div>
          )}

          {/* Salvar bloco */}
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              onClick={handleSaveBlock}
              disabled={savingBlock}
            >
              {savingBlock ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── OptionDraft helpers ──────────────────────────────────────────────────────

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
    isExpanded: option.enable_process_linking || Boolean(option.value),
  }));
}

// ─── OptionRow ────────────────────────────────────────────────────────────────

function OptionRow({
  index,
  questionType,
  option,
  processes,
  onChange,
  onRemove,
}: {
  index: number;
  questionType: ProcessQuestionType;
  option: OptionDraft;
  processes: BaseProcess[];
  onChange: (updater: (draft: OptionDraft) => OptionDraft) => void;
  onRemove: () => void;
}) {
  return (
    <div className="border-t border-border/60 first:border-t-0">
      <div className="flex items-center gap-2 px-3 py-2">
        <ChoiceMarker questionType={questionType} />
        <div className="min-w-0 flex-1">
          <Input
            value={option.label}
            onChange={(e) =>
              onChange((c) => ({ ...c, label: e.target.value }))
            }
            className="h-8 border-0 px-0 text-sm shadow-none focus-visible:ring-0"
            placeholder={`Alternativa ${index + 1}`}
          />
        </div>
        <button
          type="button"
          onClick={() =>
            onChange((c) => ({ ...c, isExpanded: !c.isExpanded }))
          }
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent/20 hover:text-foreground"
          aria-label={option.isExpanded ? "Ocultar detalhes" : "Exibir detalhes"}
        >
          {option.isExpanded ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent/20 hover:text-destructive"
          aria-label="Excluir alternativa"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {option.isExpanded && (
        <div className="space-y-3 border-t border-border/60 bg-muted/20 px-3 py-3">
          <div className="flex items-center gap-3">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Valor técnico</Label>
              <Input
                value={option.value}
                onChange={(e) =>
                  onChange((c) => ({ ...c, value: e.target.value }))
                }
                className="h-8"
              />
            </div>
            <div className="flex items-center gap-2 pt-5">
              <Switch
                checked={option.isActive}
                onCheckedChange={(checked) =>
                  onChange((c) => ({ ...c, isActive: checked }))
                }
              />
              <Label className="text-xs">Ativa</Label>
            </div>
          </div>

          <div className="space-y-2 rounded-md border border-border/60 bg-background p-3">
            <div className="flex items-center gap-2">
              <Switch
                checked={option.enableProcessLinking}
                onCheckedChange={(checked) => {
                  onChange((c) => ({
                    ...c,
                    enableProcessLinking: checked,
                    linkedProcessIds: checked ? c.linkedProcessIds : [],
                  }));
                }}
              />
              <Label className="text-sm">Vincular processos</Label>
            </div>
            {option.enableProcessLinking && (
              <ProcessSelector
                processes={processes}
                selectedIds={option.linkedProcessIds}
                onToggle={(processId, checked) =>
                  onChange((c) => ({
                    ...c,
                    linkedProcessIds: checked
                      ? [...c.linkedProcessIds, processId]
                      : c.linkedProcessIds.filter((i) => i !== processId),
                  }))
                }
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Shared components ────────────────────────────────────────────────────────

function ChoiceMarker({
  questionType,
}: {
  questionType: ProcessQuestionType;
}) {
  const Icon = questionType === "multi_select" ? Square : Circle;
  return (
    <Icon
      className="h-4 w-4 shrink-0 text-muted-foreground"
      strokeWidth={1.75}
    />
  );
}

function ProcessSelector({
  processes,
  selectedIds,
  onToggle,
}: {
  processes: BaseProcess[];
  selectedIds: string[];
  onToggle: (processId: string, checked: boolean) => void;
}) {
  const sortedProcesses = useMemo(
    () =>
      processes
        .slice()
        .sort(
          (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)
        ),
    [processes]
  );

  if (sortedProcesses.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Cadastre processos em /admin/processos antes de fazer vínculos.
      </p>
    );
  }

  return (
    <div className="grid gap-1 md:grid-cols-2">
      {sortedProcesses.map((process) => (
        <label
          key={process.id}
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent/30"
        >
          <input
            type="checkbox"
            checked={selectedIds.includes(process.id)}
            onChange={(e) => onToggle(process.id, e.target.checked)}
          />
          <span className="truncate">{process.name}</span>
        </label>
      ))}
    </div>
  );
}
