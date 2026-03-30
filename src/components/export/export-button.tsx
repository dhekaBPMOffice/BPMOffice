"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import jsPDF from "jspdf";
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  AlignmentType,
} from "docx";
import { useIdentity } from "@/components/providers/identity-provider";
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
import type {
  DocumentTypeConfig,
  DocumentTemplate,
  DocumentSectionConfig,
} from "@/types/database";

export type ExportFormat = "pdf" | "docx" | "json";

export interface ExportButtonProps {
  data: unknown;
  filename: string;
  format: ExportFormat;
  children?: React.ReactNode;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  documentType?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function isServiceArray(data: unknown): data is ServiceLike[] {
  return Array.isArray(data);
}

function isMatrixData(data: unknown): data is MatrixData {
  if (!data || typeof data !== "object") return false;
  return Array.isArray((data as MatrixData).quadrants);
}

// ---------------------------------------------------------------------------
// Fetch config from DB
// ---------------------------------------------------------------------------

async function fetchTypeConfig(documentType: string) {
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

// ---------------------------------------------------------------------------
// Alignment helpers
// ---------------------------------------------------------------------------

function pdfAlignment(a: string): "left" | "center" | "right" {
  if (a === "center" || a === "right") return a;
  return "left";
}

const DOCX_ALIGN: Record<string, (typeof AlignmentType)[keyof typeof AlignmentType]> = {
  left: AlignmentType.LEFT,
  center: AlignmentType.CENTER,
  right: AlignmentType.RIGHT,
};

// ---------------------------------------------------------------------------
// Rich-text HTML → jsPDF (simplified parser)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Rich-text HTML → DOCX paragraphs (simplified)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// PDF export
// ---------------------------------------------------------------------------

const PAGE_WIDTH_MM = 210;

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

interface PdfTableColumn {
  header: string;
  widthPct: number;
  getValue: (row: ServiceLike) => string;
}

const SERVICE_TABLE_COLS: PdfTableColumn[] = [
  { header: "Nome", widthPct: 0.55, getValue: (r) => String(r.name ?? "-") },
  { header: "Demanda", widthPct: 0.22, getValue: (r) => String(r.demand_level ?? "-") },
  { header: "Capacidade", widthPct: 0.23, getValue: (r) => String(r.capacity_level ?? "-") },
];

function drawPdfServiceTable(
  doc: jsPDF,
  data: ServiceLike[],
  theme: ResolvedDocumentExportTheme,
  startY: number,
  left: number,
): number {
  let y = startY;
  const usableWidth = PAGE_WIDTH_MM - theme.marginMm.left - theme.marginMm.right;
  const colXs = SERVICE_TABLE_COLS.reduce<number[]>((acc, col, i) => {
    const prev = i === 0 ? 0 : acc[i - 1] + SERVICE_TABLE_COLS[i - 1].widthPct * usableWidth;
    acc.push(prev);
    return acc;
  }, []);
  const colWidths = SERVICE_TABLE_COLS.map((c) => c.widthPct * usableWidth);

  const rowHeight = theme.bodyLineStepMm * 1.3;
  const cellPadding = 1;
  const headerBg = hexToRgb(theme.tableHeaderColor);

  doc.setDrawColor(200, 200, 200);

  doc.setFillColor(headerBg[0], headerBg[1], headerBg[2]);
  doc.rect(left, y - rowHeight + cellPadding + 1, usableWidth, rowHeight, "F");

  doc.setFont(theme.pdfFont, theme.tableHeaderBold ? "bold" : "normal");
  doc.setFontSize(theme.tableHeaderFontPt);
  doc.setTextColor(255, 255, 255);
  SERVICE_TABLE_COLS.forEach((col, i) => {
    doc.text(col.header, left + colXs[i] + cellPadding, y, { maxWidth: colWidths[i] - cellPadding * 2 });
  });
  y += rowHeight * 0.3;

  doc.setLineWidth(0.3);
  doc.line(left, y, left + usableWidth, y);
  y += theme.bodyLineStepMm * 0.5;

  doc.setFont(theme.pdfFont, theme.bodyBold ? "bold" : "normal");
  doc.setFontSize(theme.bodyFontPt);
  doc.setTextColor(...hexToRgb("#1a1a1a"));

  data.forEach((row, idx) => {
    const nameText = SERVICE_TABLE_COLS[0].getValue(row);
    const wrappedName = doc.splitTextToSize(nameText, colWidths[0] - cellPadding * 2) as string[];
    const linesNeeded = Math.max(wrappedName.length, 1);

    y = ensurePdfSpace(doc, y, linesNeeded, theme);

    if (idx % 2 === 1) {
      doc.setFillColor(245, 245, 245);
      doc.rect(left, y - theme.bodyLineStepMm * 0.7, usableWidth, linesNeeded * theme.bodyLineStepMm + 1, "F");
    }

    doc.setTextColor(...hexToRgb("#1a1a1a"));
    doc.setFont(theme.pdfFont, theme.bodyBold ? "bold" : "normal");
    doc.setFontSize(theme.bodyFontPt);

    wrappedName.forEach((line, li) => {
      doc.text(line, left + colXs[0] + cellPadding, y + li * theme.bodyLineStepMm);
    });

    for (let ci = 1; ci < SERVICE_TABLE_COLS.length; ci++) {
      const val = SERVICE_TABLE_COLS[ci].getValue(row);
      doc.text(val, left + colXs[ci] + cellPadding, y, {
        maxWidth: colWidths[ci] - cellPadding * 2,
      });
    }

    y += linesNeeded * theme.bodyLineStepMm + 1;
  });

  return y;
}

function exportToPdf(data: unknown, filename: string, theme: ResolvedDocumentExportTheme) {
  const doc = new jsPDF();
  const left = theme.marginMm.left;
  let y = theme.marginMm.top;

  const [pr, pg, pb] = hexToRgb(theme.titleColor);
  const [sr, sg, sb] = hexToRgb(theme.subtitleColor);
  const bodyRgb = hexToRgb("#1a1a1a");

  const afterTitleMm = twipsToMm(theme.spacingAfterTitleTwips);
  const beforeSectionMm = twipsToMm(theme.spacingBeforeSectionTwips);
  const afterSubtitleMm = twipsToMm(theme.spacingAfterSectionTitleTwips);
  const bodyParaMm = twipsToMm(theme.spacingBodyParagraphTwips);

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

  function drawBody() {
    doc.setFont(theme.pdfFont, theme.bodyBold ? "bold" : "normal");
    doc.setFontSize(theme.bodyFontPt);
    doc.setTextColor(bodyRgb[0], bodyRgb[1], bodyRgb[2]);
  }

  if (theme.sections.length > 0) {
    for (let si = 0; si < theme.sections.length; si++) {
      const section = theme.sections[si];
      if (si > 0 && section.type !== "title") {
        y += beforeSectionMm;
      }
      switch (section.type) {
        case "title":
          drawTitle(section.defaultText || "Documento");
          break;
        case "rich_text":
          if (section.content) {
            y = renderRichTextToPdf(doc, section.content, theme, y, left);
          }
          break;
        case "data_table":
          if (isServiceArray(data)) {
            y = drawPdfServiceTable(doc, data as ServiceLike[], theme, y, left);
          }
          break;
        case "data_list":
          if (isMatrixData(data)) {
            (data.quadrants as MatrixQuadrant[]).forEach((q) => {
              drawSubtitle(q.label);
              drawBody();
              if (!q.services.length) {
                y = ensurePdfSpace(doc, y, 1, theme);
                doc.text("- Nenhum serviço", left + theme.bulletIndentMm, y);
                y += theme.bodyLineStepMm + bodyParaMm;
              } else {
                q.services.forEach((s) => {
                  y = ensurePdfSpace(doc, y, 1, theme);
                  doc.text(`• ${s.name ?? "-"}`, left + theme.bulletIndentMm, y);
                  y += theme.bodyLineStepMm + bodyParaMm * 0.3;
                });
              }
              y += bodyParaMm;
            });
          }
          break;
      }
    }
  } else {
    if (isServiceArray(data)) {
      drawTitle("Catálogo de Serviços");
      y = drawPdfServiceTable(doc, data as ServiceLike[], theme, y, left);
    } else if (isMatrixData(data)) {
      drawTitle("Matriz Demanda × Capacidade");
      (data.quadrants as MatrixQuadrant[]).forEach((q) => {
        drawSubtitle(q.label);
        drawBody();
        if (!q.services.length) {
          y = ensurePdfSpace(doc, y, 1, theme);
          doc.text("- Nenhum serviço", left + theme.bulletIndentMm, y);
          y += theme.bodyLineStepMm + bodyParaMm;
        } else {
          q.services.forEach((s) => {
            y = ensurePdfSpace(doc, y, 1, theme);
            doc.text(`• ${s.name ?? "-"}`, left + theme.bulletIndentMm, y);
            y += theme.bodyLineStepMm + bodyParaMm * 0.3;
          });
        }
        y += bodyParaMm;
      });
    } else {
      doc.setFontSize(theme.bodyFontPt);
      doc.text("Dados não reconhecidos para exportação.", left, y);
    }
  }

  doc.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}

// ---------------------------------------------------------------------------
// DOCX helpers
// ---------------------------------------------------------------------------

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

function tableCellParagraph(text: string, theme: ResolvedDocumentExportTheme) {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        font: theme.docxFont,
        size: ptToHalfPoints(theme.bodyFontPt),
        color: hexToDocxColor("#1a1a1a"),
      }),
    ],
  });
}

