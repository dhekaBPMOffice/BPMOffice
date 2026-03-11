/**
 * Extrai texto bruto de um documento (TXT, DOCX) para depois
 * ser parseado em lista de objetivos.
 */
import mammoth from "mammoth";

const ACCEPTED_TYPES = [
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export function isAcceptedMimeType(mime: string): boolean {
  return ACCEPTED_TYPES.includes(mime);
}

export function isAcceptedFilename(name: string): boolean {
  const lower = name.toLowerCase();
  return (
    lower.endsWith(".txt") ||
    lower.endsWith(".docx")
  );
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

  if (mimeType === "text/plain" || lower.endsWith(".txt")) {
    return buffer.toString("utf-8");
  }

  throw new Error("Tipo de arquivo não suportado. Use TXT ou DOCX.");
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
