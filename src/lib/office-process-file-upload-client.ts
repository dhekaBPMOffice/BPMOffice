import {
  uploadOfficeProcessFileDirect,
  validateProcessFileSize,
} from "@/lib/process-file-upload-client";

export type OfficeProcessFileUploadKind = "template" | "flowchart" | "attachment";

export type OfficeProcessFileUploadResult =
  | { success: true; url: string; filename: string }
  | { error: string };

export function validateOfficeProcessFileSize(file: File): string | null {
  return validateProcessFileSize(file);
}

export async function uploadOfficeProcessFileViaApi(input: {
  officeProcessId: string;
  kind: OfficeProcessFileUploadKind;
  file: File;
}): Promise<OfficeProcessFileUploadResult> {
  return uploadOfficeProcessFileDirect(input);
}
