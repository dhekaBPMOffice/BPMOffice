import type {
  Branding,
  DocumentTemplateStyles,
  DocumentTypeConfig,
  DocumentTemplate,
  BrandingMapping,
  DocumentSectionConfig,
} from "@/types/database";

// ---------------------------------------------------------------------------
// Tipos públicos
// ---------------------------------------------------------------------------

export type DocumentExportPreset = "default" | "compact" | "spacious";

export interface ResolvedDocumentExportTheme {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  titleColor: string;
  subtitleColor: string;
  tableHeaderColor: string;
  bodyFontPt: number;
  titleFontPt: number;
  subtitleFontPt: number;
  tableHeaderFontPt: number;
  titleBold: boolean;
  titleItalic: boolean;
  subtitleBold: boolean;
  subtitleItalic: boolean;
  bodyBold: boolean;
  bodyItalic: boolean;
  tableHeaderBold: boolean;
  tableHeaderItalic: boolean;
  titleAlignment: string;
  subtitleAlignment: string;
  bodyAlignment: string;
  tableHeaderAlignment: string;
  marginMm: { top: number; left: number; right: number; bottom: number };
  spacingAfterTitleTwips: number;
  spacingBeforeSectionTwips: number;
  spacingAfterSectionTitleTwips: number;
  spacingBodyParagraphTwips: number;
  bodyLineStepMm: number;
  bulletIndentMm: number;
  pdfFont: "helvetica" | "times" | "courier";
  docxFont: string;
  sections: DocumentSectionConfig[];
}

export interface ResolveDocumentExportThemeInput {
  branding?: Branding | null;
  preset?: DocumentExportPreset;
  typeConfig?: DocumentTypeConfig | null;
  template?: DocumentTemplate | null;
}

// ---------------------------------------------------------------------------
// Conversores
// ---------------------------------------------------------------------------

export function ptToTwips(pt: number): number {
  return Math.round(pt * 20);
}

/** Converte twips (OOXML) para milímetros (PDF). 1 twip = 25.4/1440 mm. */
export function twipsToMm(twips: number): number {
  return twips * 25.4 / 1440;
}

export function ptToHalfPoints(pt: number): number {
  return Math.round(pt * 2);
}

export function hexToRgb(hex: string): [number, number, number] {
  const n = hex.replace("#", "");
  return [
    parseInt(n.slice(0, 2), 16),
    parseInt(n.slice(2, 4), 16),
    parseInt(n.slice(4, 6), 16),
  ];
}

export function hexToDocxColor(hex: string): string {
  return hex.replace("#", "").toUpperCase();
}

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

const LEGACY_BLUE = "#1d4ed8";

function normalizeHex(color: string | undefined, fallback: string): string {
  if (!color?.trim()) return fallback;
  let c = color.trim();
  if (!c.startsWith("#")) c = `#${c}`;
  if (/^#[0-9A-Fa-f]{6}$/.test(c)) return c;
  return fallback;
}

function lineStepMm(bodyPt: number, lineHeight = 1.35): number {
  return bodyPt * (25.4 / 72) * lineHeight;
}

const FONT_FAMILY_TO_PDF: Record<string, "helvetica" | "times" | "courier"> = {
  Calibri: "helvetica",
  Arial: "helvetica",
  Helvetica: "helvetica",
  "Times New Roman": "times",
  "Courier New": "courier",
};

const DEFAULT_STYLES: DocumentTemplateStyles = {
  fontFamily: "Calibri",
  title: { fontSize: 16, bold: true, italic: false, alignment: "left" },
  subtitle: { fontSize: 13, bold: true, italic: false, alignment: "left" },
  body: { fontSize: 11, bold: false, italic: false, alignment: "left" },
  tableHeader: { fontSize: 12, bold: true, italic: false, alignment: "left" },
  spacing: { afterTitle: 12, beforeSection: 10, afterSectionTitle: 8, bodyParagraph: 4 },
  margins: { top: 18, left: 14, right: 14, bottom: 18 },
};

function mergeStyles(
  base: DocumentTemplateStyles,
  overrides?: Partial<DocumentTemplateStyles> | null
): DocumentTemplateStyles {
  if (!overrides) return base;
  return {
    fontFamily: overrides.fontFamily ?? base.fontFamily,
    title: overrides.title ? { ...base.title, ...overrides.title } : base.title,
    subtitle: overrides.subtitle ? { ...base.subtitle, ...overrides.subtitle } : base.subtitle,
    body: overrides.body ? { ...base.body, ...overrides.body } : base.body,
    tableHeader: overrides.tableHeader ? { ...base.tableHeader, ...overrides.tableHeader } : base.tableHeader,
    spacing: overrides.spacing ? { ...base.spacing, ...overrides.spacing } : base.spacing,
    margins: overrides.margins ? { ...base.margins, ...overrides.margins } : base.margins,
  };
}

function resolveColorFromMapping(
  field: string,
  mapping: BrandingMapping | undefined,
  branding: Branding | null | undefined,
  fallback: string
): string {
  if (!mapping || !(field in mapping)) return fallback;
  const brandingKey = mapping[field];
  if (!branding) return fallback;
  const val = (branding as unknown as Record<string, unknown>)[brandingKey];
  if (typeof val === "string") return normalizeHex(val, fallback);
  return fallback;
}

function parseDbStyles(raw: unknown): DocumentTemplateStyles {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_STYLES };
  const o = raw as Record<string, unknown>;
  function role(key: string, fb: DocumentTemplateStyles["title"]) {
    const r = o[key] as Record<string, unknown> | undefined;
    if (!r) return fb;
    return {
      fontSize: typeof r.fontSize === "number" ? r.fontSize : fb.fontSize,
      bold: typeof r.bold === "boolean" ? r.bold : fb.bold,
      italic: typeof r.italic === "boolean" ? r.italic : fb.italic,
      alignment: (r.alignment === "left" || r.alignment === "center" || r.alignment === "right") ? r.alignment : fb.alignment,
    };
  }
  function sp() {
    const r = o.spacing as Record<string, unknown> | undefined;
    if (!r) return DEFAULT_STYLES.spacing;
    const d = DEFAULT_STYLES.spacing;
    return {
      afterTitle: typeof r.afterTitle === "number" ? r.afterTitle : d.afterTitle,
      beforeSection: typeof r.beforeSection === "number" ? r.beforeSection : d.beforeSection,
      afterSectionTitle: typeof r.afterSectionTitle === "number" ? r.afterSectionTitle : d.afterSectionTitle,
      bodyParagraph: typeof r.bodyParagraph === "number" ? r.bodyParagraph : d.bodyParagraph,
    };
  }
  function mg() {
    const r = o.margins as Record<string, unknown> | undefined;
    if (!r) return DEFAULT_STYLES.margins;
    const d = DEFAULT_STYLES.margins;
    return {
      top: typeof r.top === "number" ? r.top : d.top,
      left: typeof r.left === "number" ? r.left : d.left,
      right: typeof r.right === "number" ? r.right : d.right,
      bottom: typeof r.bottom === "number" ? r.bottom : d.bottom,
    };
  }
  return {
    fontFamily: typeof o.fontFamily === "string" ? o.fontFamily : DEFAULT_STYLES.fontFamily,
    title: role("title", DEFAULT_STYLES.title),
    subtitle: role("subtitle", DEFAULT_STYLES.subtitle),
    body: role("body", DEFAULT_STYLES.body),
    tableHeader: role("tableHeader", DEFAULT_STYLES.tableHeader),
    spacing: sp(),
    margins: mg(),
  };
}

