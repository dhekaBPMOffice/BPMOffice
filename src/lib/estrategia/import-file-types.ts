/** Extensões aceites pelo import de objetivos (alinhado a `extract-objectives` / APIs). */

export const ACCEPTED_IMPORT_EXT = ".txt, .docx, .xlsx, .xls";

/** Valor `accept` para `<input type="file">` (extensões + MIME de folhas de cálculo). */
export const ACCEPT_IMPORT_INPUT =
  ".txt,.docx,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel";

export function isAcceptedImportFilename(name: string): boolean {
  const lower = name.toLowerCase();
  return (
    lower.endsWith(".txt") ||
    lower.endsWith(".docx") ||
    lower.endsWith(".xlsx") ||
    lower.endsWith(".xls")
  );
}
