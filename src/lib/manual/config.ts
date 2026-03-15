/**
 * Configuração central do Manual de Uso
 *
 * CONVENÇÃO DE MANUTENÇÃO:
 * - Ao adicionar nova feature/módulo no código, inclua entrada em MANUAL_MODULES
 * - Mantenha "resource" alinhado com role_permissions (perfis) para filtro automático
 * - Atualize FIRST_STEPS_BY_ROLE quando houver mudança no fluxo de onboarding
 *
 * CHECKLIST ao adicionar feature:
 * 1. Adicione entrada em MANUAL_MODULES com id, resource, title, shortDescription, content
 * 2. Se o recurso for novo, garanta que exista em role_permissions / RESOURCES (perfis)
 * 3. Se fizer parte do onboarding, adicione passo em FIRST_STEPS_BY_ROLE (leader ou user)
 */

export type ProfileRole = "leader" | "user";

export interface FirstStep {
  step: number;
  title: string;
  description: string;
  moduleId: string;
  href?: string;
  iconName: string;
}

export interface ManualModule {
  id: string;
  resource: string | null;
  title: string;
  shortDescription: string;
  iconName: string;
  href: string;
  content: string;
  steps?: string[];
}

export const FIRST_STEPS_BY_ROLE: Record<ProfileRole, FirstStep[]> = {
  leader: [
    {
      step: 1,
      title: "Onboarding de Processos",
      description: "Complete o questionário inicial para definir os processos do escritório.",
      moduleId: "processos",
      href: "/escritorio/onboarding/processos",
      iconName: "ListChecks",
    },
    {
      step: 2,
      title: "Cadeia de Valor",
      description: "Mapeie os processos em Gestão, Negócio e Apoio.",
      moduleId: "estrategia",
      href: "/escritorio/estrategia/cadeia-valor",
      iconName: "Target",
    },
    {
      step: 3,
      title: "Usuários e Perfis",
      description: "Cadastre colaboradores e configure permissões por perfil.",
      moduleId: "configuracoes",
      href: "/escritorio/usuarios",
      iconName: "Users",
    },
    {
      step: 4,
      title: "Objetivos Estratégicos",
      description: "Defina os objetivos estratégicos do escritório.",
      moduleId: "estrategia",
      href: "/escritorio/estrategia/objetivos-estrategicos",
      iconName: "Target",
    },
    {
      step: 5,
      title: "Planos Táticos",
      description: "Crie planos táticos com apoio da IA.",
      moduleId: "estrategia",
      href: "/escritorio/estrategia/plano-tatico",
      iconName: "ClipboardList",
    },
    {
      step: 6,
      title: "Configurar Demandas",
      description: "Acompanhe o ciclo de projetos BPM.",
      moduleId: "demandas",
      href: "/escritorio/demandas",
      iconName: "ClipboardList",
    },
    {
      step: 7,
      title: "Base de Conhecimento",
      description: "Organize planos, eventos, materiais e melhores práticas.",
      moduleId: "conhecimento",
      href: "/escritorio/conhecimento",
      iconName: "BookOpen",
    },
    {
      step: 8,
      title: "Capacitação",
      description: "Configure planos de treinamento e atribua aos colaboradores.",
      moduleId: "capacitacao",
      href: "/escritorio/capacitacao",
      iconName: "GraduationCap",
    },
    {
      step: 9,
      title: "Identidade Visual",
      description: "Personalize a logo e cores do escritório.",
      moduleId: "configuracoes",
      href: "/escritorio/branding",
      iconName: "Palette",
    },
    {
      step: 10,
      title: "Configurações",
      description: "Revise preferências e parâmetros gerais.",
      moduleId: "configuracoes",
      href: "/escritorio/configuracoes",
      iconName: "Settings",
    },
  ],
  user: [
    {
      step: 1,
      title: "Área de Trabalho",
      description: "Conheça sua área central com demandas e atividades.",
      moduleId: "trabalho",
      href: "/escritorio/trabalho",
      iconName: "LayoutDashboard",
    },
    {
      step: 2,
      title: "Demandas Atribuídas",
      description: "Acesse as demandas que foram atribuídas a você.",
      moduleId: "demandas",
      href: "/escritorio/demandas",
      iconName: "ClipboardList",
    },
    {
      step: 3,
      title: "Base de Conhecimento",
      description: "Consulte planos, materiais e melhores práticas.",
      moduleId: "conhecimento",
      href: "/escritorio/conhecimento",
      iconName: "BookOpen",
    },
    {
      step: 4,
      title: "Capacitação",
      description: "Conclua os treinamentos do seu plano.",
      moduleId: "capacitacao",
      href: "/escritorio/capacitacao",
      iconName: "GraduationCap",
    },
    {
      step: 5,
      title: "Fluxo de Demandas",
      description: "Entenda as etapas: levantamento, análise, planejamento e implantação.",
      moduleId: "demandas",
      href: "/escritorio/manual/demandas",
      iconName: "ClipboardList",
    },
  ],
};

