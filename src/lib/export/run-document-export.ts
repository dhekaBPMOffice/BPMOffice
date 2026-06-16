import jsPDF from "jspdf";
import { Document, Packer, Paragraph, TextRun, AlignmentType } from "docx";
import { createClient } from "@/lib/supabase/client";
import {
  hexToDocxColor,
  hexToRgb,
  ptToHalfPoints,
  ptToTwips,
  twipsToMm,
  resolveDocumentExportTheme,
  type ResolvedDocumentExportTheme,
} from "@/lib/export/document-export-theme";
import {
  getConsolidationFieldRows,
  isConsolidationExportData,
} from "@/lib/export/consolidation-export-fields";
import { getPortfolioFieldRows, normalizePortfolioService } from "@/lib/export/portfolio-service-fields";
import type {
  Branding,
  DocumentSectionConfig,
  DocumentTemplate,
  DocumentTypeConfig,
} from "@/types/database";

export type DocumentExportFormat = "pdf" | "docx" | "json";

export interface RunDocumentExportOptions {
  data: unknown;
  filename: string;
  format: DocumentExportFormat;
  documentType?: string;
  branding?: Branding | null;
}

type ServiceLike = {
  name?: string;
  description?: string | null;
  demand_level?: string | null;
  capacity_level?: string | null;
};

type MatrixQuadrant = {
  label: string;
  demand: string;
  capacity: string;
  services: ServiceLike[];
};

type MatrixData = { quadrants: MatrixQuadrant[] };

const PAGE_WIDTH_MM = 210;

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  downloadBlob(blob, filename.endsWith(".json") ? filename : `${filename}.json`);
}

function isServiceArray(data: unknown): data is ServiceLike[] {
  return Array.isArray(data);
}

function isMatrixData(data: unknown): data is MatrixData {
  if (!data || typeof data !== "object") return false;
  return Array.isArray((data as MatrixData).quadrants);
}

export async function fetchDocumentTypeConfig(documentType: string) {
  const supabase = createClient();
  const { data: cfg } = await supabase
    .from("document_type_configs")
    .select("*")
    .eq("document_type", documentType)
    .maybeSingle();
  if (!cfg) return { typeConfig: null, template: null };

  let template = null;
  if (cfg.template_id) {
    const { data: tpl } = await supabase
      .from("document_templates")
      .select("*")
      .eq("id", cfg.template_id)
      .maybeSingle();
    template = tpl as DocumentTemplate | null;
  }
  return { typeConfig: cfg as DocumentTypeConfig, template };
}

function pdfAlignment(a: string): "left" | "center" | "right" {
  if (a === "center" || a === "right") return a;
  return "left";
}

const DOCX_ALIGN: Record<string, (typeof AlignmentType)[keyof typeof AlignmentType]> = {
  left: AlignmentType.LEFT,
  center: AlignmentType.CENTER,
  right: AlignmentType.RIGHT,
};

function resolveSectionTitle(section: DocumentSectionConfig, data: unknown): string {
  const base = section.defaultText || "Documento";
  if (section.type === "title" && isConsolidationExportData(data) && data.processName.trim()) {
    return `${base} - ${data.processName.trim()}`;
  }
  return base;
}

function renderRichTextToPdf(
  doc: jsPDF,
  html: string,
  theme: ResolvedDocumentExportTheme,
  startY: number,
  left: number
): number {
  let y = startY;
  const usableWidth = PAGE_WIDTH_MM - theme.marginMm.left - theme.marginMm.right;
  const stripped = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");

  const paragraphs = stripped.split("\n").filter((l) => l.trim());
  const bodyParaMm = twipsToMm(theme.spacingBodyParagraphTwips);
  doc.setFont(theme.pdfFont, "normal");
  doc.setFontSize(theme.bodyFontPt);
  doc.setTextColor(...hexToRgb("#1a1a1a"));

  for (const para of paragraphs) {
    const wrapped = doc.splitTextToSize(para.trim(), usableWidth) as string[];
    for (const line of wrapped) {
      y = ensurePdfSpace(doc, y, 1, theme);
      doc.text(line, left, y);
      y += theme.bodyLineStepMm;
    }
    y += bodyParaMm;
  }
  return y;
}

