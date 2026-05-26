import { MAX_FILE_SIZE_BYTES } from "@/lib/process-file-upload";

export type OfficeProcessFileUploadKind = "template" | "flowchart" | "attachment";

export type OfficeProcessFileUploadResult =
  | { success: true; url: string; filename: string }
  | { error: string };

export function validateOfficeProcessFileSize(file: File): string | null {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `Arquivo muito grande. Máximo: ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB`;
  }
  return null;
}

export async function uploadOfficeProcessFileViaApi(input: {
  officeProcessId: string;
  kind: OfficeProcessFileUploadKind;
  file: File;
}): Promise<OfficeProcessFileUploadResult> {
  const sizeError = validateOfficeProcessFileSize(input.file);
  if (sizeError) return { error: sizeError };

  const formData = new FormData();
  formData.set("officeProcessId", input.officeProcessId);
  formData.set("kind", input.kind);
  formData.set("file", input.file);

  try {
    const response = await fetch("/api/escritorio/processos/upload-file", {
      method: "POST",
      body: formData,
    });

    let payload: { error?: string; url?: string; filename?: string } = {};
    try {
      payload = (await response.json()) as typeof payload;
    } catch {
      return {
        error: response.ok
          ? "Resposta inválida do servidor."
          : "Falha ao enviar o ficheiro. Verifique o tamanho (máx. 20 MB) e a ligação.",
      };
    }

    if (!response.ok) {
      return { error: payload.error ?? "Falha ao enviar o ficheiro." };
    }

    if (!payload.url) {
      return { error: "Upload concluído sem URL do ficheiro." };
    }

    return {
      success: true,
      url: payload.url,
      filename: payload.filename ?? input.file.name,
    };
  } catch {
    return {
      error: "Falha de rede ao enviar o ficheiro. Verifique a ligação e tente novamente.",
    };
  }
}
