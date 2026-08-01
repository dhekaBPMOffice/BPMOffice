"use client";

import { prepareBaseProcessFileUpload } from "./actions";
import {
  uploadProcessFileToSignedSession,
  validateProcessFileSize,
  type ProcessFileKind,
  type ProcessFileUploadClientResult,
} from "@/lib/process-file-upload-client";

export async function uploadBaseProcessFileDirect(input: {
  baseProcessId: string;
  kind: ProcessFileKind;
  file: File;
}): Promise<ProcessFileUploadClientResult> {
  const sizeError = validateProcessFileSize(input.file);
  if (sizeError) return { error: sizeError };

  let session: Awaited<ReturnType<typeof prepareBaseProcessFileUpload>>;
  try {
    session = await prepareBaseProcessFileUpload({
      baseProcessId: input.baseProcessId,
      filename: input.file.name,
      kind: input.kind,
      fileSizeBytes: input.file.size,
      contentType: input.file.type || undefined,
    });
  } catch {
    return {
      error: "Falha ao preparar o upload. Verifique a ligação e tente novamente.",
    };
  }

  if ("error" in session) {
    return { error: session.error ?? "Falha ao preparar o upload." };
  }

  return uploadProcessFileToSignedSession({
    file: input.file,
    session: {
      path: session.path,
      token: session.token,
      publicUrl: session.publicUrl,
      contentType: session.contentType,
      filename: session.filename,
    },
  });
}
