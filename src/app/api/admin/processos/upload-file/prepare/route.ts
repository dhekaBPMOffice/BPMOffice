import { NextResponse } from "next/server";
import { getProfile } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import {
  prepareProcessFileSignedUpload,
  type ProcessFileKind,
} from "@/lib/process-file-upload";

function parseKind(value: unknown): ProcessFileKind | null {
  if (value === "template" || value === "flowchart" || value === "attachment") {
    return value;
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const profile = await getProfile();
    if (profile.role !== "admin_master") {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    let body: {
      baseProcessId?: string;
      filename?: string;
      kind?: string;
      fileSizeBytes?: number;
      contentType?: string;
    };

    try {
      body = (await request.json()) as typeof body;
    } catch {
      return NextResponse.json({ error: "Corpo do pedido inválido." }, { status: 400 });
    }

    const baseProcessId = String(body.baseProcessId ?? "").trim();
    const filename = String(body.filename ?? "").trim();
    const kind = parseKind(body.kind);
    const fileSizeBytes = Number(body.fileSizeBytes);

    if (!baseProcessId) {
      return NextResponse.json(
        { error: "ID do processo é obrigatório." },
        { status: 400 }
      );
    }

    if (!kind) {
      return NextResponse.json(
        { error: "Tipo de ficheiro inválido (template, flowchart ou attachment)." },
        { status: 400 }
      );
    }

    if (!filename) {
      return NextResponse.json({ error: "Nome do ficheiro é obrigatório." }, { status: 400 });
    }

    if (!Number.isFinite(fileSizeBytes) || fileSizeBytes <= 0) {
      return NextResponse.json({ error: "Tamanho do ficheiro inválido." }, { status: 400 });
    }

    const supabase = await createServiceClient();
    const { data: baseProcess, error: processError } = await supabase
      .from("base_processes")
      .select("id")
      .eq("id", baseProcessId)
      .maybeSingle();

    if (processError || !baseProcess) {
      return NextResponse.json(
        { error: "Processo do catálogo não encontrado." },
        { status: 404 }
      );
    }

    const session = await prepareProcessFileSignedUpload(supabase, {
      scope: { type: "base_process", baseProcessId },
      filename,
      kind,
      fileSizeBytes,
      contentType: body.contentType,
    });

    if ("error" in session) {
      return NextResponse.json({ error: session.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      path: session.path,
      token: session.token,
      publicUrl: session.publicUrl,
      contentType: session.contentType,
      filename: session.filename,
    });
  } catch (error) {
    console.error("[admin/upload-file/prepare] Erro ao preparar upload:", error);
    return NextResponse.json(
      { error: "Erro interno ao preparar o upload. Tente novamente." },
      { status: 500 }
    );
  }
}
