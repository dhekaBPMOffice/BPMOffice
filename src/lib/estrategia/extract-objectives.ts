/**
 * Extrai texto bruto de um documento (TXT, DOCX, XLSX, XLS) para depois
 * ser parseado em lista de objetivos.
 */
import mammoth from "mammoth";
import * as XLSX from "xlsx";

const ACCEPTED_TYPES = [
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
];

export function isAcceptedMimeType(mime: string): boolean {
  return ACCEPTED_TYPES.includes(mime);
}

export function isAcceptedFilename(name: string): boolean {
  const lower = name.toLowerCase();
  return (
    lower.endsWith(".txt") ||
    lower.endsWith(".docx") ||
    lower.endsWith(".xlsx") ||
    lower.endsWith(".xls")
  );
}

/**
 * Primeira aba: uma célula por linha na coluna A (ignora linhas vazias).
 */
function extractTextFromSpreadsheet(buffer: Buffer): string {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
  if (!wb.SheetNames.length) return "";
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: false,
  }) as unknown[][];
  const lines: string[] = [];
  for (const row of rows) {
    if (!Array.isArray(row)) continue;
    const first = row[0];
    if (first === "" || first == null) continue;
    const s = String(first).trim();
    if (s.length > 0) lines.push(s);
  }
  return lines.join("\n");
}

export async function extractTextFromDocument(
  buffer: Buffer,
  mimeType: string,
  filename: string
): Promise<string> {
  const lower = filename.toLowerCase();

  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    lower.endsWith(".docx")
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value || "";
  }

  if (
    mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mimeType === "application/vnd.ms-excel" ||
    lower.endsWith(".xlsx") ||
    lower.endsWith(".xls")
  ) {
    return extractTextFromSpreadsheet(buffer);
  }

  if (mimeType === "text/plain" || lower.endsWith(".txt")) {
    return buffer.toString("utf-8");
  }

  throw new Error("Tipo de arquivo não suportado. Use TXT, DOCX ou Excel (.xlsx, .xls).");
}

/**
 * A partir do texto bruto, identifica linhas que parecem objetivos
 * (listas numeradas, com marcadores, ou uma por linha).
 */
export function parseObjectivesFromText(text: string): string[] {
  const normalized = text.replace(/^\uFEFF/, "").trim();
  let lines = normalized
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 1 && lines[0].includes(";")) {
    lines = lines[0]
      .split(/\s*;\s*/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  const objectives: string[] = [];

  for (const line of lines) {
    let cleaned = line.replace(/^\s*(\d{1,3}[.)]\s*)/, "").trim();
    cleaned = cleaned.replace(/^\s*[-*•]\s*/, "").trim();
    if (cleaned.length > 0) {
      objectives.push(cleaned);
    }
  }

  return objectives.length > 0 ? objectives : lines;
}
