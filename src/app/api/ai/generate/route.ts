import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
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
    const { phase, input, projectId } = body as {
      phase?: string;
      input?: string;
      projectId?: string;
    };

    if (!phase || typeof phase !== "string") {
      return NextResponse.json(
        { error: "Campo 'phase' é obrigatório." },
        { status: 400 }
      );
    }

    if (!input || typeof input !== "string") {
      return NextResponse.json(
        { error: "Campo 'input' é obrigatório." },
        { status: 400 }
      );
    }

    const result = await AIService.generateForPhase({
      phase,
      input,
      projectId: projectId || undefined,
      officeId: profile.office_id,
      userId: profile.id,
    });

    return NextResponse.json({
      text: result.text,
      interactionId: result.interactionId,
      tokensUsed: result.tokensUsed,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao gerar conteúdo com IA.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