function richTextToDocxParagraphs(html: string, theme: ResolvedDocumentExportTheme): Paragraph[] {
  const stripped = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");

  return stripped
    .split("\n")
    .filter((l) => l.trim())
    .map(
      (line) =>
        new Paragraph({
          children: [
            new TextRun({
              text: line.trim(),
              font: theme.docxFont,
              size: ptToHalfPoints(theme.bodyFontPt),
              color: hexToDocxColor("#1a1a1a"),
            }),
          ],
          spacing: { after: theme.spacingBodyParagraphTwips },
          alignment: DOCX_ALIGN[theme.bodyAlignment] ?? AlignmentType.LEFT,
        })
    );
}

function pdfYMax(theme: ResolvedDocumentExportTheme): number {
  return 297 - theme.marginMm.bottom;
}

function ensurePdfSpace(doc: jsPDF, y: number, lines: number, theme: ResolvedDocumentExportTheme): number {
  if (y + lines * theme.bodyLineStepMm > pdfYMax(theme)) {
    doc.addPage();
    return theme.marginMm.top;
  }
  return y;
}

function drawPdfPortfolioServiceBlock(
  doc: jsPDF,
  startY: number,
  left: number,
  theme: ResolvedDocumentExportTheme,
  serviceRaw: unknown,
  addLeadingSectionSpacing: boolean
): number {
  const svc = normalizePortfolioService(serviceRaw);
  const rows = getPortfolioFieldRows(svc);
  const usableWidth = PAGE_WIDTH_MM - theme.marginMm.left - theme.marginMm.right;
  const bodyParaMm = twipsToMm(theme.spacingBodyParagraphTwips);
  const afterSubtitleMm = twipsToMm(theme.spacingAfterSectionTitleTwips);
  const beforeSectionMm = twipsToMm(theme.spacingBeforeSectionTwips);
  let y = startY;

  if (addLeadingSectionSpacing) {
    y += beforeSectionMm;
  }
  y = ensurePdfSpace(doc, y, 3, theme);
  const [sr, sg, sb] = hexToRgb(theme.subtitleColor);
  doc.setFont(theme.pdfFont, theme.subtitleBold ? "bold" : "normal");
  doc.setFontSize(theme.subtitleFontPt);
  doc.setTextColor(sr, sg, sb);
  doc.text(svc.name, left, y, { align: pdfAlignment(theme.subtitleAlignment) });
  y += theme.subtitleFontPt * 0.3528 + afterSubtitleMm;

  doc.setFont(theme.pdfFont, theme.bodyBold ? "bold" : "normal");
  doc.setFontSize(theme.bodyFontPt);
  doc.setTextColor(...hexToRgb("#1a1a1a"));

  rows.forEach(({ label, value }) => {
    y = ensurePdfSpace(doc, y, 1, theme);
    doc.setFont(theme.pdfFont, "bold");
    doc.text(`${label}:`, left, y);
    y += theme.bodyLineStepMm;
    doc.setFont(theme.pdfFont, theme.bodyBold ? "bold" : "normal");
    const wrapped = doc.splitTextToSize(String(value), usableWidth) as string[];
    for (const wline of wrapped) {
      y = ensurePdfSpace(doc, y, 1, theme);
      doc.text(wline, left, y);
      y += theme.bodyLineStepMm;
    }
    y += bodyParaMm;
  });
  y += bodyParaMm * 0.35;
  return y;
}

function drawPdfPortfolioCatalog(
  doc: jsPDF,
  data: ServiceLike[],
  theme: ResolvedDocumentExportTheme,
  startY: number,
  left: number
): number {
  let y = startY;
  data.forEach((row, idx) => {
    y = drawPdfPortfolioServiceBlock(doc, y, left, theme, row, idx > 0);
  });
  return y;
}