export const MANUAL_MODULES: ManualModule[] = [
  {
    id: "trabalho",
    resource: null,
    title: "Área de Trabalho",
    shortDescription: "Sua área central com demandas atribuídas e atividades recentes.",
    iconName: "LayoutDashboard",
    href: "/escritorio/manual/trabalho",
    content: `
# Área de Trabalho

A **Área de Trabalho** é seu espaço central no sistema, onde você encontra:

- Demandas atribuídas a você
- Atividades recentes
- Acesso rápido aos principais módulos

Acesse pelo menu lateral para ver suas demandas e acompanhar o que precisa ser feito.
    `.trim(),
    steps: [
      "Acesse Área de Trabalho no menu",
      "Visualize as demandas atribuídas a você",
      "Clique em uma demanda para abrir os detalhes",
    ],
  },
  {
    id: "introducao",
    resource: null,
    title: "Introdução",
    shortDescription: "Bem-vindo ao BPM Office. Funcionalidades disponíveis de acordo com seu perfil.",
    iconName: "BookOpen",
    href: "/escritorio/manual/introducao",
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
    shortDescription: "Ciclo completo de projetos BPM: levantamento, análise, planejamento e implantação.",
    iconName: "ClipboardList",
    href: "/escritorio/manual/demandas",
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
    steps: [
      "Acesse Demandas no menu lateral",
      "Clique em Nova Demanda para iniciar um projeto",
      "Acompanhe cada etapa pelo fluxo indicado",
      "Utilize os filtros para localizar demandas por status ou responsável",
    ],
  },
  {
    id: "estrategia",
    resource: "estrategia",
    title: "Estratégia",
    shortDescription: "Cadeia de valor, SWOT, objetivos estratégicos e planos táticos com IA.",
    iconName: "Target",
    href: "/escritorio/manual/estrategia",
    content: `
# Área Estratégica

A **Estratégia** contempla:

- **Cadeia de Valor**: mapeamento de processos em Gestão, Negócio e Apoio
- **Planejamento Estratégico**: identidade, análise SWOT, objetivos estratégicos e planos táticos com IA
- **Framework de Processos**: configuração de frameworks ativos
- **Portfólio de Serviços**: catálogo de serviços e demanda x capacidade
    `.trim(),
    steps: [
      "Configure a cadeia de valor do escritório",
      "Crie ou importe objetivos estratégicos",
      "Use a análise SWOT para planejamento",
      "Gere planos táticos com suporte da IA",
    ],
  },
  {
    id: "processos",
    resource: "processos",
    title: "Processos",
    shortDescription: "Lista oficial de processos, onboarding e catálogo complementar.",
    iconName: "FileText",
    href: "/escritorio/manual/processos",
    content: `
# Processos do Escritório

A área de **Processos** gerencia a lista oficial do escritório:

- **Onboarding**: questionário inicial para definir processos por demanda
- **Catálogo**: seleção adicional de processos do catálogo base
- **Gestão por processo**: arquivos, formulários e informações de cada processo

A lista é gerada pelo onboarding e pode ser complementada manualmente pelo catálogo.
    `.trim(),
    steps: [
      "Complete o onboarding se ainda não iniciado",
      "Acesse Processos no menu para ver a lista oficial",
      "Adicione processos do catálogo quando necessário",
      "Clique em um processo para gerenciar detalhes e anexos",
    ],
  },
  {
    id: "conhecimento",
    resource: "conhecimento",
    title: "Conhecimento",
    shortDescription: "Planos de comunicação, eventos, materiais e base de prompts.",
    iconName: "BookOpen",
    href: "/escritorio/manual/conhecimento",
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
    steps: [
      "Acesse Conhecimento no menu lateral",
      "Navegue por categorias ou use a busca",
      "Crie novos itens conforme o tipo disponível",
      "Compartilhe links ou arquivos com a equipe",
    ],
  },
  {
    id: "capacitacao",
    resource: "capacitacao",
    title: "Capacitação",
    shortDescription: "Planos de treinamento e acompanhamento de conclusão por usuário.",
    iconName: "GraduationCap",
    href: "/escritorio/manual/capacitacao",
    content: `
# Capacitação

A área de **Capacitação** permite:

- **Planos de Treinamento**: criação e gestão de planos por perfil
- **Registros de Treinamento**: acompanhamento do status de conclusão por usuário

Os líderes podem atribuir planos aos colaboradores e acompanhar o progresso.
    `.trim(),
    steps: [
      "Líder: crie planos de treinamento em Capacitação",
      "Atribua planos aos perfis ou usuários",
      "Usuário: acesse seus treinamentos e marque conclusão",
      "Acompanhe o progresso pelo dashboard",
    ],
  },
  {
    id: "configuracoes",
    resource: "usuarios",
    title: "Configurações",
    shortDescription: "Usuários, perfis, identidade visual e parâmetros do escritório.",
    iconName: "Settings",
    href: "/escritorio/manual/configuracoes",
    content: `
# Configurações

As **Configurações** incluem:

- **Usuários e Perfis**: gestão de usuários e permissões por perfil customizado
- **Identidade Visual**: branding do escritório
- **Configurações Gerais**: preferências e parâmetros do escritório
    `.trim(),
    steps: [
      "Gerencie usuários em Usuários no menu",
      "Crie perfis customizados em Perfis",
      "Personalize identidade em Identidade Visual",
      "Ajuste parâmetros em Configurações",
    ],
  },
];
