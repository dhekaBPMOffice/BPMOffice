"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useIdentity } from "@/components/providers/identity-provider";
import {
  runDocumentExport,
  type DocumentExportFormat,
} from "@/lib/export/run-document-export";

export type ExportFormat = DocumentExportFormat;

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
      setIsExporting(true);
      await runDocumentExport({
        data,
        filename,
        format,
        documentType,
        branding: identity?.branding ?? null,
      });
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

export { runDocumentExport } from "@/lib/export/run-document-export";