function exportToPdf(data: unknown, filename: string, theme: ResolvedDocumentExportTheme) {
  const doc = new jsPDF();
  const left = theme.marginMm.left;
  let y = theme.marginMm.top;

  const [pr, pg, pb] = hexToRgb(theme.titleColor);
  const [sr, sg, sb] = hexToRgb(theme.subtitleColor);

  const afterTitleMm = twipsToMm(theme.spacingAfterTitleTwips);
  const beforeSectionMm = twipsToMm(theme.spacingBeforeSectionTwips);
  const afterSubtitleMm = twipsToMm(theme.spacingAfterSectionTitleTwips);
  const bodyParaMm = twipsToMm(theme.spacingBodyParagraphTwips);
  const usableWidth = PAGE_WIDTH_MM - theme.marginMm.left - theme.marginMm.right;

  function drawTitle(text: string) {
    doc.setFont(theme.pdfFont, theme.titleBold ? "bold" : "normal");
    doc.setFontSize(theme.titleFontPt);
    doc.setTextColor(pr, pg, pb);
    doc.text(text, left, y, { align: pdfAlignment(theme.titleAlignment) });
    y += theme.titleFontPt * 0.3528 + afterTitleMm;
  }

  function drawSubtitle(text: string) {
    y += beforeSectionMm;
    y = ensurePdfSpace(doc, y, 3, theme);
    doc.setFont(theme.pdfFont, theme.subtitleBold ? "bold" : "normal");
    doc.setFontSize(theme.subtitleFontPt);
    doc.setTextColor(sr, sg, sb);
    doc.text(text, left, y, { align: pdfAlignment(theme.subtitleAlignment) });
    y += theme.subtitleFontPt * 0.3528 + afterSubtitleMm;
  }

  function drawBodyLines(text: string) {
    doc.setFont(theme.pdfFont, theme.bodyBold ? "bold" : "normal");
    doc.setFontSize(theme.bodyFontPt);
    doc.setTextColor(...hexToRgb("#1a1a1a"));
    const lines = text.split(/\r?\n/);
    for (const line of lines) {
      const content = line.trim() || "—";
      const wrapped = doc.splitTextToSize(content, usableWidth) as string[];
      for (const wline of wrapped) {
        y = ensurePdfSpace(doc, y, 1, theme);
        doc.text(wline, left, y);
        y += theme.bodyLineStepMm;
      }
    }
    y += bodyParaMm;
  }

  if (theme.sections.length > 0) {
    for (let si = 0; si < theme.sections.length; si++) {
      const section = theme.sections[si];
      if (si > 0 && section.type !== "title") {
        y += beforeSectionMm;
      }
      switch (section.type) {
        case "title":
          drawTitle(resolveSectionTitle(section, data));
          break;
        case "rich_text":
          if (section.content) {
            y = renderRichTextToPdf(doc, section.content, theme, y, left);
          }
          break;
        case "data_table":
          if (isServiceArray(data)) {
            y = drawPdfPortfolioCatalog(doc, data as ServiceLike[], theme, y, left);
          }
          break;
        case "data_list":
          if (isMatrixData(data)) {
            (data.quadrants as MatrixQuadrant[]).forEach((q) => {
              drawSubtitle(q.label);
              if (!q.services.length) {
                y = ensurePdfSpace(doc, y, 1, theme);
                doc.text("- Nenhum serviço", left + theme.bulletIndentMm, y);
                y += theme.bodyLineStepMm + bodyParaMm;
              } else {
                q.services.forEach((s, idx) => {
                  y = drawPdfPortfolioServiceBlock(doc, y, left, theme, s, idx > 0);
                });
              }
              y += bodyParaMm;
            });
          }
          break;
        case "data_fields":
          if (isConsolidationExportData(data)) {
            getConsolidationFieldRows(data.fields).forEach(({ label, value }) => {
              drawSubtitle(label);
              drawBodyLines(value);
            });
          }
          break;
      }
    }
  } else {
    if (isServiceArray(data)) {
      drawTitle("Catálogo de Serviços");
      y = drawPdfPortfolioCatalog(doc, data as ServiceLike[], theme, y, left);
    } else if (isMatrixData(data)) {
      drawTitle("Matriz Demanda × Capacidade");
      (data.quadrants as MatrixQuadrant[]).forEach((q) => {
        drawSubtitle(q.label);
        if (!q.services.length) {
          y = ensurePdfSpace(doc, y, 1, theme);
          doc.text("- Nenhum serviço", left + theme.bulletIndentMm, y);
          y += theme.bodyLineStepMm + bodyParaMm;
        } else {
          q.services.forEach((s, idx) => {
            y = drawPdfPortfolioServiceBlock(doc, y, left, theme, s, idx > 0);
          });
        }
        y += bodyParaMm;
      });
    } else if (isConsolidationExportData(data)) {
      drawTitle(`Consolidação do Levantamento - ${data.processName}`);
      getConsolidationFieldRows(data.fields).forEach(({ label, value }) => {
        drawSubtitle(label);
        drawBodyLines(value);
      });
    } else {
      doc.setFontSize(theme.bodyFontPt);
      doc.text("Dados não reconhecidos para exportação.", left, y);
    }
  }

  doc.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}

