import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";

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
    const { interactionId, content } = body as {
      interactionId?: string;
      content?: string;
    };

    if (!interactionId || typeof interactionId !== "string") {
      return NextResponse.json(
        { error: "Campo 'interactionId' é obrigatório." },
        { status: 400 }
      );
    }

    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "Campo 'content' é obrigatório." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Verificar que a interação pertence ao escritório do usuário
    const { data: interaction } = await supabase
      .from("ai_interactions")
      .select("id, office_id")
      .eq("id", interactionId)
      .eq("office_id", profile.office_id)
      .single();

    if (!interaction) {
      return NextResponse.json(
        { error: "Interação não encontrada ou sem permissão." },
        { status: 404 }
      );
    }

    // Obter próximo número de versão
    const { count } = await supabase
      .from("ai_result_versions")
      .select("id", { count: "exact", head: true })
      .eq("interaction_id", interactionId);

    const versionNumber = (count ?? 0) + 1;

    const { data: version, error } = await supabase
      .from("ai_result_versions")
      .insert({
        interaction_id: interactionId,
        office_id: profile.office_id,
        version_number: versionNumber,
        content,
        edited_by: profile.id,
      })
      .select("id, version_number, created_at")
      .single();

    if (error) {
      return NextResponse.json(
        { error: `Erro ao salvar versão: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: version.id,
      versionNumber: version.version_number,
      createdAt: version.created_at,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao salvar versão.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
