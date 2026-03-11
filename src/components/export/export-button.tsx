"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import jsPDF from "jspdf";
import { Document, Packer, Paragraph, Table, TableCell, TableRow, WidthType } from "docx";

export type ExportFormat = "pdf" | "docx" | "json";

export interface ExportButtonProps {
  data: unknown;
  filename: string;
  format: ExportFormat;
  children?: React.ReactNode;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
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

type MatrixData = {
  quadrants: MatrixQuadrant[];
};

function isServiceArray(data: unknown): data is ServiceLike[] {
  return Array.isArray(data);
}

function isMatrixData(data: unknown): data is MatrixData {
  if (!data || typeof data !== "object") return false;
  const d = data as MatrixData;
  return Array.isArray(d.quadrants);
}

async function exportToPdf(data: unknown, filename: string) {
  const doc = new jsPDF();
  let y = 20;

  if (isServiceArray(data)) {
    doc.setFontSize(16);
    doc.text("Catálogo de Serviços", 14, y);
    y += 10;

    doc.setFontSize(11);
    doc.text("Nome", 14, y);
    doc.text("Demanda", 80, y);
    doc.text("Capacidade", 120, y);
    y += 6;

    (data as ServiceLike[]).forEach((s) => {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      doc.text(s.name ?? "-", 14, y);
      doc.text((s.demand_level ?? "-") as string, 80, y);
      doc.text((s.capacity_level ?? "-") as string, 120, y);
      y += 6;
    });
  } else if (isMatrixData(data)) {
    doc.setFontSize(16);
    doc.text("Matriz Demanda x Capacidade", 14, y);
    y += 10;

    doc.setFontSize(12);
    (data.quadrants as MatrixQuadrant[]).forEach((q) => {
      if (y > 260) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(12);
      doc.text(q.label, 14, y);
      y += 6;
      doc.setFontSize(11);
      if (!q.services.length) {
        doc.text("- Nenhum serviço", 18, y);
        y += 6;
      } else {
        q.services.forEach((s) => {
          if (y > 280) {
            doc.addPage();
            y = 20;
          }
          doc.text(`• ${s.name ?? "-"}`, 18, y);
          y += 5;
        });
      }
      y += 4;
    });
  } else {
    doc.text("Dados não reconhecidos para exportação.", 14, y);
  }

  doc.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}

async function exportToDocx(data: unknown, filename: string) {
  const children: Paragraph[] = [];

  if (isServiceArray(data)) {
    children.push(new Paragraph({ text: "Catálogo de Serviços", spacing: { after: 200 } }));

    const headerRow = new TableRow({
      children: [
        new TableCell({ children: [new Paragraph("Nome")] }),
        new TableCell({ children: [new Paragraph("Demanda")] }),
        new TableCell({ children: [new Paragraph("Capacidade")] }),
      ],
    });

    const rows = (data as ServiceLike[]).map(
      (s) =>
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph(s.name ?? "-")] }),
            new TableCell({ children: [new Paragraph((s.demand_level ?? "-") as string)] }),
            new TableCell({ children: [new Paragraph((s.capacity_level ?? "-") as string)] }),
          ],
        })
    );

    const table = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [headerRow, ...rows],
    });

    const doc = new Document({
      sections: [
        {
          children: [new Paragraph("Catálogo de Serviços"), new Paragraph(""), table],
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    downloadBlob(blob, filename.endsWith(".docx") ? filename : `${filename}.docx`);
    return;
  }

  if (isMatrixData(data)) {
    const paragraphs: Paragraph[] = [
      new Paragraph({ text: "Matriz Demanda x Capacidade", spacing: { after: 200 } }),
    ];

    (data.quadrants as MatrixQuadrant[]).forEach((q) => {
      paragraphs.push(new Paragraph({ text: q.label, spacing: { before: 200, after: 100 } }));
      if (!q.services.length) {
        paragraphs.push(new Paragraph("- Nenhum serviço"));
      } else {
        q.services.forEach((s) => {
          paragraphs.push(new Paragraph(`• ${s.name ?? "-"}`));
        });
      }
    });

    const doc = new Document({
      sections: [
        {
          children: paragraphs,
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    downloadBlob(blob, filename.endsWith(".docx") ? filename : `${filename}.docx`);
    return;
  }

  const fallbackDoc = new Document({
    sections: [
      {
        children: [new Paragraph("Dados não reconhecidos para exportação.")],
      },
    ],
  });
  const fallbackBlob = await Packer.toBlob(fallbackDoc);
  downloadBlob(fallbackBlob, filename.endsWith(".docx") ? filename : `${filename}.docx`);
}

export function ExportButton({
  data,
  filename,
  format,
  children,
  variant = "outline",
  size = "default",
  className,
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  async function handleClick() {
    try {
      if (format === "json") {
        downloadJson(data, filename);
        return;
      }
      setIsExporting(true);
      if (format === "pdf") {
        await exportToPdf(data, filename);
      } else if (format === "docx") {
        await exportToDocx(data, filename);
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
