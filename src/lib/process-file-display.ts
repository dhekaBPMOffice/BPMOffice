/**
 * Nomes de ficheiro para exibição (alinhado ao admin de processos base).
 */

export function fileNameFromUrl(url: string): string {
  try {
    const path = new URL(url).pathname;
    const seg = path.split("/").filter(Boolean).pop() ?? url;
    return decodeURIComponent(seg);
  } catch {
    const seg = url.split("/").pop() ?? url;
    try {
      return decodeURIComponent(seg);
    } catch {
      return seg;
    }
  }
}

export function displayTemplateName(file: { url: string; label?: string | null }): string {
  const label = file.label?.trim();
  if (label) return label;
  return fileNameFromUrl(file.url);
}