function tableHeaderParagraph(text: string, theme: ResolvedDocumentExportTheme) {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        font: theme.docxFont,
        bold: theme.tableHeaderBold,
        italics: theme.tableHeaderItalic,
        size: ptToHalfPoints(theme.tableHeaderFontPt),
        color: hexToDocxColor(theme.tableHeaderColor),
      }),
    ],
  });
}

function buildServiceTable(data: ServiceLike[], theme: ResolvedDocumentExportTheme): Table {
  const headerRow = new TableRow({
    children: [
      new TableCell({ children: [tableHeaderParagraph("Nome", theme)] }),
      new TableCell({ children: [tableHeaderParagraph("Demanda", theme)] }),
      new TableCell({ children: [tableHeaderParagraph("Capacidade", theme)] }),
    ],
  });
  const rows = data.map(
    (s) =>
      new TableRow({
        children: [
          new TableCell({ children: [tableCellParagraph(s.name ?? "-", theme)] }),
          new TableCell({ children: [tableCellParagraph(String(s.demand_level ?? "-"), theme)] }),
          new TableCell({ children: [tableCellParagraph(String(s.capacity_level ?? "-"), theme)] }),
        ],
      })
  );
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [headerRow, ...rows] });
}

// ---------------------------------------------------------------------------
// DOCX export
// ---------------------------------------------------------------------------

