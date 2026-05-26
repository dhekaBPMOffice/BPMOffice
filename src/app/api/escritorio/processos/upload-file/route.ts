import { NextResponse } from "next/server";
import { getProfile } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import {
  MAX_FILE_SIZE_BYTES,
  uploadProcessFile,
  type ProcessFileKind,
} from "@/lib/process-file-upload";

export const maxDuration = 60;

function parseKind(value: FormDataEntryValue | null): ProcessFileKind | null {
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

    const formData = await request.formData();
    const officeProcessId = String(formData.get("officeProcessId") ?? "").trim();
    const kind = parseKind(formData.get("kind"));
    const file = formData.get("file");

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

    if (!file || !(file instanceof File) || !file.size) {
      return NextResponse.json({ error: "Selecione um ficheiro." }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        {
          error: `Arquivo muito grande. Máximo: ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB`,
        },
        { status: 413 }
      );
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

    const result = await uploadProcessFile(
      supabase,
      file,
      {
        type: "office_attachment",
        officeProcessId: officeProcess.id,
      },
      kind
    );

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      url: result.url,
      filename: result.filename,
    });
  } catch (error) {
    console.error("[upload-file] Erro ao enviar ficheiro de processo:", error);
    return NextResponse.json(
      { error: "Erro interno ao enviar o ficheiro. Tente novamente." },
      { status: 500 }
    );
  }
}
