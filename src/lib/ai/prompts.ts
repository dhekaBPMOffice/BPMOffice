/**
 * Prompts padrão para cada fase BPM.
 * Usados quando não há prompt customizado na configuração.
 */

export const DEFAULT_PROMPTS: Record<string, string> = {
  levantamento:
    "Organize os dados de levantamento a seguir e gere elementos para modelagem de processos. Estruture as informações de forma clara, identifique atores, atividades, fluxos e pontos de atenção para a modelagem BPM.",

  modelagem:
    "Com base no arquivo BPMN/descritivo a seguir, gere um descritivo detalhado do processo e procedimentos operacionais padrão (POP). Inclua: objetivo do processo, escopo, atores envolvidos, fluxo passo a passo e regras de negócio.",

  analise:
    "Analise o processo a seguir e identifique pontos fortes, pontos fracos, e determine o nível de criticidade. Sugira técnicas de análise adequadas e apresente recomendações iniciais.",

  melhorias:
    "Com base na análise do processo, sugira melhorias, priorize-as e crie um roadmap de implementação. Considere custo-benefício, impacto e esforço de implementação.",

  implantacao:
    "Auxilie no preenchimento do plano de implantação para o processo. Inclua cronograma, responsáveis, recursos necessários, riscos e plano de comunicação.",

  encerramento:
    "Gere uma apresentação de encerramento do projeto BPM. Inclua: resumo executivo, objetivos alcançados, entregas realizadas, lições aprendidas e próximos passos.",

  strategic_identity:
    "Com base no nome e contexto do escritório de processos, sugira uma missão, visão e valores organizacionais. Retorne no formato:\nMissão: [texto]\nVisão: [texto]\nValores: [valor1], [valor2], [valor3], [valor4], [valor5]\nAs sugestões devem ser inspiradoras, concisas e alinhadas ao contexto de gestão de processos de negócio (BPM).",

  swot:
    "Considerando o contexto do escritório de processos e sua identidade (missão, visão e valores), gere uma análise SWOT detalhada. Retorne no formato:\nForças:\n- [item]\n- [item]\n- [item]\nFraquezas:\n- [item]\n- [item]\n- [item]\nOportunidades:\n- [item]\n- [item]\n- [item]\nAmeaças:\n- [item]\n- [item]\n- [item]\nCada item deve ser específico e acionável para o contexto de BPM.",

  swot_quadrant:
    "Com base nas respostas do usuário às perguntas guiadas abaixo (contexto do quadrante indicado), sugira apenas itens para esse quadrante (Forças, Fraquezas, Oportunidades ou Ameaças). O input pode conter várias respostas em texto. Retorne somente uma lista de itens, um por linha, no formato:\n- [item]\n- [item]\n- [item]\nGere entre 3 e 6 itens específicos e acionáveis. Não repita o nome do quadrante na resposta.",

  strategic_objectives:
    "Com base na análise SWOT apresentada, sugira objetivos estratégicos SMART. Retorne no formato:\n1. [Título do objetivo] - [Descrição breve]\n2. [Título do objetivo] - [Descrição breve]\nOs objetivos devem ser específicos, mensuráveis, alcançáveis, relevantes e com prazo definido. Sugira entre 3 e 6 objetivos.",

  tactical_plan:
    "Com base nos objetivos estratégicos apresentados, crie um plano tático com ações concretas. Retorne no formato:\nObjetivo: [título do objetivo]\n- Ação: [descrição da ação] | Responsável: [sugestão] | Prazo: [YYYY-MM-DD]\n- Ação: [descrição da ação] | Responsável: [sugestão] | Prazo: [YYYY-MM-DD]\nRepita para cada objetivo. As ações devem ser práticas e executáveis dentro de um trimestre.",

  cadeia_valor:
    "Gere uma sugestão de cadeia de valor para a organização. Identifique atividades primárias e de apoio, e como elas se conectam para entregar valor ao cliente.",

  plano_tatico:
    `Você é um consultor especialista em gestão de processos de negócio (BPM) e planejamento estratégico.
Com base nos dados estratégicos fornecidos (SWOT, objetivos estratégicos, objetivos do escritório, portfólio de serviços) e nas respostas do usuário à entrevista guiada, crie um plano tático detalhado com ações concretas.

REGRAS:
- Gere entre 5 e 15 ações táticas práticas e executáveis
- Cada ação deve estar vinculada a um objetivo (use o título exato do objetivo fornecido)
- Prioridades: "alta", "media" ou "baixa"
- Categorias: "processos", "pessoas", "tecnologia", "governanca", "capacitacao" ou "outro"
- Prazos devem respeitar o período informado pelo usuário (formato YYYY-MM-DD)
- KPIs devem ser mensuráveis e específicos
- Responsáveis devem ser cargos/papéis genéricos (ex: "Analista de Processos", "Líder do Escritório")

Retorne APENAS um JSON válido no seguinte formato (sem markdown, sem texto adicional):
{
  "actions": [
    {
      "action": "título da ação",
      "description": "descrição breve e objetiva",
      "objective_title": "título exato do objetivo vinculado",
      "responsible": "cargo/papel responsável",
      "deadline": "YYYY-MM-DD",
      "priority": "alta|media|baixa",
      "kpi": "indicador de sucesso mensurável",
      "category": "processos|pessoas|tecnologia|governanca|capacitacao|outro"
    }
  ]
}`,
};

export function getDefaultPrompt(phase: string): string {
  return DEFAULT_PROMPTS[phase] ?? "Gere uma resposta estruturada e relevante para o contexto fornecido.";
}
