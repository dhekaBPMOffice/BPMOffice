import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageLayout } from "@/components/layout/page-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Book } from "lucide-react";

const SECTION_CONFIG: {
  id: string;
  resource: string | null;
  title: string;
  content: string;
}[] = [
  {
    id: "introducao",
    resource: null,
    title: "Introdução",
    content: `
# Bem-vindo ao BPM Office

Este manual apresenta as funcionalidades disponíveis na plataforma de acordo com seu perfil de acesso.

O **BPM Office** é uma plataforma SaaS para escritórios de processos de negócio, permitindo gestão de demandas, estratégia, conhecimento e capacitação.
    `.trim(),
  },
  {
    id: "demandas",
    resource: "demandas",
    title: "Demandas",
    content: `
# Gestão de Demandas

A área de **Demandas** permite acompanhar o ciclo completo de projetos BPM:

- **Levantamento**: coleta de requisitos e informações iniciais
- **Análise**: análise de processos e identificação de melhorias
- **Planejamento**: definição de cronograma e recursos
- **Modelagem**: documentação de processos
- **Melhorias**: sugestões e implementação
- **Implantação**: execução e acompanhamento
- **Encerramento**: conclusão e lições aprendidas
    `.trim(),
  },
  {
    id: "estrategia",
    resource: "estrategia",
    title: "Estratégia",
    content: `
# Área Estratégica

A **Estratégia** contempla:

- **Cadeia de Valor**: mapeamento de processos em Gestão, Negócio e Apoio
- **Planejamento Estratégico**: identidade, análise SWOT, objetivos estratégicos e planos táticos com IA
- **Framework de Processos**: configuração de frameworks ativos
- **Portfólio de Serviços**: catálogo de serviços e demanda x capacidade
    `.trim(),
  },
  {
    id: "conhecimento",
    resource: "conhecimento",
    title: "Conhecimento",
    content: `
# Base de Conhecimento

A **Base de Conhecimento** centraliza:

- Planos de Comunicação
- Eventos
- Atividades
- Melhores Práticas
- Materiais de Treinamento
- Palestras
- Modelos de Documentos
- Base de Prompts
    `.trim(),
  },
  {
    id: "capacitacao",
    resource: "capacitacao",
    title: "Capacitação",
    content: `
# Capacitação

A área de **Capacitação** permite:

- **Planos de Treinamento**: criação e gestão de planos por perfil
- **Registros de Treinamento**: acompanhamento do status de conclusão por usuário

Os líderes podem atribuir planos aos colaboradores e acompanhar o progresso.
    `.trim(),
  },
  {
    id: "configuracoes",
    resource: "usuarios",
    title: "Configurações",
    content: `
# Configurações

As **Configurações** incluem:

- **Usuários e Perfis**: gestão de usuários e permissões por perfil customizado
- **Identidade Visual**: branding do escritório
- **Configurações Gerais**: preferências e parâmetros do escritório
    `.trim(),
  },
];

function markdownToHtml(md: string): string {
  return md
    .replace(/^### (.*)$/gm, "<h3 class='text-lg font-semibold mt-4 mb-2'>$1</h3>")
    .replace(/^## (.*)$/gm, "<h2 class='text-xl font-semibold mt-6 mb-3'>$1</h2>")
    .replace(/^# (.*)$/gm, "<h1 class='text-2xl font-bold mt-4 mb-4'>$1</h1>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/^- (.*)$/gm, "<li class='my-1'>$1</li>")
    .replace(/(<li class='my-1'>.*<\/li>\n?)+/g, (m) => `<ul class='list-disc ml-4 my-2'>${m}</ul>`)
    .replace(/\n\n/g, "</p><p class='my-2 leading-relaxed'>")
    .replace(/\n/g, "<br />")
    .replace(/^/, "<div class='leading-relaxed'>")
    .replace(/$/, "</div>");
}

async function getAllowedSections() {
  const profile = await getProfile();
  const allowed = new Set<string>();

  // Introdução sempre visível
  allowed.add("introducao");

  if (profile.role === "admin_master") {
    SECTION_CONFIG.forEach((s) => allowed.add(s.id));
    return allowed;
  }

  if (profile.role === "leader") {
    SECTION_CONFIG.forEach((s) => allowed.add(s.id));
    return allowed;
  }

  // user: verificar role_permissions do custom_role
  if (profile.custom_role_id) {
    const supabase = await createClient();
    const { data: perms } = await supabase
      .from("role_permissions")
      .select("resource, can_view")
      .eq("role_id", profile.custom_role_id)
      .eq("can_view", true);

    const allowedResources = new Set((perms ?? []).map((p) => p.resource));

    SECTION_CONFIG.forEach((s) => {
      if (!s.resource) allowed.add(s.id);
      else if (allowedResources.has(s.resource)) allowed.add(s.id);
    });
  } else {
    // user sem custom_role: sem permissões extras além da introdução
  }

  return allowed;
}

export default async function ManualPage() {
  const allowed = await getAllowedSections();

  return (
    <PageLayout
      title="Manual do Usuário"
      description="Documentação das funcionalidades disponíveis para seu perfil."
      icon={Book}
    >
      <div className="space-y-6">
        {SECTION_CONFIG.filter((s) => allowed.has(s.id)).map((section) => (
          <Card key={section.id}>
            <CardHeader>
              <CardTitle>{section.title}</CardTitle>
              <CardDescription>
                Conteúdo da seção {section.title.toLowerCase()}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className="prose prose-sm dark:prose-invert max-w-none [&_ul]:list-disc [&_ul]:ml-4 [&_li]:my-1"
                dangerouslySetInnerHTML={{
                  __html: markdownToHtml(section.content),
                }}
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </PageLayout>
  );
}
