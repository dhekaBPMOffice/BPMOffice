import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageLayout } from "@/components/layout/page-layout";
import { ClipboardList } from "lucide-react";

export default async function AdminEscritorioProcessosPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const supabaseAdmin = await createServiceClient();

  const [{ data: office, error: officeError }, { data: officeProcesses }, { data: submissions }] =
    await Promise.all([
      supabase.from("offices").select("id, name").eq("id", id).single(),
      supabaseAdmin
        .from("office_processes")
        .select("id, name, origin, status, selected_at")
        .eq("office_id", id)
        .order("selected_at", { ascending: false }),
      supabaseAdmin
        .from("office_questionnaire_submissions")
        .select("id, questionnaire_id, generated_process_ids, submitted_at")
        .eq("office_id", id)
        .order("submitted_at", { ascending: false }),
    ]);

  if (officeError || !office) {
    notFound();
  }

  const latestSubmission = submissions?.[0] ?? null;
  const submissionAnswers = latestSubmission
    ? await supabaseAdmin
        .from("office_questionnaire_answers")
        .select(`
          id,
          answer_text,
          selected_option_ids,
          process_questionnaire_questions (
            prompt,
            question_type
          )
        `)
        .eq("submission_id", latestSubmission.id)
    : { data: [] };

  return (
    <PageLayout
      title={`Processos de ${office.name}`}
      description="Visão administrativa das respostas do onboarding e da lista gerada para o escritório."
      iconName="ClipboardList"
      backHref={`/admin/escritorios/${office.id}`}
      backLabel="Voltar para escritório"
      actions={
        <Link
          href={`/admin/escritorios/${office.id}`}
          className={buttonVariants({ variant: "outline" })}
        >
          Voltar para escritório
        </Link>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Última submissão do questionário</CardTitle>
            <CardDescription>
              Respostas fornecidas pelo líder no onboarding inicial.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!latestSubmission ? (
              <p className="text-sm text-muted-foreground">
                Este escritório ainda não respondeu ao questionário.
              </p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Respondido em {new Date(latestSubmission.submitted_at).toLocaleString("pt-BR")}
                </p>
                {(submissionAnswers.data ?? []).map((answer) => {
                  const question = answer.process_questionnaire_questions as {
                    prompt?: string;
                    question_type?: string;
                  } | null;

                  return (
                    <div key={answer.id} className="rounded-lg border border-border/60 p-3">
                      <p className="text-sm font-medium">{question?.prompt || "Pergunta"}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {question?.question_type === "text"
                          ? answer.answer_text || "Sem resposta textual."
                          : (answer.selected_option_ids ?? []).length > 0
                            ? `${(answer.selected_option_ids ?? []).length} alternativa(s) selecionada(s)`
                            : "Nenhuma alternativa selecionada."}
                      </p>
                    </div>
                  );
                })}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Processos gerados</CardTitle>
            <CardDescription>
              Lista atual de processos disponibilizados para o escritório.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!officeProcesses || officeProcesses.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum processo foi adicionado ao escritório.
              </p>
            ) : (
              officeProcesses.map((process) => (
                <div
                  key={process.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border/60 p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{process.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Origem: {process.origin === "questionnaire" ? "Automática" : "Manual"}
                    </p>
                  </div>
                  <Badge variant={process.status === "completed" ? "success" : "outline"}>
                    {process.status}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