function titleParagraph(text: string, theme: ResolvedDocumentExportTheme) {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        font: theme.docxFont,
        bold: theme.titleBold,
        italics: theme.titleItalic,
        size: ptToHalfPoints(theme.titleFontPt),
        color: hexToDocxColor(theme.titleColor),
      }),
    ],
    spacing: { after: theme.spacingAfterTitleTwips },
    alignment: DOCX_ALIGN[theme.titleAlignment] ?? AlignmentType.LEFT,
  });
}

function subtitleParagraph(text: string, theme: ResolvedDocumentExportTheme) {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        font: theme.docxFont,
        bold: theme.subtitleBold,
        italics: theme.subtitleItalic,
        size: ptToHalfPoints(theme.subtitleFontPt),
        color: hexToDocxColor(theme.subtitleColor),
      }),
    ],
    spacing: { before: theme.spacingBeforeSectionTwips, after: theme.spacingAfterSectionTitleTwips },
    alignment: DOCX_ALIGN[theme.subtitleAlignment] ?? AlignmentType.LEFT,
  });
}

function bodyParagraph(text: string, theme: ResolvedDocumentExportTheme) {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        font: theme.docxFont,
        bold: theme.bodyBold,
        italics: theme.bodyItalic,
        size: ptToHalfPoints(theme.bodyFontPt),
        color: hexToDocxColor("#1a1a1a"),
      }),
    ],
    spacing: { after: theme.spacingBodyParagraphTwips },
    alignment: DOCX_ALIGN[theme.bodyAlignment] ?? AlignmentType.LEFT,
  });
}

function portfolioFieldParagraph(label: string, value: string, theme: ResolvedDocumentExportTheme) {
  const gapAfter = Math.round(theme.spacingBodyParagraphTwips * 1.35);
  return new Paragraph({
    children: [
      new TextRun({
        text: `${label}: `,
        font: theme.docxFont,
        bold: true,
        size: ptToHalfPoints(theme.bodyFontPt),
        color: hexToDocxColor("#1a1a1a"),
      }),
      new TextRun({
        text: value,
        font: theme.docxFont,
        bold: theme.bodyBold,
        italics: theme.bodyItalic,
        size: ptToHalfPoints(theme.bodyFontPt),
        color: hexToDocxColor("#1a1a1a"),
      }),
    ],
    spacing: { after: gapAfter },
    alignment: DOCX_ALIGN[theme.bodyAlignment] ?? AlignmentType.LEFT,
  });
}

function serviceNameParagraph(text: string, theme: ResolvedDocumentExportTheme, spacingBefore: boolean) {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        font: theme.docxFont,
        bold: theme.subtitleBold,
        italics: theme.subtitleItalic,
        size: ptToHalfPoints(theme.subtitleFontPt),
        color: hexToDocxColor(theme.subtitleColor),
      }),
    ],
    spacing: {
      before: spacingBefore ? theme.spacingBeforeSectionTwips : 0,
      after: theme.spacingAfterSectionTitleTwips,
    },
    alignment: DOCX_ALIGN[theme.subtitleAlignment] ?? AlignmentType.LEFT,
  });
}

function docxPortfolioServiceParagraphs(
  serviceRaw: unknown,
  theme: ResolvedDocumentExportTheme,
  spacingBeforeTitle: boolean
): Paragraph[] {
  const svc = normalizePortfolioService(serviceRaw);
  const rows = getPortfolioFieldRows(svc);
  const paragraphs: Paragraph[] = [serviceNameParagraph(svc.name, theme, spacingBeforeTitle)];
  rows.forEach(({ label, value }) => {
    paragraphs.push(portfolioFieldParagraph(label, value, theme));
  });
  return paragraphs;
}

