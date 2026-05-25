import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLayout } from "@/components/layout/page-layout";
import { OnboardingCompletionScreen } from "./onboarding-completion-screen";
import { ProcessOnboardingForm } from "./process-onboarding-form";

/** Máx. duração do pedido (seg.) para `submitProcessOnboarding` (importar vários processos + ficheiros). Ajuste no hosting (ex. Vercel) conforme o plano. */
export const maxDuration = 300;

export default async function ProcessOnboardingPage() {
  const profile = await requireRole(["leader"]);
  const supabase = await createClient();

  if (!profile.office_id) {
    return (
      <PageLayout
        title="Onboarding de Processos"
        description="Seu escritório precisa estar vinculado para continuar."
        iconName="ClipboardList"
      >
        <p className="text-destructive">Escritório não encontrado.</p>
      </PageLayout>
    );
  }

  const [{ data: office }, { data: questionnaire }, { data: sections }, { data: questions }] =
    await Promise.all([
    supabase
      .from("offices")
      .select("processes_initialized_at")
      .eq("id", profile.office_id)
      .single(),
    supabase
      .from("process_questionnaires")
      .select("id, title, description, uses_sections")
      .eq("is_process_activation_form", true)
      .single(),
    supabase
      .from("process_questionnaire_sections")
      .select("id, title, subtitle, description, sort_order, questionnaire_id")
      .order("sort_order", { ascending: true }),
    supabase
      .from("process_questionnaire_questions")
      .select(`
        id,
        section_id,
        questionnaire_id,
        prompt,
        helper_text,
        question_type,
        is_required,
        sort_order,
        process_questionnaire_options (
          id,
          label,
          value,
          helper_text,
          sort_order,
          is_active
        )
      `)
      .order("sort_order", { ascending: true }),
    ]);

  const questionnaireSections = questionnaire
    ? (sections ?? [])
        .filter((section) => section.questionnaire_id === questionnaire.id)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((section) => ({
          ...section,
          process_questionnaire_questions: (questions ?? [])
            .filter(
              (question) =>
                question.questionnaire_id === questionnaire.id &&
                question.section_id === section.id
            )
            .sort((a, b) => a.sort_order - b.sort_order),
        }))
    : [];

  if (office?.processes_initialized_at) {
    let answeredQuestions = 0;

    if (questionnaire?.id) {
      const { data: latestSubmission } = await supabase
        .from("office_questionnaire_submissions")
        .select("id")
        .eq("office_id", profile.office_id)
        .eq("questionnaire_id", questionnaire.id)
        .order("submitted_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestSubmission?.id) {
        const { count } = await supabase
          .from("office_questionnaire_answers")
          .select("*", { count: "exact", head: true })
          .eq("submission_id", latestSubmission.id);

        answeredQuestions = count ?? 0;
      }
    }

    return (
      <div
        style={{ margin: "calc(-1 * var(--spacing-page))" }}
        className="flex min-h-[calc(100vh-64px)] items-start justify-center bg-muted/30 px-4 py-10 sm:px-6 sm:py-12"
      >
        <OnboardingCompletionScreen
          sectionsCount={questionnaireSections.length}
          answeredQuestions={answeredQuestions}
        />
      </div>
    );
  }

  if (!questionnaire) {
    return (
      <PageLayout
        title="Onboarding de Processos"
        description="Nenhum questionário ativo foi configurado."
        iconName="ClipboardList"
      >
        <Card>
          <CardHeader>
            <CardTitle>Questionário indisponível</CardTitle>
            <CardDescription>
              Peça ao administrador master para ativar um questionário de processos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Assim que o questionário estiver ativo, o sistema poderá gerar a lista inicial de processos do escritório.
            </p>
          </CardContent>
        </Card>
      </PageLayout>
    );
  }

  return (
    <ProcessOnboardingForm
      questionnaire={{
        ...questionnaire,
        process_questionnaire_sections: questionnaireSections,
      }}
    />
  );
}