// ---------------------------------------------------------------------------
// Resolução principal
// ---------------------------------------------------------------------------

export function resolveDocumentExportTheme(
  input: ResolveDocumentExportThemeInput = {}
): ResolvedDocumentExportTheme {
  const branding = input.branding;
  const typeConfig = input.typeConfig;
  const template = input.template;

  let primary = normalizeHex(branding?.primary_color, "#0097a7");
  if (branding?.primary_color === LEGACY_BLUE) primary = "#0097a7";
  const secondary = normalizeHex(branding?.secondary_color, "#7b1fa2");
  const accent = normalizeHex(branding?.accent_color, "#c2185b");

  const templateStyles = template ? parseDbStyles(template.styles) : DEFAULT_STYLES;
  const overrides = typeConfig
    ? (typeConfig.style_overrides as Partial<DocumentTemplateStyles> | undefined)
    : undefined;
  const styles = mergeStyles(templateStyles, overrides);

  const brandingMap = (typeConfig?.branding_mapping ?? {}) as BrandingMapping;
  const titleColor = resolveColorFromMapping("title.color", brandingMap, branding, primary);
  const subtitleColor = resolveColorFromMapping("subtitle.color", brandingMap, branding, primary);
  const tableHeaderColor = resolveColorFromMapping("tableHeader.color", brandingMap, branding, primary);

  const pdfFont = FONT_FAMILY_TO_PDF[styles.fontFamily] ?? "helvetica";
  const sections: DocumentSectionConfig[] = Array.isArray(typeConfig?.sections)
    ? typeConfig.sections
    : [];

  return {
    primaryColor: primary,
    secondaryColor: secondary,
    accentColor: accent,
    titleColor,
    subtitleColor,
    tableHeaderColor,
    bodyFontPt: styles.body.fontSize,
    titleFontPt: styles.title.fontSize,
    subtitleFontPt: styles.subtitle.fontSize,
    tableHeaderFontPt: styles.tableHeader.fontSize,
    titleBold: styles.title.bold,
    titleItalic: styles.title.italic,
    subtitleBold: styles.subtitle.bold,
    subtitleItalic: styles.subtitle.italic,
    bodyBold: styles.body.bold,
    bodyItalic: styles.body.italic,
    tableHeaderBold: styles.tableHeader.bold,
    tableHeaderItalic: styles.tableHeader.italic,
    titleAlignment: styles.title.alignment,
    subtitleAlignment: styles.subtitle.alignment,
    bodyAlignment: styles.body.alignment,
    tableHeaderAlignment: styles.tableHeader.alignment,
    marginMm: styles.margins,
    spacingAfterTitleTwips: ptToTwips(styles.spacing.afterTitle),
    spacingBeforeSectionTwips: ptToTwips(styles.spacing.beforeSection),
    spacingAfterSectionTitleTwips: ptToTwips(styles.spacing.afterSectionTitle),
    spacingBodyParagraphTwips: ptToTwips(styles.spacing.bodyParagraph),
    bodyLineStepMm: lineStepMm(styles.body.fontSize),
    bulletIndentMm: 4,
    pdfFont,
    docxFont: styles.fontFamily,
    sections,
  };
}