function docxConsolidationFieldParagraphs(data: unknown, theme: ResolvedDocumentExportTheme): Paragraph[] {
  if (!isConsolidationExportData(data)) return [];
  const rows = getConsolidationFieldRows(data.fields);
  const paragraphs: Paragraph[] = [];
  rows.forEach(({ label, value }) => {
    paragraphs.push(subtitleParagraph(label, theme));
    value.split(/\r?\n/).forEach((line) => {
      paragraphs.push(bodyParagraph(line.trim() || "—", theme));
    });
  });
  return paragraphs;
}

async function exportToDocx(data: unknown, filename: string, theme: ResolvedDocumentExportTheme) {
  const children: Paragraph[] = [];

  if (theme.sections.length > 0) {
    for (const section of theme.sections) {
      switch (section.type) {
        case "title":
          children.push(titleParagraph(resolveSectionTitle(section, data), theme));
          break;
        case "rich_text":
          if (section.content) {
            children.push(...richTextToDocxParagraphs(section.content, theme));
          }
          break;
        case "data_table":
          if (isServiceArray(data)) {
            children.push(new Paragraph(""));
            (data as ServiceLike[]).forEach((s, idx) => {
              children.push(...docxPortfolioServiceParagraphs(s, theme, idx > 0));
            });
          }
          break;
        case "data_list":
          if (isMatrixData(data)) {
            (data.quadrants as MatrixQuadrant[]).forEach((q) => {
              children.push(subtitleParagraph(q.label, theme));
              if (!q.services.length) {
                children.push(bodyParagraph("- Nenhum serviço", theme));
              } else {
                q.services.forEach((s, idx) => {
                  children.push(...docxPortfolioServiceParagraphs(s, theme, idx > 0));
                });
              }
            });
          }
          break;
        case "data_fields":
          if (isConsolidationExportData(data)) {
            children.push(...docxConsolidationFieldParagraphs(data, theme));
          }
          break;
      }
    }
  } else {
    if (isServiceArray(data)) {
      children.push(titleParagraph("Catálogo de Serviços", theme));
      children.push(new Paragraph(""));
      (data as ServiceLike[]).forEach((s, idx) => {
        children.push(...docxPortfolioServiceParagraphs(s, theme, idx > 0));
      });
    } else if (isMatrixData(data)) {
      children.push(titleParagraph("Matriz Demanda × Capacidade", theme));
      (data.quadrants as MatrixQuadrant[]).forEach((q) => {
        children.push(subtitleParagraph(q.label, theme));
        if (!q.services.length) {
          children.push(bodyParagraph("- Nenhum serviço", theme));
        } else {
          q.services.forEach((s, idx) => {
            children.push(...docxPortfolioServiceParagraphs(s, theme, idx > 0));
          });
        }
      });
    } else if (isConsolidationExportData(data)) {
      children.push(titleParagraph(`Consolidação do Levantamento - ${data.processName}`, theme));
      children.push(...docxConsolidationFieldParagraphs(data, theme));
    } else {
      children.push(bodyParagraph("Dados não reconhecidos para exportação.", theme));
    }
  }

  const docxDoc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: ptToTwips(theme.marginMm.top * 2.835),
              bottom: ptToTwips(theme.marginMm.bottom * 2.835),
              left: ptToTwips(theme.marginMm.left * 2.835),
              right: ptToTwips(theme.marginMm.right * 2.835),
            },
          },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(docxDoc);
  downloadBlob(blob, filename.endsWith(".docx") ? filename : `${filename}.docx`);
}

export async function runDocumentExport(options: RunDocumentExportOptions): Promise<void> {
  const { data, filename, format, documentType, branding } = options;

  if (format === "json") {
    downloadJson(data, filename);
    return;
  }

  let typeConfig: DocumentTypeConfig | null = null;
  let template: DocumentTemplate | null = null;

  if (documentType) {
    const fetched = await fetchDocumentTypeConfig(documentType);
    typeConfig = fetched.typeConfig;
    template = fetched.template;
  }

  const theme = resolveDocumentExportTheme({
    branding: branding ?? null,
    typeConfig,
    template,
  });

  if (format === "pdf") {
    exportToPdf(data, filename, theme);
  } else if (format === "docx") {
    await exportToDocx(data, filename, theme);
  }
}
