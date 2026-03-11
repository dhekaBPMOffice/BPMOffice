import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const profile = await getProfile();

    if (!profile.office_id) {
      return NextResponse.json(
        { error: "Usuário não vinculado a um escritório." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const interactionId = searchParams.get("interactionId");

    if (!interactionId) {
      return NextResponse.json(
        { error: "Parâmetro 'interactionId' é obrigatório." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data: versions, error } = await supabase
      .from("ai_result_versions")
      .select("id, version_number, content, created_at")
      .eq("interaction_id", interactionId)
      .eq("office_id", profile.office_id)
      .order("version_number", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: `Erro ao listar versões: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      versions: (versions ?? []).map((v) => ({
        id: v.id,
        versionNumber: v.version_number,
        content: v.content,
        createdAt: v.created_at,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao listar versões.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
