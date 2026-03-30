import type {
  DocumentTemplateStyles,
  DocumentStyleRole,
  DocumentSpacing,
  DocumentMargins,
} from "@/types/database";

export const DEFAULT_STYLE_ROLE: DocumentStyleRole = {
  fontSize: 11,
  bold: false,
  italic: false,
  alignment: "left",
};

export const DEFAULT_STYLES: DocumentTemplateStyles = {
  fontFamily: "Calibri",
  title: { fontSize: 16, bold: true, italic: false, alignment: "left" },
  subtitle: { fontSize: 13, bold: true, italic: false, alignment: "left" },
  body: { fontSize: 11, bold: false, italic: false, alignment: "left" },
  tableHeader: { fontSize: 12, bold: true, italic: false, alignment: "left" },
  spacing: { afterTitle: 12, beforeSection: 10, afterSectionTitle: 8, bodyParagraph: 4 },
  margins: { top: 18, left: 14, right: 14, bottom: 18 },
};

export function parseStyles(raw: unknown): DocumentTemplateStyles {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_STYLES };
  const o = raw as Record<string, unknown>;
  return {
    fontFamily: typeof o.fontFamily === "string" ? o.fontFamily : DEFAULT_STYLES.fontFamily,
    title: mergeRole(o.title, DEFAULT_STYLES.title),
    subtitle: mergeRole(o.subtitle, DEFAULT_STYLES.subtitle),
    body: mergeRole(o.body, DEFAULT_STYLES.body),
    tableHeader: mergeRole(o.tableHeader, DEFAULT_STYLES.tableHeader),
    spacing: mergeSpacing(o.spacing),
    margins: mergeMargins(o.margins),
  };
}

function mergeRole(raw: unknown, fallback: DocumentStyleRole): DocumentStyleRole {
  if (!raw || typeof raw !== "object") return { ...fallback };
  const o = raw as Record<string, unknown>;
  return {
    fontSize: typeof o.fontSize === "number" ? o.fontSize : fallback.fontSize,
    bold: typeof o.bold === "boolean" ? o.bold : fallback.bold,
    italic: typeof o.italic === "boolean" ? o.italic : fallback.italic,
    alignment:
      o.alignment === "left" || o.alignment === "center" || o.alignment === "right"
        ? o.alignment
        : fallback.alignment,
  };
}

function mergeSpacing(raw: unknown): DocumentSpacing {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_STYLES.spacing };
  const o = raw as Record<string, unknown>;
  const d = DEFAULT_STYLES.spacing;
  return {
    afterTitle: typeof o.afterTitle === "number" ? o.afterTitle : d.afterTitle,
    beforeSection: typeof o.beforeSection === "number" ? o.beforeSection : d.beforeSection,
    afterSectionTitle: typeof o.afterSectionTitle === "number" ? o.afterSectionTitle : d.afterSectionTitle,
    bodyParagraph: typeof o.bodyParagraph === "number" ? o.bodyParagraph : d.bodyParagraph,
  };
}

function mergeMargins(raw: unknown): DocumentMargins {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_STYLES.margins };
  const o = raw as Record<string, unknown>;
  const d = DEFAULT_STYLES.margins;
  return {
    top: typeof o.top === "number" ? o.top : d.top,
    left: typeof o.left === "number" ? o.left : d.left,
    right: typeof o.right === "number" ? o.right : d.right,
    bottom: typeof o.bottom === "number" ? o.bottom : d.bottom,
  };
}

export function mergeStyleOverrides(
  base: DocumentTemplateStyles,
  overrides: Partial<DocumentTemplateStyles>
): DocumentTemplateStyles {
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

export const FONT_OPTIONS = [
  { label: "Calibri", value: "Calibri" },
  { label: "Arial", value: "Arial" },
  { label: "Helvetica", value: "Helvetica" },
  { label: "Times New Roman", value: "Times New Roman" },
  { label: "Courier New", value: "Courier New" },
];
