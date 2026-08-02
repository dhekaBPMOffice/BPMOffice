/**
 * Decodifica bytes de CSV/TXT com detecção de encoding.
 * Excel no Windows costuma gravar CSV em Windows-1252; o browser assume UTF-8 em file.text().
 */

const UTF8_BOM = [0xef, 0xbb, 0xbf] as const;

function hasUtf8Bom(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 3 &&
    bytes[0] === UTF8_BOM[0] &&
    bytes[1] === UTF8_BOM[1] &&
    bytes[2] === UTF8_BOM[2]
  );
}

function decodeWithLabel(bytes: Uint8Array, label: string): string | null {
  try {
    return new TextDecoder(label).decode(bytes);
  } catch {
    return null;
  }
}

function decodeUtf8Strict(bytes: Uint8Array): string | null {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

/** Heurística: sequências UTF-8 inválidas ou muitos caracteres de substituição → provável ANSI/Win-1252. */
function looksLikeMisdecodedUtf8(text: string): boolean {
  if (text.includes("\uFFFD")) return true;
  if (/[\u00C2\u00C3][\u0080-\u00BF]/.test(text) && /Ã./.test(text)) return true;
  return false;
}

export function decodeTextFileBytes(bytes: Uint8Array): string {
  if (bytes.length === 0) return "";

  const payload = hasUtf8Bom(bytes) ? bytes.subarray(3) : bytes;

  const utf8 = decodeUtf8Strict(payload);
  if (utf8 !== null && !looksLikeMisdecodedUtf8(utf8)) {
    return utf8;
  }

  const win1252 = decodeWithLabel(payload, "windows-1252");
  if (win1252 !== null) return win1252;

  const latin1 = decodeWithLabel(payload, "iso-8859-1");
  if (latin1 !== null) return latin1;

  return new TextDecoder("utf-8").decode(payload);
}

export async function readFileAsDecodedText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  return decodeTextFileBytes(new Uint8Array(buffer));
}

/** Prefixo recomendado para CSV abrir corretamente no Excel (UTF-8). */
export const UTF8_BOM_STRING = "\uFEFF";
