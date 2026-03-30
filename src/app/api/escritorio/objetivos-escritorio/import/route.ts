import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import {
  extractTextFromDocument,
  parseObjectivesFromText,
  isAcceptedFilename,
} from "@/lib/estrategia/extract-objectives";

export const runtime = "nodejs";
export const maxDuration = 60;

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
        { error: "Envie um arquivo TXT, DOCX ou planilha Excel (.xlsx, .xls)." },
        { status: 400 }
      );
    }

    if (!isAcceptedFilename(file.name)) {
      return NextResponse.json(
        {
          error: "Formato não suportado. Use arquivos .txt, .docx, .xlsx ou .xls.",
        },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || "";
    const text = await extractTextFromDocument(buffer, mimeType, file.name);
    const titles = parseObjectivesFromText(text);

    if (titles.length === 0) {
      return NextResponse.json(
        { error: "Nenhum objetivo foi identificado no documento." },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const inserted: { id: string; title: string }[] = [];
    let sortOrder = 0;

    for (const title of titles) {
      const { data, error } = await supabase
        .from("office_objectives")
        .insert({
          office_id: profile.office_id,
          base_objective_id: null,
          parent_objective_id: null,
          title: title.slice(0, 500),
          description: null,
          type: "primary",
          sort_order: sortOrder++,
          origin: "imported",
          source_file: file.name,
        })
        .select("id, title")
        .single();

      if (!error && data) {
        inserted.push({ id: data.id, title: data.title });
      }
    }

    return NextResponse.json({
      count: inserted.length,
      objectives: inserted,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Erro ao importar objetivos.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
