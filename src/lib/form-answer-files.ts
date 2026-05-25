import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { FormAnswerFile } from "@/types/database";

export const FORM_ANSWER_FILES_BUCKET = "form-answer-files";
const MAX_FORM_ANSWER_FILE_SIZE_BYTES = 50 * 1024 * 1024;

function sanitizeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function isBucketAlreadyExistsError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const value = error as { code?: string; message?: string };
  return (
    value.code === "BucketAlreadyExists" ||
    value.code === "409" ||
    value.message?.toLowerCase().includes("already exists") === true
  );
}

async function ensureFormAnswerFilesBucket(supabase: SupabaseClient) {
  const { error } = await supabase.storage.createBucket(FORM_ANSWER_FILES_BUCKET, {
    public: false,
    fileSizeLimit: MAX_FORM_ANSWER_FILE_SIZE_BYTES,
  });

  if (error && !isBucketAlreadyExistsError(error)) {
    return { error: error.message };
  }

  return null;
}

export async function uploadFormAnswerFile(
  supabase: SupabaseClient,
  file: File,
  scope: string
): Promise<FormAnswerFile | { error: string }> {
  if (file.size > MAX_FORM_ANSWER_FILE_SIZE_BYTES) {
    return { error: `Arquivo muito grande. Máximo: ${MAX_FORM_ANSWER_FILE_SIZE_BYTES / 1024 / 1024}MB.` };
  }

  const ensured = await ensureFormAnswerFilesBucket(supabase);
  if (ensured?.error) return { error: ensured.error };

  const path = `${scope}/${randomUUID()}-${sanitizeFilename(file.name || "arquivo")}`;
  const { error } = await supabase.storage.from(FORM_ANSWER_FILES_BUCKET).upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });

  if (error) {
    return { error: error.message };
  }

  return {
    bucket: FORM_ANSWER_FILES_BUCKET,
    path,
    filename: file.name || "arquivo",
    size: file.size,
    contentType: file.type || null,
  };
}

export async function createFormAnswerFileSignedUrls(
  supabase: SupabaseClient,
  files: FormAnswerFile[],
  expiresIn = 60 * 60
) {
  return Promise.all(
    files.map(async (file) => {
      const { data } = await supabase.storage
        .from(file.bucket || FORM_ANSWER_FILES_BUCKET)
        .createSignedUrl(file.path, expiresIn);

      return {
        ...file,
        signedUrl: data?.signedUrl ?? null,
      };
    })
  );
}
