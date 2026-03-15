import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageLayout } from "@/components/layout/page-layout";
import { Building2 } from "lucide-react";
import { EscritorioEditForm } from "./escritorio-edit-form";
import { LiderEscritorioCardClient } from "./lider-escritorio-card-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EscritorioDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const supabaseAdmin = await createServiceClient();

  const { data: office, error: officeError } = await supabase
    .from("offices")
    .select(`
      id,
      name,
      slug,
      plan_id,
      is_active,
      created_at,
      updated_at,
      plans (
        id,
        name
      )
    `)
    .eq("id", id)
    .single();

  if (officeError || !office) {
    notFound();
  }

  const [{ count: userCount }, { data: branding }, { data: leaders }] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("office_id", id),
    supabase.from("branding").select("*").eq("office_id", id).single(),
    supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, created_at")
      .eq("office_id", id)
      .eq("role", "leader")
      .order("created_at", { ascending: true }),
  ]);

  const plansData = office.plans as unknown;
  const planName = Array.isArray(plansData)
    ? (plansData[0] as { name: string })?.name ?? "—"
    : (plansData as { name: string } | null)?.name ?? "—";
  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const { data: plans } = await supabase
    .from("plans")
    .select("id, name")
    .eq("is_active", true)
    .order("name");

  return (
    <PageLayout
      title={office.name}
      description="Detalhes e configurações do escritório."
      icon={Building2}
      backHref="/admin/escritorios"
      backLabel="Voltar para escritórios"
    >

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Informações do Escritório</CardTitle>
            <CardDescription>
              Dados cadastrais e status do escritório.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Nome</p>
              <p className="text-base">{office.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Slug</p>
              <p className="font-mono text-sm">{office.slug}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Plano</p>
              <p>{planName}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <Badge variant={office.is_active ? "success" : "secondary"}>
                {office.is_active ? "Ativo" : "Inativo"}
              </Badge>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Usuários
              </p>
              <p className="text-base">{userCount ?? 0}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Criado em
              </p>
              <p className="text-sm">{formatDate(office.created_at)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Identidade Visual</CardTitle>
            <CardDescription>
              Cores e personalização do escritório.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {branding ? (
              <>
                <div className="flex gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Cor primária
                    </p>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-8 w-8 rounded border"
                        style={{
                          backgroundColor: branding.primary_color ?? "#0097a7",
                        }}
                      />
                      <span className="font-mono text-sm">
                        {branding.primary_color}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Cor secundária
                    </p>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-8 w-8 rounded border"
                        style={{
                          backgroundColor:
                            branding.secondary_color ?? "#7b1fa2",
                        }}
                      />
                      <span className="font-mono text-sm">
                        {branding.secondary_color}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Cor de destaque
                    </p>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-8 w-8 rounded border"
                        style={{
                          backgroundColor: branding.accent_color ?? "#c2185b",
                        }}
                      />
                      <span className="font-mono text-sm">
                        {branding.accent_color}
                      </span>
                    </div>
                  </div>
                </div>
                {branding.logo_url && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Logo
                    </p>
                    <img
                      src={branding.logo_url}
                      alt="Logo"
                      className="h-12 object-contain"
                    />
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhuma identidade visual configurada.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Líder do escritório</CardTitle>
          <CardDescription>
            Líder responsável por este escritório. Pode cadastrar com e-mail e senha.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {leaders && leaders.length > 0 && (
            <ul className="space-y-2">
              {leaders.map((l) => (
                <li key={l.id} className="flex flex-col text-sm">
                  <span className="font-medium">{l.full_name}</span>
                  <span className="text-muted-foreground">{l.email}</span>
                </li>
              ))}
            </ul>
          )}
          <LiderEscritorioCardClient officeId={id} hasLeaders={(leaders?.length ?? 0) > 0} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Onboarding e processos</CardTitle>
          <CardDescription>
            Consulte as respostas do questionário inicial e a lista de processos gerada para este escritório.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href={`/admin/escritorios/${id}/processos`}
            className={buttonVariants()}
          >
            Ver questionário e processos
          </Link>
        </CardContent>
      </Card>

      <EscritorioEditForm
        office={{
          id: office.id,
          name: office.name,
          slug: office.slug,
          plan_id: office.plan_id,
          is_active: office.is_active,
        }}
        plans={plans ?? []}
      />
    </PageLayout>
  );
}
