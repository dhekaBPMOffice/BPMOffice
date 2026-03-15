/**
 * Configuração do Manual de Uso para admin_master
 *
 * CONVENÇÃO: Ao adicionar nova feature na área admin, inclua entrada em ADMIN_MANUAL_MODULES
 * e, se fizer parte do onboarding, adicione passo em ADMIN_FIRST_STEPS.
 */

import type { FirstStep, ManualModule } from "./config";

export const ADMIN_FIRST_STEPS: FirstStep[] = [
  {
    step: 1,
    title: "Cadastrar Escritórios",
    description: "Crie e gerencie escritórios de processos.",
    moduleId: "escritorios",
    href: "/admin/escritorios",
    iconName: "Building2",
  },
  {
    step: 2,
    title: "Configurar Planos",
    description: "Defina planos de assinatura e limites.",
    moduleId: "planos",
    href: "/admin/planos",
    iconName: "CreditCard",
  },
  {
    step: 3,
    title: "Configurar Frameworks",
    description: "Ative frameworks de processos por escritório.",
    moduleId: "frameworks",
    href: "/admin/frameworks",
    iconName: "Network",
  },
  {
    step: 4,
    title: "Cadastrar Processos Base",
    description: "Mantenha o catálogo de processos da plataforma.",
    moduleId: "processos",
    href: "/admin/processos",
    iconName: "ClipboardList",
  },
  {
    step: 5,
    title: "Criar Formulários",
    description: "Modelos de formulários vinculados a processos.",
    moduleId: "formularios",
    href: "/admin/formularios",
    iconName: "BookOpen",
  },
  {
    step: 6,
    title: "Questionário de Processos",
    description: "Configure o questionário de onboarding dos escritórios.",
    moduleId: "questionario-processos",
    href: "/admin/questionario-processos",
    iconName: "ListChecks",
  },
  {
    step: 7,
    title: "Objetivos Escritório",
    description: "Catálogo de objetivos estratégicos para escritórios.",
    moduleId: "objetivos-escritorio",
    href: "/admin/objetivos-escritorio",
    iconName: "Target",
  },
  {
    step: 8,
    title: "Configurar IA",
    description: "Parâmetros de modelos e prompts da IA.",
    moduleId: "ia",
    href: "/admin/ia",
    iconName: "Bot",
  },
  {
    step: 9,
    title: "Identidade Visual Padrão",
    description: "Branding padrão da plataforma.",
    moduleId: "branding",
    href: "/admin/branding",
    iconName: "Palette",
  },
  {
    step: 10,
    title: "Configurações",
    description: "Parâmetros gerais da administração.",
    moduleId: "configuracoes",
    href: "/admin/configuracoes",
    iconName: "Settings",
  },
];

