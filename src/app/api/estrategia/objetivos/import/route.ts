import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import {
  extractTextFromDocument,
  parseObjectivesFromText,
  isAcceptedFilename,
} from "@/lib/estrategia/extract-objectives";

// Garante que esta rota use o runtime Node.js (necessário para Buffer, mammoth, etc.)
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
      return NextResponse.json({
        error: "Formato não suportado. Use arquivos .txt, .docx, .xlsx ou .xls.",
      }, { status: 400 });
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
    let firstInsertError: { message: string; code?: string } | null = null;
    let fallbackError: { message: string; code?: string } | null = null;
    const payloadWithOrigin: Record<string, unknown> = {
      office_id: profile.office_id,
      description: null,
      swot_item_id: null,
      origin: "imported",
      source_file: file.name,
    };

    for (const title of titles) {
      const payload = {
        ...payloadWithOrigin,
        title: title.slice(0, 500),
      };
      const { data, error } = await supabase
        .from("strategic_objectives")
        .insert(payload)
        .select("id, title")
        .single();
      if (!error && data) {
        inserted.push({ id: data.id, title: data.title });
      } else if (error && !firstInsertError) {
        firstInsertError = { message: error.message, code: error.code };
      }
    }

    if (inserted.length === 0 && titles.length > 0) {
      for (const title of titles) {
        const payload = {
          office_id: profile.office_id,
          title: title.slice(0, 500),
          description: null,
          swot_item_id: null,
        };
        const { data, error } = await supabase
          .from("strategic_objectives")
          .insert(payload)
          .select("id, title")
          .single();
        if (!error && data) {
          inserted.push({ id: data.id, title: data.title });
        } else if (error && !fallbackError) {
          fallbackError = { message: error.message, code: error.code };
        }
      }
    }

    if (inserted.length === 0 && titles.length > 0) {
      return NextResponse.json(
        {
          error:
            "Os objetivos foram identificados no arquivo, mas não foi possível salvá-los. Verifique se a migration do banco (012_strategic_objectives_origin) foi aplicada no Supabase.",
          detail: firstInsertError?.message ?? fallbackError?.message,
        },
        { status: 500 }
      );
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
