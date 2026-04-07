"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type {
  BaseProcess,
  FormQuestionType,
  ProcessQuestionnaire,
} from "@/types/database";
import {
  addOption,
  addQuestion,
  deleteOption,
  deleteQuestion,
  duplicateQuestion,
  reorderQuestions,
  setActiveForm,
  updateForm,
  updateOption,
  updateQuestion,
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
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Circle,
  ClipboardList,
  Copy,
  MoreHorizontal,
  Plus,
  Rocket,
  Square,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

type QuestionOption = {
  id: string;
  label: string;
  value: string | null;
  sort_order: number;
  is_active: boolean;
  enable_process_linking: boolean;
  process_questionnaire_option_processes?: { base_process_id: string }[];
};

type QuestionItem = {
  id: string;
  prompt: string;
  helper_text: string | null;
  question_type: string;
  is_required: boolean;
  enable_process_linking: boolean;
  sort_order: number;
  process_questionnaire_question_processes?: { base_process_id: string }[];
  process_questionnaire_options?: QuestionOption[];
};

const QUESTION_TYPES: { value: FormQuestionType; label: string }[] = [
  { value: "short_text", label: "Texto curto" },
  { value: "long_text", label: "Parágrafo" },
  { value: "single_select", label: "Escolha única" },
  { value: "multi_select", label: "Caixas de seleção" },
];

function normalizeDisplayType(t: string): FormQuestionType {
  if (t === "text" || t === "short_text") return "short_text";
  if (t === "long_text" || t === "single_select" || t === "multi_select")
    return t;
  return "short_text";
}

export default function FormBuilderPage() {
  const params = useParams<{ id: string }>();
  const formId = params.id;

  const [form, setForm] = useState<ProcessQuestionnaire | null>(null);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [processes, setProcesses] = useState<BaseProcess[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isRequiredFirstAccess, setIsRequiredFirstAccess] = useState(true);
  const [enableProcessLinking, setEnableProcessLinking] = useState(true);
  const [isProcessActivationForm, setIsProcessActivationForm] = useState(false);
  const [savingMeta, setSavingMeta] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);
  const [pendingExpandLast, setPendingExpandLast] = useState(false);
  const [newQuestionPrompt, setNewQuestionPrompt] = useState("");
  const [newQuestionType, setNewQuestionType] =
    useState<FormQuestionType>("short_text");

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
      { data: formData, error: formError },
      { data: processData, error: processError },
    ] = await Promise.all([
      supabase
        .from("process_questionnaires")
        .select("*")
        .eq("id", formId)
        .single(),
      supabase
        .from("base_processes")
        .select("id, name, slug, description, category, sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
    ]);

    if (formError || !formData) {
      setError(formError?.message ?? "Formulário não encontrado.");
      setLoading(false);
      return;
    }
    if (processError) {
      setError(processError.message);
      setLoading(false);
      return;
    }

    const { data: questionData, error: qError } = await supabase
      .from("process_questionnaire_questions")
      .select(
        `
        id, prompt, helper_text, question_type, is_required, enable_process_linking, sort_order,
        process_questionnaire_question_processes ( base_process_id ),
        process_questionnaire_options (
          id, label, value, sort_order, is_active, enable_process_linking,
          process_questionnaire_option_processes ( base_process_id )
        )
      `
      )
      .eq("questionnaire_id", formId)
      .order("sort_order", { ascending: true });

    if (qError) {
      setError(qError.message);
      setLoading(false);
      return;
    }

    setForm(formData as ProcessQuestionnaire);
    setTitle(formData.title);
    setDescription(formData.description ?? "");
    setIsRequiredFirstAccess(formData.is_required_first_access);
    setEnableProcessLinking(formData.enable_process_linking ?? true);
    setIsProcessActivationForm(formData.is_process_activation_form ?? false);
    setQuestions((questionData ?? []) as QuestionItem[]);
    setProcesses((processData ?? []) as BaseProcess[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [formId]);

  async function handleSaveMeta(e: React.FormEvent) {
    e.preventDefault();
    setSavingMeta(true);
    setError(null);
    const result = await updateForm(formId, {
      title,
      description,
      isRequiredFirstAccess,
      enableProcessLinking,
      isProcessActivationForm,
    });
    if ("error" in result && result.error) {
      setError(result.error);
    } else {
      await load();
    }
    setSavingMeta(false);
  }

  async function handleAddQuestion(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const result = await addQuestion(formId, {
      prompt: newQuestionPrompt,
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
    setNewQuestionType("short_text");
    setPendingExpandLast(true);
    load();
  }

  async function handleActivate() {
    setError(null);
    const result = await setActiveForm(formId);
    if ("error" in result && result.error) setError(result.error);
    else load();
  }

  async function handleMoveUp(index: number) {
    if (index <= 0) return;
    const newOrder = [...questions];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    const result = await reorderQuestions(
      formId,
      newOrder.map((q) => q.id)
    );
    if ("error" in result && result.error) setError(result.error);
    else load();
  }

  async function handleMoveDown(index: number) {
    if (index >= questions.length - 1) return;
    const newOrder = [...questions];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    const result = await reorderQuestions(
      formId,
      newOrder.map((q) => q.id)
    );
    if ("error" in result && result.error) setError(result.error);
    else load();
  }

  async function handleDuplicate(index: number) {
    setError(null);
    const result = await duplicateQuestion(questions[index].id, formId);
    if ("error" in result && result.error) setError(result.error);
    else {
      load();
      setPendingExpandLast(true);
    }
  }

  if (loading) {
    return (
      <PageLayout
        title="Formulário"
        description="Carregando..."
        iconName="ClipboardList"
        backHref="/admin/formularios"
      >
        <p className="text-muted-foreground">Carregando...</p>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title={form?.title ?? "Formulário"}
      description="Builder estilo Google Forms. Configure perguntas e, se habilitado, vincule processos."
      iconName="ClipboardList"
      backHref="/admin/formularios"
      backLabel="Voltar aos formulários"
      actions={
        <div className="flex gap-2">
          <Link
            href="/admin/formularios"
            className={buttonVariants({ variant: "outline" })}
          >
            Voltar
          </Link>
          {!form?.is_active && (
            <Button onClick={handleActivate}>
              <Rocket className="mr-2 h-4 w-4" />
              Ativar
            </Button>
          )}
        </div>
      }
    >
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="mx-auto max-w-3xl space-y-4">
        {/* Cabeçalho do formulário */}
        <div className="rounded-xl border border-border/60 bg-card p-6">
          <button
            type="button"
            onClick={() => setShowConfig((v) => !v)}
            className="flex w-full items-center gap-3 text-left"
          >
            {showConfig ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="flex-1 font-medium">{form?.title ?? "Sem título"}</span>
            <Badge variant={form?.is_active ? "success" : "secondary"}>
              {form?.is_active ? "Ativo" : "Rascunho"}
            </Badge>
            {form?.is_process_activation_form && (
              <Badge variant="outline">Ativação</Badge>
            )}
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
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
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
                <label className="flex items-center gap-2">
                  <Switch
                    checked={isProcessActivationForm}
                    onCheckedChange={setIsProcessActivationForm}
                  />
                  <span className="text-sm">Formulário de ativação</span>
                </label>
                <label className="flex items-center gap-2">
                  <Switch
                    checked={enableProcessLinking}
                    onCheckedChange={setEnableProcessLinking}
                  />
                  <span className="text-sm">Vincular processos</span>
                </label>
              </div>
              <Button type="submit" disabled={savingMeta}>
                {savingMeta ? "Salvando..." : "Salvar configuração"}
              </Button>
            </form>
          )}
        </div>

        {/* Lista de perguntas */}
        {questions.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="Nenhuma pergunta"
            description="Adicione a primeira pergunta abaixo."
          />
        ) : (
          <div className="space-y-3">
            {questions.map((q, index) => (
              <QuestionCard
                key={q.id}
                index={index}
                formId={formId}
                question={q}
                processes={processes}
                enableProcessLinking={enableProcessLinking}
                isOpen={expandedQuestionId === q.id}
                onToggle={() =>
                  setExpandedQuestionId(expandedQuestionId === q.id ? null : q.id)
                }
                onMoveUp={() => handleMoveUp(index)}
                onMoveDown={() => handleMoveDown(index)}
                onDuplicate={() => handleDuplicate(index)}
                canMoveUp={index > 0}
                canMoveDown={index < questions.length - 1}
                onChanged={load}
              />
            ))}
          </div>
        )}

        {/* Adicionar pergunta */}
        <form
          onSubmit={handleAddQuestion}
          className="flex items-center gap-2 rounded-xl border border-dashed border-border/60 bg-muted/20 p-4"
        >
          <Plus className="h-5 w-5 shrink-0 text-muted-foreground" />
          <Input
            value={newQuestionPrompt}
            onChange={(e) => setNewQuestionPrompt(e.target.value)}
            placeholder="Adicionar pergunta"
            required
            className="flex-1 border-0 bg-transparent"
          />
          <Select
            value={newQuestionType}
            onChange={(e) =>
              setNewQuestionType(e.target.value as FormQuestionType)
            }
            className="w-44"
          >
            {QUESTION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
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

function QuestionCard({
  index,
  formId,
  question,
  processes,
  enableProcessLinking,
  isOpen,
  onToggle,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  canMoveUp,
  canMoveDown,
  onChanged,
}: {
  index: number;
  formId: string;
  question: QuestionItem;
  processes: BaseProcess[];
  enableProcessLinking: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onChanged: () => void;
}) {
  const [prompt, setPrompt] = useState(question.prompt);
  const [helperText, setHelperText] = useState(question.helper_text ?? "");
  const [questionType, setQuestionType] = useState<FormQuestionType>(
    normalizeDisplayType(question.question_type)
  );
  const [isRequired, setIsRequired] = useState(question.is_required);
  const [enableProcLink, setEnableProcLink] = useState(
    question.enable_process_linking
  );
  const [linkedProcessIds, setLinkedProcessIds] = useState<string[]>(
    (question.process_questionnaire_question_processes ?? []).map(
      (p) => p.base_process_id
    )
  );
  const [optionDrafts, setOptionDrafts] = useState<OptionDraft[]>(
    (question.process_questionnaire_options ?? []).map((o) => ({
      localId: o.id,
      id: o.id,
      label: o.label,
      value: o.value ?? "",
      isActive: o.is_active,
      enableProcessLinking: o.enable_process_linking,
      linkedProcessIds:
        (o.process_questionnaire_option_processes ?? []).map(
          (p) => p.base_process_id
        ),
      isExpanded: false,
    }))
  );
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setPrompt(question.prompt);
    setHelperText(question.helper_text ?? "");
    setQuestionType(normalizeDisplayType(question.question_type));
    setIsRequired(question.is_required);
    setEnableProcLink(question.enable_process_linking);
    setLinkedProcessIds(
      (question.process_questionnaire_question_processes ?? []).map(
        (p) => p.base_process_id
      )
    );
    setOptionDrafts(
      (question.process_questionnaire_options ?? []).map((o) => ({
        localId: o.id,
        id: o.id,
        label: o.label,
        value: o.value ?? "",
        isActive: o.is_active,
        enableProcessLinking: o.enable_process_linking,
        linkedProcessIds:
          (o.process_questionnaire_option_processes ?? []).map(
            (p) => p.base_process_id
          ),
        isExpanded: false,
      }))
    );
  }, [question]);

  const supportsOptions =
    questionType === "single_select" || questionType === "multi_select";

  function addOptionRow() {
    setOptionDrafts((prev) => [
      ...prev,
      {
        localId: crypto.randomUUID(),
        id: null,
        label: "",
        value: "",
        isActive: true,
        enableProcessLinking: false,
        linkedProcessIds: [],
        isExpanded: false,
      },
    ]);
  }

  function removeOptionRow(localId: string) {
    setOptionDrafts((prev) => prev.filter((d) => d.localId !== localId));
  }

  function updateDraft(
    localId: string,
    upd: (d: OptionDraft) => Partial<OptionDraft>
  ) {
    setOptionDrafts((prev) =>
      prev.map((d) =>
        d.localId === localId ? { ...d, ...upd(d) } : d
      )
    );
  }

  async function handleSave() {
    setErr(null);
    setSaving(true);
    const invalid = optionDrafts.find((d) => d.id && !d.label.trim());
    if (invalid) {
      setErr("Preencha ou remova alternativas vazias.");
      setSaving(false);
      return;
    }

    const qResult = await updateQuestion(question.id, formId, {
      prompt,
      helperText: helperText || undefined,
      questionType,
      isRequired,
      enableProcessLinking: enableProcLink,
      linkedProcessIds,
    });
    if ("error" in qResult && qResult.error) {
      setErr(qResult.error);
      setSaving(false);
      return;
    }

    const origIds = new Set(
      (question.process_questionnaire_options ?? []).map((o) => o.id)
    );
    const draftsById = new Map(optionDrafts.filter((d) => d.id).map((d) => [d.id, d]));
    for (const oid of origIds) {
      if (!draftsById.has(oid)) {
        const r = await deleteOption(oid, formId);
        if ("error" in r && r.error) {
          setErr(r.error);
          setSaving(false);
          return;
        }
      }
    }

    for (const d of optionDrafts) {
      if (!d.label.trim()) continue;
      if (d.id) {
        const r = await updateOption(d.id, formId, {
          label: d.label,
          value: d.value || d.label,
          enableProcessLinking: d.enableProcessLinking,
          linkedProcessIds: d.linkedProcessIds,
          isActive: d.isActive,
        });
        if ("error" in r && r.error) {
          setErr(r.error);
          setSaving(false);
          return;
        }
      } else {
        const r = await addOption(question.id, formId, {
          label: d.label,
          value: d.value || d.label,
          enableProcessLinking: d.enableProcessLinking,
          linkedProcessIds: d.linkedProcessIds,
        });
        if ("error" in r && r.error) {
          setErr(r.error);
          setSaving(false);
          return;
        }
      }
    }
    setSaving(false);
    onChanged();
  }

  async function handleDelete() {
    if (!confirm("Excluir esta pergunta?")) return;
    const r = await deleteQuestion(question.id, formId);
    if ("error" in r && r.error) setErr(r.error);
    else onChanged();
  }

  const typeLabel =
    QUESTION_TYPES.find((t) => t.value === questionType)?.label ?? questionType;

  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
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
            {index + 1}. {typeLabel}
            {question.is_required ? " *" : ""}
          </span>
          <span className="truncate font-medium">{question.prompt}</span>
        </button>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMoveUp}
            disabled={!canMoveUp}
            aria-label="Mover para cima"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onMoveDown}
            disabled={!canMoveDown}
            aria-label="Mover para baixo"
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDuplicate}
            aria-label="Duplicar"
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            aria-label="Excluir"
            className="text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isOpen && (
        <div className="space-y-4 p-4">
          {err && (
            <div className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">
              {err}
            </div>
          )}
          <div className="space-y-2">
            <Label>Pergunta</Label>
            <Input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Pergunta"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Descrição (opcional)
            </Label>
            <Textarea
              rows={2}
              value={helperText}
              onChange={(e) => setHelperText(e.target.value)}
              placeholder="Texto de apoio"
            />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Tipo</Label>
              <Select
                value={questionType}
                onChange={(e) =>
                  setQuestionType(e.target.value as FormQuestionType)
                }
              >
                {QUESTION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </div>
            <label className="flex items-center gap-2 pt-6">
              <Switch checked={isRequired} onCheckedChange={setIsRequired} />
              <span className="text-sm">Obrigatória</span>
            </label>
          </div>

          {supportsOptions && (
            <div className="space-y-2">
              <Label className="text-xs">Alternativas</Label>
              <div className="rounded-lg border border-border/60">
                {optionDrafts.map((opt, i) => (
                  <div key={opt.localId} className="border-b border-border/60 last:border-b-0">
                    <div className="flex items-center gap-2 px-3 py-2">
                      {questionType === "multi_select" ? (
                        <Square className="h-4 w-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                      <Input
                        value={opt.label}
                        onChange={(e) =>
                          updateDraft(opt.localId, () => ({
                            label: e.target.value,
                            value: e.target.value || opt.value,
                          }))
                        }
                        className="flex-1 border-0 shadow-none"
                        placeholder={`Opção ${i + 1}`}
                      />
                      {enableProcessLinking && (
                        <button
                          type="button"
                          onClick={() =>
                            updateDraft(opt.localId, (d) => ({
                              isExpanded: !d.isExpanded,
                            }))
                          }
                          className="rounded p-1 text-muted-foreground hover:bg-accent"
                          title="Vincular processos"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removeOptionRow(opt.localId)}
                        className="rounded p-1 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    {enableProcessLinking && opt.isExpanded && (
                      <div className="border-t border-border/60 bg-muted/20 px-3 py-3">
                        <div className="mb-2 flex items-center gap-2">
                          <Switch
                            checked={opt.enableProcessLinking}
                            onCheckedChange={(c) =>
                              updateDraft(opt.localId, () => ({
                                enableProcessLinking: c,
                                linkedProcessIds: c ? opt.linkedProcessIds : [],
                              }))
                            }
                          />
                          <span className="text-xs">Vincular processos nesta alternativa</span>
                        </div>
                        {opt.enableProcessLinking && (
                          <ProcessSelector
                            processes={processes}
                            selectedIds={opt.linkedProcessIds}
                            onToggle={(id, checked) =>
                              updateDraft(opt.localId, () => ({
                                linkedProcessIds: checked
                                  ? [...opt.linkedProcessIds, id]
                                  : opt.linkedProcessIds.filter((x) => x !== id),
                              }))
                            }
                          />
                        )}
                      </div>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addOptionRow}
                  className="flex w-full items-center gap-2 px-3 py-3 text-left text-sm text-muted-foreground hover:bg-accent/20"
                >
                  {questionType === "multi_select" ? (
                    <Square className="h-4 w-4" />
                  ) : (
                    <Circle className="h-4 w-4" />
                  )}
                  Adicionar opção
                </button>
              </div>
            </div>
          )}

          {enableProcessLinking && (
            <div className="rounded-lg border border-border/60 p-4">
              <button
                type="button"
                onClick={() => setShowAdvanced((v) => !v)}
                className="flex items-center gap-2 text-sm font-medium"
              >
                <MoreHorizontal className="h-4 w-4" />
                Opções avançadas
              </button>
              {showAdvanced && (
                <div className="mt-3 space-y-3">
                  <label className="flex items-center gap-2">
                    <Switch
                      checked={enableProcLink}
                      onCheckedChange={(c) => {
                        setEnableProcLink(c);
                        if (!c) setLinkedProcessIds([]);
                      }}
                    />
                    <span className="text-sm">
                      Vincular processos na pergunta
                    </span>
                  </label>
                  {enableProcLink && (
                    <ProcessSelector
                      processes={processes}
                      selectedIds={linkedProcessIds}
                      onToggle={(id, checked) =>
                        setLinkedProcessIds((prev) =>
                          checked
                            ? [...prev, id]
                            : prev.filter((x) => x !== id)
                        )
                      }
                    />
                  )}
                </div>
              )}
            </div>
          )}

          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar pergunta e alternativas"}
          </Button>
        </div>
      )}
    </div>
  );
}

type OptionDraft = {
  localId: string;
  id: string | null;
  label: string;
  value: string;
  isActive: boolean;
  enableProcessLinking: boolean;
  linkedProcessIds: string[];
  isExpanded?: boolean;
};

function ProcessSelector({
  processes,
  selectedIds,
  onToggle,
}: {
  processes: BaseProcess[];
  selectedIds: string[];
  onToggle: (id: string, checked: boolean) => void;
}) {
  if (processes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Cadastre processos em /admin/processos primeiro.
      </p>
    );
  }
  return (
    <div className="grid gap-2 md:grid-cols-2">
      {processes.map((p) => (
        <label
          key={p.id}
          className="flex items-start gap-2 rounded-md p-2 text-sm hover:bg-accent/30"
        >
          <input
            type="checkbox"
            checked={selectedIds.includes(p.id)}
            onChange={(e) => onToggle(p.id, e.target.checked)}
          />
          <span>
            <span className="block font-medium">{p.name}</span>
            <span className="block text-muted-foreground">
              {p.category || "Sem categoria"}
            </span>
          </span>
        </label>
      ))}
    </div>
  );
}
