import { NextResponse } from "next/server";
import { getProfile } from "@/lib/auth";
import { AIService } from "@/lib/ai/ai-service";

export async function POST(request: Request) {
  try {
    const profile = await getProfile();

    if (!profile.office_id) {
      return NextResponse.json(
        { error: "Usuário não vinculado a um escritório." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { strategicData, interviewAnswers, config } = body as {
      strategicData: {
        swotItems: { type: string; content: string }[];
        strategicObjectives: { id: string; title: string; description: string | null }[];
        officeObjectives: { id: string; title: string; description: string | null; type: string }[];
        portfolioServices: { name: string; description: string | null; demand_level: string | null; capacity_level: string | null }[];
      };
      interviewAnswers: Record<string, string>;
      config: {
        title: string;
        period_start: string;
        period_end: string;
        horizon: string;
      };
    };

    if (!strategicData || !interviewAnswers || !config) {
      return NextResponse.json(
        { error: "Dados estratégicos, respostas da entrevista e configuração são obrigatórios." },
        { status: 400 }
      );
    }

    const swotSummary = buildSwotSummary(strategicData.swotItems);
    const objectivesList = buildObjectivesList(
      strategicData.strategicObjectives,
      strategicData.officeObjectives
    );
    const portfolioSummary = buildPortfolioSummary(strategicData.portfolioServices);
    const interviewSummary = buildInterviewSummary(interviewAnswers);

    const input = `
CONFIGURAÇÃO DO PLANO:
- Título: ${config.title}
- Período: ${config.period_start} a ${config.period_end}
- Horizonte: ${config.horizon}

ANÁLISE SWOT DO ESCRITÓRIO:
${swotSummary}

OBJETIVOS (use estes títulos exatos ao vincular ações):
${objectivesList}

PORTFÓLIO DE SERVIÇOS:
${portfolioSummary}

RESPOSTAS DA ENTREVISTA GUIADA:
${interviewSummary}
`.trim();

    const result = await AIService.generateForPhase({
      phase: "plano_tatico",
      input,
      officeId: profile.office_id,
      userId: profile.id,
    });

    let parsed;
    try {
      const text = result.text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(text);
    } catch {
      return NextResponse.json({
        text: result.text,
        parsed: null,
        interactionId: result.interactionId,
        tokensUsed: result.tokensUsed,
      });
    }

    return NextResponse.json({
      text: result.text,
      parsed,
      interactionId: result.interactionId,
      tokensUsed: result.tokensUsed,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao gerar plano tático.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function buildSwotSummary(items: { type: string; content: string }[]): string {
  const grouped: Record<string, string[]> = {
    strength: [],
    weakness: [],
    opportunity: [],
    threat: [],
  };
  for (const item of items) {
    grouped[item.type]?.push(item.content);
  }

  const labels: Record<string, string> = {
    strength: "Forças",
    weakness: "Fraquezas",
    opportunity: "Oportunidades",
    threat: "Ameaças",
  };

  return Object.entries(grouped)
    .map(([key, list]) => {
      if (list.length === 0) return `${labels[key]}: (nenhum item cadastrado)`;
      return `${labels[key]}:\n${list.map((i) => `  - ${i}`).join("\n")}`;
    })
    .join("\n\n");
}

function buildObjectivesList(
  strategic: { id: string; title: string; description: string | null }[],
  office: { id: string; title: string; description: string | null; type: string }[]
): string {
  const parts: string[] = [];

  if (strategic.length > 0) {
    parts.push("Objetivos Estratégicos:");
    for (const o of strategic) {
      parts.push(`  - ${o.title}${o.description ? ` (${o.description})` : ""}`);
    }
  }

  if (office.length > 0) {
    parts.push("Objetivos do Escritório:");
    for (const o of office) {
      parts.push(`  - [${o.type}] ${o.title}${o.description ? ` (${o.description})` : ""}`);
    }
  }

  return parts.length > 0 ? parts.join("\n") : "(nenhum objetivo cadastrado)";
}

function buildPortfolioSummary(
  services: { name: string; description: string | null; demand_level: string | null; capacity_level: string | null }[]
): string {
  if (services.length === 0) return "(nenhum serviço cadastrado)";
  return services
    .map((s) => {
      const parts = [s.name];
      if (s.description) parts.push(s.description);
      if (s.demand_level) parts.push(`Demanda: ${s.demand_level}`);
      if (s.capacity_level) parts.push(`Capacidade: ${s.capacity_level}`);
      return `  - ${parts.join(" | ")}`;
    })
    .join("\n");
}

function buildInterviewSummary(answers: Record<string, string>): string {
  return Object.entries(answers)
    .filter(([, v]) => v.trim())
    .map(([k, v]) => `${k}:\n  ${v}`)
    .join("\n\n");
}
