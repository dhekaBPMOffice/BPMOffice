/**
 * Extrai dados de ficheiros Excel, CSV ou TXT para importação na Cadeia de Valor.
 * Modo estruturado: 5 colunas (Tipo, Macroprocesso, Níveis 1–3), uma linha = um processo.
 */
import * as XLSX from "xlsx";

const ACCEPTED_EXT = [".xls", ".xlsx", ".csv", ".txt"] as const;

const MAX_STRUCTURED_ROWS = 2000;

export type ValueChainStructuredRow = {
  tipo: string;
  macroprocesso: string;
  nivel1: string;
  nivel2: string;
  nivel3: string;
};

export type ValueChainImportResult =
  | { mode: "structured"; rows: ValueChainStructuredRow[] }
  | { mode: "legacy"; lines: string[] };

export function isAcceptedValueChainImportFilename(name: string): boolean {
  const lower = name.toLowerCase();
  return ACCEPTED_EXT.some((ext) => lower.endsWith(ext));
}

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeHeaderKey(s: string): string {
  return stripAccents(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeCell(value: unknown): string {
  if (value == null) return "";
  const s = String(value).trim();
  if (s === "" || s === "-" || s === "—" || s === "–") return "";
  return s;
}

function detectCsvDelimiter(sampleLine: string): "," | ";" {
  const commas = (sampleLine.match(/,/g) ?? []).length;
  const semis = (sampleLine.match(/;/g) ?? []).length;
  return semis > commas ? ";" : ",";
}

function parseCsvLine(line: string, delim: "," | ";"): string[] {
  const parts: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes && c === delim) {
      parts.push(cur.trim());
      cur = "";
      continue;
    }
    cur += c;
  }
  parts.push(cur.trim());
  return parts;
}

function csvTextToMatrix(text: string): string[][] {
  const normalized = text.replace(/^\uFEFF/, "");
  const rawLines = normalized.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (rawLines.length === 0) return [];
  const delim = detectCsvDelimiter(rawLines[0]);
  return rawLines.map((row) => parseCsvLine(row, delim));
}

function xlsxBufferToMatrix(buffer: ArrayBuffer): string[][] {
  const wb = XLSX.read(buffer, { type: "array", cellDates: true });
  if (!wb.SheetNames.length) return [];
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: false,
  }) as unknown[][];
  return rows.map((row) => {
    if (!Array.isArray(row)) return [];
    return row.map((c) => (c == null ? "" : String(c)));
  });
}

type ColumnKey = "tipo" | "macro" | "n1" | "n2" | "n3";

function headerToColumnKey(cell: string): ColumnKey | null {
  const k = normalizeHeaderKey(cell);
  if (!k) return null;
  if (k === "tipo" || k === "type" || k === "categoria") return "tipo";
  if (k === "macroprocesso" || k === "macro processo") return "macro";
  if (
    k === "processo nivel 1" ||
    k === "nivel 1" ||
    k === "processo nivel1" ||
    k === "nivel1" ||
    k.startsWith("processo nivel 1")
  ) {
    return "n1";
  }
  if (k === "processo nivel 2" || k === "nivel 2" || k === "nivel2" || k.startsWith("processo nivel 2")) {
    return "n2";
  }
  if (k === "processo nivel 3" || k === "nivel 3" || k === "nivel3" || k.startsWith("processo nivel 3")) {
    return "n3";
  }
  return null;
}

function findHeaderRowAndMap(matrix: string[][]): { headerRowIndex: number; colMap: Record<ColumnKey, number> } | null {
  const maxScan = Math.min(matrix.length, 30);
  for (let r = 0; r < maxScan; r++) {
    const row = matrix[r];
    if (!row || row.length < 3) continue;
    const colMap: Partial<Record<ColumnKey, number>> = {};
    row.forEach((cell, idx) => {
      const key = headerToColumnKey(normalizeCell(cell));
      if (key && colMap[key] === undefined) colMap[key] = idx;
    });
    if (colMap.tipo !== undefined && colMap.macro !== undefined && colMap.n1 !== undefined) {
      return {
        headerRowIndex: r,
        colMap: {
          tipo: colMap.tipo,
          macro: colMap.macro,
          n1: colMap.n1,
          n2: colMap.n2 ?? -1,
          n3: colMap.n3 ?? -1,
        },
      };
    }
  }
  return null;
}

