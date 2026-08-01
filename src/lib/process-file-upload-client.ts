"use client";

import { createClient } from "@/lib/supabase/client";
import {
  MAX_FILE_SIZE_BYTES,
  PROCESS_FILES_BUCKET,
  type ProcessFileKind,
} from "@/lib/process-file-upload-constants";

export type { ProcessFileKind } from "@/lib/process-file-upload-constants";

export type ProcessFileUploadClientResult =
  | { success: true; url: string; filename: string }
  | { error: string };

export type ProcessFileSignedUploadSessionPayload = {
  path: string;
  token: string;
  publicUrl: string;
  contentType: string;
  filename: string;
};

export function validateProcessFileSize(file: File): string | null {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `Arquivo muito grande. Máximo: ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB`;
  }
  if (file.size <= 0) {
    return "Arquivo inválido ou vazio.";
  }
  return null;
}

/**
 * Envia o ficheiro diretamente ao Supabase Storage (evita limite ~4,5 MB de corpo na Vercel).
 */
export async function uploadProcessFileToSignedSession(input: {
  file: File;
  session: ProcessFileSignedUploadSessionPayload;
}): Promise<ProcessFileUploadClientResult> {
  const sizeError = validateProcessFileSize(input.file);
  if (sizeError) return { error: sizeError };

  try {
    const supabase = createClient();
    const { error } = await supabase.storage
      .from(PROCESS_FILES_BUCKET)
      .uploadToSignedUrl(input.session.path, input.session.token, input.file, {
        contentType: input.session.contentType || input.file.type || "application/octet-stream",
        upsert: false,
      });

    if (error) {
      return { error: error.message };
    }

    return {
      success: true,
      url: input.session.publicUrl,
      filename: input.session.filename || input.file.name,
    };
  } catch {
    return {
      error: "Falha de rede ao enviar o ficheiro. Verifique a ligação e tente novamente.",
    };
  }
}

export async function uploadOfficeProcessFileDirect(input: {
  officeProcessId: string;
  kind: ProcessFileKind;
  file: File;
}): Promise<ProcessFileUploadClientResult> {
  const sizeError = validateProcessFileSize(input.file);
  if (sizeError) return { error: sizeError };

  let payload: {
    error?: string;
    path?: string;
    token?: string;
    publicUrl?: string;
    contentType?: string;
    filename?: string;
  } = {};

  try {
    const response = await fetch("/api/escritorio/processos/upload-file/prepare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        officeProcessId: input.officeProcessId,
        filename: input.file.name,
        kind: input.kind,
        fileSizeBytes: input.file.size,
        contentType: input.file.type || undefined,
      }),
    });

    try {
      payload = (await response.json()) as typeof payload;
    } catch {
      return {
        error: response.ok
          ? "Resposta inválida do servidor."
          : "Falha ao preparar o upload. Verifique a ligação.",
      };
    }

    if (!response.ok) {
      return { error: payload.error ?? "Falha ao preparar o upload." };
    }

    if (!payload.path || !payload.token || !payload.publicUrl) {
      return { error: "Sessão de upload incompleta." };
    }
  } catch {
    return {
      error: "Falha de rede ao preparar o upload. Verifique a ligação e tente novamente.",
    };
  }

  return uploadProcessFileToSignedSession({
    file: input.file,
    session: {
      path: payload.path,
      token: payload.token,
      publicUrl: payload.publicUrl,
      contentType: payload.contentType ?? input.file.type ?? "application/octet-stream",
      filename: payload.filename ?? input.file.name,
    },
  });
}
