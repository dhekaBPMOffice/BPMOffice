import type { SupabaseClient } from "@supabase/supabase-js";

export const PROCESS_FILES_BUCKET = "process-files";
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB
/** Evita `fetch` pendurada ao obter ficheiro remoto (ex.: importação de processos do catálogo). */
const DUPLICATE_FILE_FETCH_TIMEOUT_MS = 60_000;

const TEMPLATE_BLOCKED_EXTENSIONS = new Set([
  "exe", "bat", "cmd", "sh", "ps1", "vbs", "js", "jar", "dll", "msi",
  "php", "py", "rb", "pl", "cgi", "asp", "aspx", "jsp", "htaccess",
]);

const FLOWCHART_EXTENSIONS = new Set(["png", "bpm", "bpmn", "bpms"]);

const COMMON_MIME_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  bmp: "image/bmp",
  svg: "image/svg+xml",
  bpm: "application/xml",
  bpmn: "application/xml",
  bpms: "application/xml",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  txt: "text/plain",
  csv: "text/csv",
  xml: "application/xml",
  odt: "application/vnd.oasis.opendocument.text",
  ods: "application/vnd.oasis.opendocument.spreadsheet",
};

function getExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  return lastDot >= 0 ? filename.slice(lastDot + 1).toLowerCase() : "";
}

function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function buildProcessScopePath(scope: ProcessFileUploadScope): string {
  return scope.type === "base_process"
    ? `base/${scope.baseProcessId}`
    : `office/${scope.officeProcessId}`;
}

function buildProcessFilePath(scope: ProcessFileUploadScope, filename: string) {
  return `${buildProcessScopePath(scope)}/${Date.now()}-${sanitizeFilename(filename)}`;
}

function resolveMimeType(filename: string, fallback?: string): string {
  const ext = getExtension(filename);
  return COMMON_MIME_TYPES[ext] ?? (fallback || "application/octet-stream");
}

function getProcessFilePublicUrl(supabase: SupabaseClient, filePath: string) {
  const { data } = supabase.storage.from(PROCESS_FILES_BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}

function getFilenameFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const segment = pathname.split("/").filter(Boolean).pop() ?? "arquivo";
    return decodeURIComponent(segment);
  } catch {
    const segment = url.split("/").pop() ?? "arquivo";
    try {
      return decodeURIComponent(segment);
    } catch {
      return segment;
    }
  }
}

function extractPublicStorageLocation(url: string): { bucket: string; path: string } | null {
  try {
    const pathname = new URL(url).pathname;
    const marker = "/storage/v1/object/public/";
    const idx = pathname.indexOf(marker);
    if (idx < 0) return null;
    const rest = pathname.slice(idx + marker.length);
    const [bucket, ...pathParts] = rest.split("/").filter(Boolean);
    if (!bucket || pathParts.length === 0) return null;
    return {
      bucket: decodeURIComponent(bucket),
      path: decodeURIComponent(pathParts.join("/")),
    };
  } catch {
    return null;
  }
}

function isBucketAlreadyExistsError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; message?: string };
  return (
    e.code === "BucketAlreadyExists" ||
    e.code === "409" ||
    e.message?.toLowerCase()?.includes("already exists") === true
  );
}

async function ensureProcessFilesBucket(supabase: SupabaseClient) {
  const allowedMimeTypes = [
    "application/pdf", "image/png", "image/jpeg", "image/gif", "image/webp",
    "image/bmp", "image/svg+xml", "application/xml", "text/xml",
    "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain", "text/csv", "application/octet-stream",
    "application/vnd.oasis.opendocument.text", "application/vnd.oasis.opendocument.spreadsheet",
  ];
  const { error } = await supabase.storage.createBucket(PROCESS_FILES_BUCKET, {
    public: true,
    fileSizeLimit: MAX_FILE_SIZE_BYTES,
    allowedMimeTypes,
  });
  if (error && !isBucketAlreadyExistsError(error)) {
    return { error: error.message };
  }
  return null;
}

export type ProcessFileUploadScope =
  | { type: "base_process"; baseProcessId: string }
  | { type: "office_attachment"; officeProcessId: string };

export type ProcessFileKind = "template" | "flowchart" | "attachment";

export type ProcessFileUploadResult =
  | { url: string; filename: string }
  | { error: string };

function validateFilenameForKind(
  filename: string,
  kind: ProcessFileKind
): { ok: true } | { error: string } {
  const ext = getExtension(filename);

  if (kind === "template") {
    if (TEMPLATE_BLOCKED_EXTENSIONS.has(ext)) {
      return { error: `Formato não permitido por segurança: .${ext}` };
    }
    return { ok: true };
  }

  if (kind === "flowchart") {
    if (!FLOWCHART_EXTENSIONS.has(ext)) {
      return {
        error: `Fluxograma deve ser PNG ou BPM (.png, .bpm, .bpmn, .bpms). Recebido: ${ext || "desconhecido"}`,
      };
    }
    return { ok: true };
  }

  if (kind === "attachment") {
    if (TEMPLATE_BLOCKED_EXTENSIONS.has(ext)) {
      return { error: `Formato não permitido por segurança: .${ext}` };
    }
    return { ok: true };
  }

  return { error: "Tipo de arquivo inválido." };
}

