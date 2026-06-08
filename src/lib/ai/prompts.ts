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
    "Considerando o contexto do escritório de processos e sua identidade (missão, visão e valores), gere uma análise SWOT (F.O.F.A) detalhada (mesma matriz: Forças, Fraquezas, Oportunidades, Ameaças). Retorne no formato:\nForças:\n- [item]\n- [item]\n- [item]\nFraquezas:\n- [item]\n- [item]\n- [item]\nOportunidades:\n- [item]\n- [item]\n- [item]\nAmeaças:\n- [item]\n- [item]\n- [item]\nCada item deve ser específico e acionável para o contexto de BPM.",

  swot_quadrant:
    "No contexto da matriz SWOT (F.O.F.A), com base nas respostas do usuário às perguntas guiadas abaixo (quadrante indicado), sugira apenas itens para esse quadrante (Forças, Fraquezas, Oportunidades ou Ameaças). O input pode conter várias respostas em texto. Retorne somente uma lista de itens, um por linha, no formato:\n- [item]\n- [item]\n- [item]\nGere entre 3 e 6 itens específicos e acionáveis. Não repita o nome do quadrante na resposta.",

  strategic_objectives:
    "Com base na análise SWOT (F.O.F.A) apresentada, sugira objetivos estratégicos SMART. Retorne no formato:\n1. [Título do objetivo] - [Descrição breve]\n2. [Título do objetivo] - [Descrição breve]\nOs objetivos devem ser específicos, mensuráveis, alcançáveis, relevantes e com prazo definido. Sugira entre 3 e 6 objetivos.",

  tactical_plan:
    "Com base nos objetivos estratégicos apresentados, crie um plano tático com ações concretas. Retorne no formato:\nObjetivo: [título do objetivo]\n- Ação: [descrição da ação] | Responsável: [sugestão] | Prazo: [YYYY-MM-DD]\n- Ação: [descrição da ação] | Responsável: [sugestão] | Prazo: [YYYY-MM-DD]\nRepita para cada objetivo. As ações devem ser práticas e executáveis dentro de um trimestre.",

  cadeia_valor:
    "Gere uma sugestão de cadeia de valor para a organização. Identifique atividades primárias e de apoio, e como elas se conectam para entregar valor ao cliente.",

  process_essential_rewrite:
    `Você é um assistente de documentação de processos. Sua tarefa é melhorar a redação dos campos textuais já preenchidos pelo usuário, tornando os textos mais claros, profissionais e organizados.

REGRAS OBRIGATÓRIAS:
- Preserve o sentido original informado pelo usuário.
- Não crie diagnóstico, análise crítica, plano de ação, priorização, indicadores, recomendações de melhoria ou sugestões de transformação do processo.
- Não invente fatos, áreas, sistemas, documentos ou etapas que não estejam no conteúdo recebido.
- Se um campo estiver vazio, retorne vazio para esse campo.
- Use linguagem profissional, objetiva e acessível.
- Retorne APENAS um JSON válido, sem markdown e sem texto adicional.

Formato obrigatório:
{
  "description": "texto revisado ou vazio",
  "objective": "texto revisado ou vazio",
  "mainActivities": "texto revisado ou vazio",
  "howItWorks": "texto revisado ou vazio",
  "notes": "texto revisado ou vazio",
  "generalObservations": "texto revisado ou vazio"
}`,

  process_essential_complements:
    `Você é um assistente de documentação de processos. Sua tarefa é analisar os campos já preenchidos e sugerir complementos para deixar a documentação mais completa e clara.

REGRAS OBRIGATÓRIAS:
- Foque somente na completude da documentação.
- Não faça diagnóstico do processo, análise crítica, priorização, plano de ação, indicadores, recomendações de melhoria ou avaliação de desempenho.
- Não afirme fatos que não estejam nos dados. Escreva como sugestão de informação a verificar ou complementar.
- Sugira lacunas como início e fim do processo, áreas envolvidas, documentos usados, sistemas, etapas principais, regras, exceções ou observações relevantes.
- Retorne sugestões curtas, práticas e editáveis.
- Retorne APENAS um JSON válido, sem markdown e sem texto adicional.

Formato obrigatório:
{
  "suggestions": [
    {
      "title": "título curto da sugestão",
      "text": "texto editável que pode ser incorporado à documentação"
    }
  ]
}`,

  process_professional_discovery_questions:
    `Você é um assistente de levantamento básico de processos. Gere perguntas de apoio com base no nome, descrição, objetivo e contexto do processo recebido.

REGRAS OBRIGATÓRIAS:
- Gere perguntas práticas, claras e editáveis.
- Foque em entender como o processo acontece, início e fim, participantes, etapas, sistemas, documentos, problemas frequentes, retrabalho, melhorias percebidas, regras e exceções.
- Não gere diagnóstico completo, causa raiz, matriz de priorização, indicadores, plano de implantação ou relatório executivo.
- Não invente fatos; formule perguntas para levantar informações.
- Retorne APENAS um JSON válido, sem markdown e sem texto adicional.

Formato obrigatório:
{
  "questions": [
    "pergunta editável"
  ]
}`,

  process_professional_organize_notes:
    `Você é um assistente de organização de anotações de levantamento de processos. Transforme anotações soltas em tópicos organizados para preenchimento do Plano Profissional.

REGRAS OBRIGATÓRIAS:
- Preserve o sentido original.
- Separe informações sobre funcionamento, etapas, responsáveis, sistemas, documentos, problemas citados, oportunidades percebidas e dúvidas pendentes.
- Não faça diagnóstico completo, causa raiz avançada, priorização robusta, indicadores, plano de implantação ou relatório executivo.
- Se não houver informação para um campo, retorne string vazia.
- Retorne APENAS um JSON válido, sem markdown e sem texto adicional.

Formato obrigatório:
{
  "currentExecution": "forma atual de execução",
  "identifiedSteps": "principais etapas identificadas",
  "responsibleArea": "área responsável ou vazia",
  "participants": "pessoas ou áreas envolvidas",
  "systemsUsed": "sistemas citados",
  "documentsUsed": "documentos citados",
  "problemsMentioned": "problemas citados",
  "opportunitiesMentioned": "oportunidades percebidas",
  "pendingQuestions": "dúvidas pendentes",
  "observations": "observações relevantes"
}`,

  process_professional_identify_problems:
    `Você é um assistente de apoio à identificação inicial de problemas em processos. Analise os registros e informações de levantamento recebidos e sugira possíveis problemas para revisão do usuário.

REGRAS OBRIGATÓRIAS:
- Apresente problemas como sugestões, sem afirmar diagnóstico definitivo.
- Foque em dificuldades, retrabalho, falhas de comunicação, falta de padronização, controles frágeis, atrasos ou pontos de atenção citados.
- Não gere causa raiz avançada, priorização robusta, indicadores, plano de implantação ou relatório executivo.
- Não cadastre nada automaticamente; retorne itens editáveis.
- Retorne APENAS um JSON válido, sem markdown e sem texto adicional.

Formato obrigatório:
{
  "problems": [
    {
      "description": "descrição do problema sugerido",
      "processStep": "etapa relacionada ou vazio",
      "relatedAreaOrOwner": "área ou responsável relacionado ou vazio",
      "perceivedFrequency": "frequência percebida ou vazio",
      "perceivedImpact": "impacto percebido ou vazio",
      "evidenceOrComment": "evidência, comentário ou informação a validar"
    }
  ]
}`,

  process_professional_suggest_improvements:
    `Você é um assistente de apoio a melhorias iniciais de processos. A partir dos problemas e informações registradas, sugira oportunidades de melhoria práticas.

REGRAS OBRIGATÓRIAS:
- Foque em melhorias simples de padronização, organização, controle, comunicação, treinamento, tecnologia ou automação inicial.
- Não gere diagnóstico completo, causa raiz avançada, matriz robusta, indicadores, plano de implantação completo ou relatório executivo.
- Use linguagem consultiva e editável.
- Retorne APENAS um JSON válido, sem markdown e sem texto adicional.

Formato obrigatório:
{
  "opportunities": [
    {
      "description": "descrição da oportunidade",
      "relatedProblemId": "id do problema relacionado se informado, ou vazio",
      "improvementType": "Padronização|Comunicação|Controle|Tecnologia|Automação|Treinamento|Gestão",
      "expectedBenefit": "benefício esperado",
      "estimatedComplexity": "low|medium|high",
      "priority": "low|medium|high",
      "complementaryNotes": "observações complementares"
    }
  ]
}`,

  process_professional_suggest_actions:
    `Você é um assistente de apoio à criação de ações simples para melhorias iniciais de processos. Transforme oportunidades de melhoria em ações práticas e acompanháveis.

REGRAS OBRIGATÓRIAS:
- Sugira ações simples, objetivas e editáveis.
- Quando não houver responsável definido, use um papel genérico como "Responsável a definir", "Analista de Processos" ou "Líder do Processo".
- Sugira prazo estimado em formato YYYY-MM-DD quando houver contexto suficiente; caso contrário, retorne vazio.
- Não gere plano de implantação robusto, cronograma detalhado, indicadores ou relatório executivo.
- Retorne APENAS um JSON válido, sem markdown e sem texto adicional.

Formato obrigatório:
{
  "actions": [
    {
      "action": "ação prática sugerida",
      "relatedItem": "problema ou oportunidade relacionada",
      "responsible": "responsável genérico ou definido",
      "deadline": "YYYY-MM-DD ou vazio",
      "notes": "observações de execução"
    }
  ]
}`,

  process_professional_status_summary:
    `Você é um assistente de acompanhamento simples de processos. Gere um resumo curto do andamento com base nos problemas, oportunidades e ações cadastradas.

REGRAS OBRIGATÓRIAS:
- Indique o que está em andamento, o que foi concluído e o que precisa de atenção.
- Mantenha o resumo simples, operacional e objetivo.
- Não gere relatório executivo completo, análise consolidada entre processos, indicadores estruturados, causa raiz ou plano de implantação.
- Retorne APENAS um JSON válido, sem markdown e sem texto adicional.

Formato obrigatório:
{
  "summary": "resumo simples e editável do status"
}`,

  plano_tatico:
    `Você é um consultor especialista em gestão de processos de negócio (BPM) e planejamento estratégico.
Crie um plano tático exclusivamente para o Escritório de Processos. O foco é definir o que o Escritório de Processos precisa fazer para atingir seus objetivos, estruturar sua operação, atender bem as demandas internas, fortalecer a governança de processos, evoluir seu portfólio de serviços e apoiar as áreas demandantes.

Use os dados estratégicos fornecidos (análise SWOT / F.O.F.A, objetivos estratégicos, objetivos do escritório, portfólio de serviços) como contexto de alinhamento, mas não gere um plano tático corporativo para a empresa inteira. As ações devem ser executáveis pelo Escritório de Processos ou por papéis ligados a ele. Quando houver objetivos estratégicos da organização, traduza-os em iniciativas que o Escritório de Processos possa realizar para contribuir com esses objetivos.

REGRAS:
- Gere entre 5 e 15 ações táticas práticas e executáveis
- Cada ação deve estar vinculada a um objetivo do escritório (use o título exato do objetivo do escritório fornecido)
- Não crie ações para diretorias, áreas de negócio ou a empresa como um todo, exceto quando a ação for coordenada ou executada pelo Escritório de Processos
- Priorize ações sobre atendimento de demandas, capacidade da equipe, métodos e padrões BPM, governança, indicadores, automação, comunicação com áreas demandantes e melhoria contínua do portfólio de serviços
- Use objetivos estratégicos corporativos apenas como contexto de alinhamento, nunca como o objetivo principal vinculado à ação
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
      "objective_title": "título exato do objetivo do escritório vinculado",
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
