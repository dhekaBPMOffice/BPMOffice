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
    if (profile.role !== "leader" || !profile.office_id) {
      return NextResponse.json(
        { error: "Apenas líderes podem enviar ficheiros de processo." },
        { status: 403 }
      );
    }

    let body: {
      officeProcessId?: string;
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

    const officeProcessId = String(body.officeProcessId ?? "").trim();
    const filename = String(body.filename ?? "").trim();
    const kind = parseKind(body.kind);
    const fileSizeBytes = Number(body.fileSizeBytes);

    if (!officeProcessId) {
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
    const { data: officeProcess, error: processError } = await supabase
      .from("office_processes")
      .select("id")
      .eq("id", officeProcessId)
      .eq("office_id", profile.office_id)
      .single();

    if (processError || !officeProcess) {
      return NextResponse.json(
        { error: "Processo do escritório não encontrado." },
        { status: 404 }
      );
    }

    const session = await prepareProcessFileSignedUpload(supabase, {
      scope: { type: "office_attachment", officeProcessId: officeProcess.id },
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
    console.error("[upload-file/prepare] Erro ao preparar upload:", error);
    return NextResponse.json(
      { error: "Erro interno ao preparar o upload. Tente novamente." },
      { status: 500 }
    );
  }
}
