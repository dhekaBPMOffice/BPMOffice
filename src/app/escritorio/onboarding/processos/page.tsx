import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLayout } from "@/components/layout/page-layout";
import { ClipboardList } from "lucide-react";
import { ProcessOnboardingForm } from "./process-onboarding-form";

export default async function ProcessOnboardingPage() {
  const profile = await requireRole(["leader"]);
  const supabase = await createClient();

  if (!profile.office_id) {
    return (
      <PageLayout
        title="Onboarding de Processos"
        description="Seu escritório precisa estar vinculado para continuar."
        icon={ClipboardList}
      >
        <p className="text-destructive">Escritório não encontrado.</p>
      </PageLayout>
    );
  }

  const [{ data: office }, { data: questionnaire }] = await Promise.all([
    supabase
      .from("offices")
      .select("processes_initialized_at")
      .eq("id", profile.office_id)
      .single(),
    supabase
      .from("process_questionnaires")
      .select(`
        id,
        title,
        description,
        process_questionnaire_questions (
          id,
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
        )
      `)
      .eq("is_process_activation_form", true)
      .single(),
  ]);

  if (office?.processes_initialized_at) {
    redirect("/escritorio/estrategia/cadeia-valor?aba=gestao");
  }

  if (!questionnaire) {
    return (
      <PageLayout
        title="Onboarding de Processos"
        description="Nenhum questionário ativo foi configurado."
        icon={ClipboardList}
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
    <PageLayout
      title="Onboarding de Processos"
      description="Responda ao questionário para que o sistema monte a estrutura inicial de processos do seu escritório."
      icon={ClipboardList}
    >
      <ProcessOnboardingForm questionnaire={questionnaire} />
    </PageLayout>
  );
}