function validateFileForKind(
  file: File,
  kind: ProcessFileKind
): { ok: true } | { error: string } {
  return validateFilenameForKind(file.name, kind);
}

/**
 * Faz upload de arquivo para o bucket de processos.
 * - template: aceita qualquer formato (exceto executáveis e scripts).
 * - flowchart: apenas PNG ou BPM (.png, .bpm, .bpmn, .bpms).
 * - attachment: aceita qualquer formato (exceto executáveis e scripts).
 */
export async function uploadProcessFile(
  supabase: SupabaseClient,
  file: File,
  scope: ProcessFileUploadScope,
  kind: ProcessFileKind = "attachment"
): Promise<ProcessFileUploadResult> {
  const validation = validateFileForKind(file, kind);
  if (!("ok" in validation)) {
    return validation;
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { error: `Arquivo muito grande. Máximo: ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB` };
  }

  const ensured = await ensureProcessFilesBucket(supabase);
  if (ensured?.error) return { error: ensured.error };

  const filePath = buildProcessFilePath(scope, file.name);
  const mimeType = resolveMimeType(file.name, file.type);

  const { error: uploadError } = await supabase.storage
    .from(PROCESS_FILES_BUCKET)
    .upload(filePath, file, {
      contentType: mimeType,
      upsert: false,
    });

  if (uploadError) {
    return { error: uploadError.message };
  }

  return { url: getProcessFilePublicUrl(supabase, filePath), filename: file.name };
}

export async function duplicateProcessFileFromUrl(
  supabase: SupabaseClient,
  input: {
    sourceUrl: string;
    scope: ProcessFileUploadScope;
    kind: ProcessFileKind;
    filename?: string;
  }
): Promise<ProcessFileUploadResult> {
  const sourceUrl = input.sourceUrl.trim();
  if (!sourceUrl) {
    return { error: "URL de origem do arquivo é obrigatória." };
  }

  const filename = (input.filename?.trim() || getFilenameFromUrl(sourceUrl) || "arquivo").trim();
  const validation = validateFilenameForKind(filename, input.kind);
  if (!("ok" in validation)) {
    return validation;
  }

  const ensured = await ensureProcessFilesBucket(supabase);
  if (ensured?.error) return { error: ensured.error };

  const targetPath = buildProcessFilePath(input.scope, filename);
  const sourceLocation = extractPublicStorageLocation(sourceUrl);

  if (sourceLocation?.bucket === PROCESS_FILES_BUCKET) {
    const storage = supabase.storage.from(PROCESS_FILES_BUCKET) as any;
    const { error: copyError } = await storage.copy(sourceLocation.path, targetPath);
    if (!copyError) {
      return {
        url: getProcessFilePublicUrl(supabase, targetPath),
        filename,
      };
    }
  }

  let response: Response;
  try {
    response = await fetch(sourceUrl, {
      signal: AbortSignal.timeout(DUPLICATE_FILE_FETCH_TIMEOUT_MS),
    });
  } catch (error) {
    const isAbort =
      (error instanceof Error && error.name === "AbortError") ||
      (typeof DOMException !== "undefined" &&
        error instanceof DOMException &&
        error.name === "AbortError");
    if (isAbort) {
      return {
        error:
          "Tempo esgotado ao obter o arquivo. Verifique a ligação ou tente de novo em instantes.",
      };
    }
    return {
      error:
        error instanceof Error
          ? `Falha de rede ao obter o arquivo: ${error.message}`
          : "Falha de rede ao obter o arquivo de origem.",
    };
  }

  if (!response.ok) {
    return {
      error: `Não foi possível copiar o arquivo de origem (${response.status} ${response.statusText}).`,
    };
  }

  const blob = await response.blob();
  if (blob.size > MAX_FILE_SIZE_BYTES) {
    return { error: `Arquivo muito grande. Máximo: ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB` };
  }

  const { error: uploadError } = await supabase.storage
    .from(PROCESS_FILES_BUCKET)
    .upload(targetPath, blob, {
      contentType: resolveMimeType(filename, blob.type),
      upsert: false,
    });

  if (uploadError) {
    return { error: uploadError.message };
  }

  return {
    url: getProcessFilePublicUrl(supabase, targetPath),
    filename,
  };
}

export async function deleteProcessFilesByPublicUrls(
  supabase: SupabaseClient,
  urls: string[]
) {
  const paths = urls
    .map((url) => extractPublicStorageLocation(url))
    .filter(
      (location): location is { bucket: string; path: string } =>
        location?.bucket === PROCESS_FILES_BUCKET && Boolean(location.path)
    )
    .map((location) => location.path);

  if (paths.length === 0) return;

  await supabase.storage.from(PROCESS_FILES_BUCKET).remove(paths);
}