export const ADMIN_MANUAL_MODULES: ManualModule[] = [
  {
    id: "introducao",
    resource: null,
    title: "Introdução",
    shortDescription: "Manual do administrador master. Configuração global da plataforma.",
    iconName: "BookOpen",
    href: "/admin/manual/introducao",
    content: `
# Manual do Administrador

Este manual descreve as funcionalidades da **área de administração master** da plataforma BPM Office.

O **admin_master** configura elementos globais que afetam todos os escritórios: planos, processos base, frameworks, formulários, identidade visual padrão e configuração de IA.
    `.trim(),
  },
  {
    id: "escritorios",
    resource: null,
    title: "Escritórios",
    shortDescription: "Cadastro e gestão de escritórios de processos.",
    iconName: "Building2",
    href: "/admin/manual/escritorios",
    content: `
# Escritórios

A área de **Escritórios** permite:

- **Cadastrar** novos escritórios
- **Vincular** planos e configurações a cada escritório
- **Acompanhar** o status e uso de cada escritório

Cada escritório possui sua própria área (líder e usuários) acessível após login.
    `.trim(),
    steps: [
      "Acesse Escritórios no menu",
      "Clique em Novo Escritório para cadastrar",
      "Defina o plano e parâmetros iniciais",
      "Gerencie usuários líderes no detalhe do escritório",
    ],
  },
  {
    id: "planos",
    resource: null,
    title: "Planos",
    shortDescription: "Planos de assinatura, limites e preços.",
    iconName: "CreditCard",
    href: "/admin/manual/planos",
    content: `
# Planos

Os **Planos** definem os limites e funcionalidades disponíveis para cada escritório:

- Limite de usuários
- Recursos habilitados
- Preços e ciclos de faturamento

Cada escritório é vinculado a um plano ativo.
    `.trim(),
    steps: [
      "Acesse Planos no menu",
      "Crie ou edite planos conforme o modelo de negócio",
      "Vincule escritórios aos planos adequados",
    ],
  },
  {
    id: "branding",
    resource: null,
    title: "Identidade Visual",
    shortDescription: "Logo e cores padrão da plataforma.",
    iconName: "Palette",
    href: "/admin/manual/branding",
    content: `
# Identidade Visual Padrão

A **Identidade Visual** define o branding padrão exibido quando um escritório não possui identidade própria:

- Logo da plataforma
- Cores principais
- Configurações de tema

Cada escritório pode sobrescrever com sua identidade.
    `.trim(),
    steps: [
      "Acesse Identidade Visual no menu",
      "Faça upload da logo padrão",
      "Ajuste cores e parâmetros visuais",
    ],
  },
  {
    id: "ia",
    resource: null,
    title: "Configuração IA",
    shortDescription: "Modelos, prompts e parâmetros de IA.",
    iconName: "Bot",
    href: "/admin/manual/ia",
    content: `
# Configuração IA

A área de **Configuração IA** permite:

- Definir provedores e modelos disponíveis
- Configurar chaves de API
- Personalizar prompts padrão

As funcionalidades de IA (SWOT, planos táticos, objetivos etc.) usam essas configurações.
    `.trim(),
    steps: [
      "Acesse Configuração IA no menu",
      "Configure provedores e modelos",
      "Ajuste prompts conforme necessário",
    ],
  },
  {
    id: "frameworks",
    resource: null,
    title: "Frameworks",
    shortDescription: "Frameworks de processos ativos por escritório.",
    iconName: "Network",
    href: "/admin/manual/frameworks",
    content: `
# Frameworks

Os **Frameworks** são modelos de cadeia de valor e processos que podem ser ativados por escritório:

- Estrutura de processos por camada (Gestão, Negócio, Apoio)
- Configuração de quais frameworks cada escritório usa

Líderes utilizam os frameworks ativos para configurar a cadeia de valor.
    `.trim(),
    steps: [
      "Acesse Frameworks no menu",
      "Crie ou edite frameworks disponíveis",
      "Gerencie ativação por escritório",
    ],
  },
  {
    id: "servicos",
    resource: null,
    title: "Serviços Base",
    shortDescription: "Catálogo de serviços da plataforma.",
    iconName: "FileText",
    href: "/admin/manual/servicos",
    content: `
# Serviços Base

Os **Serviços Base** compõem o catálogo de serviços disponível na plataforma:

- Descrição de cada serviço
- Vinculação a processos

Usados no portfólio de serviços dos escritórios.
    `.trim(),
    steps: [
      "Acesse Serviços Base no menu",
      "Cadastre ou edite serviços",
      "Vincule a processos quando aplicável",
    ],
  },
  {
    id: "processos",
    resource: null,
    title: "Processos",
    shortDescription: "Catálogo base de processos da plataforma.",
    iconName: "ClipboardList",
    href: "/admin/manual/processos",
    content: `
# Processos Base

A área de **Processos** mantém o catálogo global de processos:

- Cada processo pode ser adicionado aos escritórios via onboarding ou catálogo
- Processos podem ter formulários e arquivos vinculados

Este é o repositório central que alimenta os escritórios.
    `.trim(),
    steps: [
      "Acesse Processos no menu",
      "Cadastre ou importe processos base",
      "Configure formulários e anexos por processo",
    ],
  },
  {
    id: "formularios",
    resource: null,
    title: "Formulários",
    shortDescription: "Modelos de formulários vinculados a processos.",
    iconName: "BookOpen",
    href: "/admin/manual/formularios",
    content: `
# Formulários

Os **Formulários** são modelos reutilizáveis vinculados a processos:

- Campos customizáveis
- Tipos de questão (texto, seleção, data, etc.)
- Uso em demandas e processos

Cada processo pode ter formulários associados.
    `.trim(),
    steps: [
      "Acesse Formulários no menu",
      "Crie formulários com campos necessários",
      "Vincule formulários aos processos",
    ],
  },
  {
    id: "questionario-processos",
    resource: null,
    title: "Questionário de Processos",
    shortDescription: "Questionário de onboarding para definir processos do escritório.",
    iconName: "ListChecks",
    href: "/admin/manual/questionario-processos",
    content: `
# Questionário de Processos

O **Questionário de Processos** é o formulário que líderes preenchem no onboarding:

- Define quais processos são relevantes para o escritório
- Um questionário pode ser marcado como "formulário de ativação" para onboarding
- Questões e opções são configuráveis

É o ponto de partida para a lista oficial de processos de cada escritório.
    `.trim(),
    steps: [
      "Acesse Questionário Processos no menu",
      "Crie ou edite questionários",
      "Marque um como formulário de ativação para onboarding",
    ],
  },
  {
    id: "objetivos-escritorio",
    resource: null,
    title: "Objetivos Escritório",
    shortDescription: "Catálogo de objetivos estratégicos para escritórios.",
    iconName: "Target",
    href: "/admin/manual/objetivos-escritorio",
    content: `
# Objetivos Escritório

Os **Objetivos Escritório** são o catálogo de objetivos estratégicos disponíveis:

- Escritórios podem importar ou vincular aos objetivos do catálogo
- Suporta objetivos primários e secundários

Usados na área de planejamento estratégico dos líderes.
    `.trim(),
    steps: [
      "Acesse Objetivos Escritório no menu",
      "Cadastre objetivos no catálogo",
      "Escritórios importam ou vinculam conforme necessidade",
    ],
  },
  {
    id: "notificacoes",
    resource: null,
    title: "Notificações",
    shortDescription: "Gestão de notificações da plataforma.",
    iconName: "Bell",
    href: "/admin/manual/notificacoes",
    content: `
# Notificações

A área de **Notificações** permite:

- Visualizar e gerenciar notificações da plataforma
- Configurar regras de envio
- Histórico e status

Notificações podem ser por e-mail, in-app ou outros canais conforme configuração.
    `.trim(),
    steps: [
      "Acesse Notificações no menu",
      "Revise notificações enviadas",
      "Ajuste configurações de envio se necessário",
    ],
  },
  {
    id: "chamados",
    resource: null,
    title: "Chamados",
    shortDescription: "Suporte e chamados de escritórios.",
    iconName: "LifeBuoy",
    href: "/admin/manual/chamados",
    content: `
# Chamados

A área de **Chamados** concentra solicitações de suporte:

- Chamados abertos por escritórios
- Status e acompanhamento
- Respostas e histórico

Centralize o suporte e reduza a necessidade de contato direto.
    `.trim(),
    steps: [
      "Acesse Chamados no menu",
      "Visualize chamados abertos e em andamento",
      "Responda e atualize status",
    ],
  },
  {
    id: "backup",
    resource: null,
    title: "Backup",
    shortDescription: "Backups automáticos e manuais da plataforma.",
    iconName: "DatabaseBackup",
    href: "/admin/manual/backup",
    content: `
# Backup

A área de **Backup** permite:

- **Backup Manual**: gerar backup sob demanda
- **Backups Automáticos**: histórico e agendamento
- Download de arquivos de backup

Mantém a integridade e recuperação dos dados.
    `.trim(),
    steps: [
      "Acesse Backup no menu",
      "Execute backup manual quando necessário",
      "Revise backups automáticos e agendamentos",
    ],
  },
  {
    id: "configuracoes",
    resource: null,
    title: "Configurações",
    shortDescription: "Parâmetros gerais da administração.",
    iconName: "Settings",
    href: "/admin/manual/configuracoes",
    content: `
# Configurações

As **Configurações** da área admin incluem:

- Parâmetros gerais da plataforma
- Preferências de sistema
- Integrações e conectores

Ajuste conforme a necessidade operacional.
    `.trim(),
    steps: [
      "Acesse Configurações no menu",
      "Revise e ajuste parâmetros",
      "Salve alterações",
    ],
  },
];