function rowToStructured(
  row: string[],
  colMap: Record<ColumnKey, number>
): ValueChainStructuredRow | null {
  const tipo = colMap.tipo >= 0 ? normalizeCell(row[colMap.tipo]) : "";
  const macroprocesso = colMap.macro >= 0 ? normalizeCell(row[colMap.macro]) : "";
  const nivel1 = colMap.n1 >= 0 ? normalizeCell(row[colMap.n1]) : "";
  const nivel2 = colMap.n2 >= 0 ? normalizeCell(row[colMap.n2]) : "";
  const nivel3 = colMap.n3 >= 0 ? normalizeCell(row[colMap.n3]) : "";

  if (!tipo && !macroprocesso && !nivel1 && !nivel2 && !nivel3) return null;
  if (!macroprocesso) return null;

  return { tipo, macroprocesso, nivel1, nivel2, nivel3 };
}

/** Cabeçalho reconhecido: devolve linhas (pode ser vazio). Sem cabeçalho: null. */
function extractStructuredRowsFromMatrix(matrix: string[][]): ValueChainStructuredRow[] | null {
  const found = findHeaderRowAndMap(matrix);
  if (!found) return null;

  const { headerRowIndex, colMap } = found;
  const out: ValueChainStructuredRow[] = [];

  for (let r = headerRowIndex + 1; r < matrix.length; r++) {
    if (out.length >= MAX_STRUCTURED_ROWS) break;
    const row = matrix[r] ?? [];
    const padded = [...row];
    const maxIdx = Math.max(colMap.tipo, colMap.macro, colMap.n1, colMap.n2, colMap.n3);
    while (padded.length <= maxIdx) {
      padded.push("");
    }
    const item = rowToStructured(padded, colMap);
    if (item) out.push(item);
  }

  return out;
}

function linesFromCsvLegacy(text: string): string[] {
  const normalized = text.replace(/^\uFEFF/, "");
  const rawLines = normalized
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (rawLines.length === 0) return [];
  const delim = detectCsvDelimiter(rawLines[0]);
  const lines: string[] = [];
  for (const row of rawLines) {
    const cells = parseCsvLine(row, delim);
    const first = cells[0] ?? "";
    if (first.length > 0) lines.push(first);
  }
  return lines;
}

function linesFromXlsxLegacy(buffer: ArrayBuffer): string[] {
  const matrix = xlsxBufferToMatrix(buffer);
  const lines: string[] = [];
  for (const row of matrix) {
    const first = row[0];
    if (first === "" || first == null) continue;
    const s = String(first).trim();
    if (s.length > 0) lines.push(s);
  }
  return lines;
}

function linesFromTxt(text: string): string[] {
  return text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

/** TSV: primeira linha cabeçalho, tab como separador. */
function tryStructuredFromTsv(text: string): ValueChainStructuredRow[] | null {
  const normalized = text.replace(/^\uFEFF/, "");
  const rawLines = normalized.split(/\r?\n/).filter((l) => l.includes("\t"));
  if (rawLines.length < 2) return null;
  const matrix = rawLines.map((line) => line.split("\t").map((c) => c.trim()));
  return extractStructuredRowsFromMatrix(matrix);
}

/**
 * Importação unificada: tenta 5 colunas; senão devolve linhas legacy (coluna A / texto).
 */
export async function extractValueChainImport(file: File): Promise<ValueChainImportResult> {
  const name = file.name.toLowerCase();

  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const buffer = await file.arrayBuffer();
    const matrix = xlsxBufferToMatrix(buffer);
    const structured = extractStructuredRowsFromMatrix(matrix);
    if (structured !== null) return { mode: "structured", rows: structured };
    return { mode: "legacy", lines: linesFromXlsxLegacy(buffer) };
  }

  if (name.endsWith(".csv")) {
    const text = await file.text();
    const matrix = csvTextToMatrix(text);
    const structured = extractStructuredRowsFromMatrix(matrix);
    if (structured !== null) return { mode: "structured", rows: structured };
    return { mode: "legacy", lines: linesFromCsvLegacy(text) };
  }

  if (name.endsWith(".txt")) {
    const text = await file.text();
    const tsvMatrix = tryStructuredFromTsv(text);
    if (tsvMatrix !== null) return { mode: "structured", rows: tsvMatrix };
    return { mode: "legacy", lines: linesFromTxt(text) };
  }

  return { mode: "legacy", lines: [] };
}

/**
 * @deprecated Usar extractValueChainImport; mantido para chamadas antigas.
 */
export async function extractLinesFromValueChainFile(file: File): Promise<string[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const buffer = await file.arrayBuffer();
    return linesFromXlsxLegacy(buffer);
  }
  if (name.endsWith(".csv")) {
    const text = await file.text();
    return linesFromCsvLegacy(text);
  }
  if (name.endsWith(".txt")) {
    const text = await file.text();
    return linesFromTxt(text);
  }
  return [];
}
