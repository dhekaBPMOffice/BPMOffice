import { NextResponse } from "next/server";
import { getProfile } from "@/lib/auth";
import { AIService } from "@/lib/ai/ai-service";
import { createProvider } from "@/lib/ai/providers";
import { OpenAIProvider } from "@/lib/ai/providers";
import { createStrategicPlan } from "@/app/escritorio/estrategia/swot/actions";
import { createSwotItem } from "@/app/escritorio/estrategia/swot/actions";

export const maxDuration = 60;

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_SIZE_MB = 10;

const SWOT_IMAGE_PROMPT = `Esta imagem contém uma matriz SWOT (F.O.F.A. - Forças, Oportunidades, Fraquezas, Ameaças). 
Extraia todos os itens de cada quadrante que aparecer na imagem.
Retorne APENAS um JSON válido, sem texto antes ou depois, sem markdown, com as chaves em inglês minúsculas:
{ "strengths": ["item1", "item2"], "weaknesses": [], "opportunities": [], "threats": [] }
Se um quadrante estiver vazio ou ilegível, use array vazio. Cada item deve ser uma string curta.`;

function parseSwotJson(text: string): {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
 } {
  let raw = text.trim();
  const codeBlock = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) raw = codeBlock[1].trim();
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  return {
    strengths: Array.isArray(parsed.strengths) ? (parsed.strengths as string[]).map((s) => String(s).trim()).filter(Boolean) : [],
    weaknesses: Array.isArray(parsed.weaknesses) ? (parsed.weaknesses as string[]).map((s) => String(s).trim()).filter(Boolean) : [],
    opportunities: Array.isArray(parsed.opportunities) ? (parsed.opportunities as string[]).map((s) => String(s).trim()).filter(Boolean) : [],
    threats: Array.isArray(parsed.threats) ? (parsed.threats as string[]).map((s) => String(s).trim()).filter(Boolean) : [],
  };
}

export async function POST(request: Request) {
  try {
    const profile = await getProfile();
    if (!profile.office_id) {
      return NextResponse.json(
        { error: "Usuário não vinculado a um escritório." },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Envie uma imagem (PNG, JPEG ou WebP)." },
        { status: 400 }
      );
    }

    if (!ACCEPTED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Formato não suportado. Use PNG, JPEG ou WebP." },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return NextResponse.json(
        { error: `Arquivo muito grande. Máximo ${MAX_SIZE_MB} MB.` },
        { status: 400 }
      );
    }

    const config = await AIService.getConfig(profile.office_id);
    if (config.provider !== "openai") {
      return NextResponse.json(
        {
          error:
            "Importação por imagem está disponível apenas com o provedor OpenAI. Configure em Configurações do escritório.",
        },
        { status: 501 }
      );
    }

    if (!config.apiKey?.trim()) {
      return NextResponse.json(
        { error: "Chave de API de IA não configurada." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");
    const dataUrl = `data:${file.type};base64,${base64}`;

    const provider = createProvider(
      config.provider as "openai",
      config.apiKey,
      config.model
    );

    if (!(provider instanceof OpenAIProvider)) {
      return NextResponse.json(
        { error: "Provedor de IA não suporta análise de imagem." },
        { status: 501 }
      );
    }

    const { text } = await provider.generateWithImage(SWOT_IMAGE_PROMPT, dataUrl);

    let swot: ReturnType<typeof parseSwotJson>;
    try {
      swot = parseSwotJson(text);
    } catch {
      return NextResponse.json(
        {
          error:
            "Não foi possível extrair a matriz SWOT da imagem. Tente uma foto mais nítida ou com os quadrantes bem legíveis.",
        },
        { status: 400 }
      );
    }

    const planName = `SWOT importada – ${new Date().toLocaleDateString("pt-BR")}`;
    const year = new Date().getFullYear();
    const planResult = await createStrategicPlan(planName, year);
    if (planResult.error || !planResult.data) {
      return NextResponse.json(
        { error: planResult.error ?? "Erro ao criar plano." },
        { status: 500 }
      );
    }

    const planId = planResult.data.id;

    for (const content of swot.strengths) {
      await createSwotItem("strength", content.slice(0, 500), "escritorio", planId);
    }
    for (const content of swot.weaknesses) {
      await createSwotItem("weakness", content.slice(0, 500), "escritorio", planId);
    }
    for (const content of swot.opportunities) {
      await createSwotItem("opportunity", content.slice(0, 500), "escritorio", planId);
    }
    for (const content of swot.threats) {
      await createSwotItem("threat", content.slice(0, 500), "escritorio", planId);
    }

    return NextResponse.json({
      planId,
      message: "Matriz SWOT importada. Revise os itens e arraste entre quadrantes se necessário.",
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Erro ao importar matriz SWOT.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
