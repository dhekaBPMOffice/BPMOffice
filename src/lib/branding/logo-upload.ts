import type { SupabaseClient } from "@supabase/supabase-js";

const BRANDING_BUCKET = "branding-assets";
const MAX_LOGO_SIZE_BYTES = 5 * 1024 * 1024;

type UploadBrandingLogoInput = {
  dataUrl: string;
  scope: "default" | "office";
  officeId?: string | null;
};

function isBucketAlreadyExistsError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const maybeError = error as { code?: string; message?: string };
  return (
    maybeError.code === "BucketAlreadyExists" ||
    maybeError.code === "409" ||
    maybeError.message?.toLowerCase().includes("already exists") === true
  );
}

async function ensureBrandingBucket(supabase: SupabaseClient) {
  const { error } = await supabase.storage.createBucket(BRANDING_BUCKET, {
    public: true,
    fileSizeLimit: `${MAX_LOGO_SIZE_BYTES}`,
    allowedMimeTypes: ["image/png", "image/jpeg"],
  });

  if (error && !isBucketAlreadyExistsError(error)) {
    return { error: error.message };
  }

  return null;
}

export async function uploadBrandingLogo(
  supabase: SupabaseClient,
  input: UploadBrandingLogoInput
): Promise<{ url: string } | { error: string }> {
  const ensured = await ensureBrandingBucket(supabase);
  if (ensured?.error) return { error: ensured.error };

  const match = input.dataUrl.match(/^data:(image\/(?:png|jpeg));base64,(.+)$/i);
  if (!match) {
    return { error: "Arquivo inválido. Envie apenas PNG ou JPEG." };
  }

  const mimeType = match[1].toLowerCase();
  const base64Payload = match[2];
  const fileBuffer = Buffer.from(base64Payload, "base64");

  if (!fileBuffer.length) {
    return { error: "Arquivo inválido. Não foi possível ler a imagem." };
  }

  if (fileBuffer.length > MAX_LOGO_SIZE_BYTES) {
    return { error: "O logo deve ter no máximo 5MB." };
  }

  const extension = mimeType === "image/png" ? "png" : "jpg";
  const scopePrefix =
    input.scope === "default" ? "default" : `office-${input.officeId ?? "unknown"}`;
  const filePath = `${scopePrefix}/${Date.now()}-${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(BRANDING_BUCKET)
    .upload(filePath, fileBuffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (uploadError) {
    return { error: uploadError.message };
  }

  const { data: publicData } = supabase.storage
    .from(BRANDING_BUCKET)
    .getPublicUrl(filePath);

  return { url: publicData.publicUrl };
}