async function exportToDocx(data: unknown, filename: string, theme: ResolvedDocumentExportTheme) {
  const children: (Paragraph | Table)[] = [];

  if (theme.sections.length > 0) {
    for (const section of theme.sections) {
      switch (section.type) {
        case "title":
          children.push(titleParagraph(section.defaultText || "Documento", theme));
          break;
        case "rich_text":
          if (section.content) {
            children.push(...richTextToDocxParagraphs(section.content, theme));
          }
          break;
        case "data_table":
          if (isServiceArray(data)) {
            children.push(new Paragraph(""));
            children.push(buildServiceTable(data as ServiceLike[], theme));
          }
          break;
        case "data_list":
          if (isMatrixData(data)) {
            (data.quadrants as MatrixQuadrant[]).forEach((q) => {
              children.push(subtitleParagraph(q.label, theme));
              if (!q.services.length) {
                children.push(bodyParagraph("- Nenhum serviço", theme));
              } else {
                q.services.forEach((s) => {
                  children.push(bodyParagraph(`• ${s.name ?? "-"}`, theme));
                });
              }
            });
          }
          break;
      }
    }
  } else {
    if (isServiceArray(data)) {
      children.push(titleParagraph("Catálogo de Serviços", theme));
      children.push(new Paragraph(""));
      children.push(buildServiceTable(data as ServiceLike[], theme));
    } else if (isMatrixData(data)) {
      children.push(titleParagraph("Matriz Demanda × Capacidade", theme));
      (data.quadrants as MatrixQuadrant[]).forEach((q) => {
        children.push(subtitleParagraph(q.label, theme));
        if (!q.services.length) {
          children.push(bodyParagraph("- Nenhum serviço", theme));
        } else {
          q.services.forEach((s) => {
            children.push(bodyParagraph(`• ${s.name ?? "-"}`, theme));
          });
        }
      });
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

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export function ExportButton({
  data,
  filename,
  format,
  children,
  variant = "outline",
  size = "default",
  className,
  documentType,
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const identity = useIdentity();

  async function handleClick() {
    try {
      if (format === "json") {
        downloadJson(data, filename);
        return;
      }

      setIsExporting(true);

      let typeConfig: DocumentTypeConfig | null = null;
      let template: DocumentTemplate | null = null;

      if (documentType) {
        const fetched = await fetchTypeConfig(documentType);
        typeConfig = fetched.typeConfig;
        template = fetched.template;
      }

      const theme = resolveDocumentExportTheme({
        branding: identity?.branding ?? null,
        typeConfig,
        template,
      });

      if (format === "pdf") {
        exportToPdf(data, filename, theme);
      } else if (format === "docx") {
        await exportToDocx(data, filename, theme);
      }
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="relative">
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={handleClick}
        disabled={isExporting}
      >
        <Download className="h-4 w-4" />
        {children ?? `Exportar ${format.toUpperCase()}`}
      </Button>
    </div>
  );
}
