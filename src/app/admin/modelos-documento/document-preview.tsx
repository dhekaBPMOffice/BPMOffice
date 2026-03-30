"use client";

import type { DocumentTemplateStyles, DocumentSectionConfig, BrandingMapping } from "@/types/database";

interface DocumentPreviewProps {
  styles: DocumentTemplateStyles;
  sections: DocumentSectionConfig[];
  brandingMapping: BrandingMapping;
}

const SAMPLE_SERVICES = [
  { name: "Mapeamento de Processos", demand: "Alta", capacity: "Alta" },
  { name: "Análise de Indicadores", demand: "Alta", capacity: "Baixa" },
  { name: "Redesenho de Fluxos", demand: "Baixa", capacity: "Alta" },
];

const SAMPLE_QUADRANTS = [
  { label: "Alta demanda / Alta capacidade", services: ["Mapeamento de Processos"] },
  { label: "Alta demanda / Baixa capacidade", services: ["Análise de Indicadores"] },
  { label: "Baixa demanda / Alta capacidade", services: ["Redesenho de Fluxos"] },
  { label: "Baixa demanda / Baixa capacidade", services: [] as string[] },
];

function resolveColor(field: string, mapping: BrandingMapping): string | undefined {
  const mapped = mapping[field];
  if (!mapped) return undefined;
  if (mapped === "primary_color") return "#0097a7";
  if (mapped === "secondary_color") return "#7b1fa2";
  if (mapped === "accent_color") return "#c2185b";
  return undefined;
}

export function DocumentPreview({ styles, sections, brandingMapping }: DocumentPreviewProps) {
  const titleColor = resolveColor("title.color", brandingMapping) ?? "#1a1a1a";
  const subtitleColor = resolveColor("subtitle.color", brandingMapping) ?? "#1a1a1a";
  const thColor = resolveColor("tableHeader.color", brandingMapping) ?? "#1a1a1a";

  const pageStyle: React.CSSProperties = {
    fontFamily: styles.fontFamily,
    padding: `${styles.margins.top}px ${styles.margins.right}px ${styles.margins.bottom}px ${styles.margins.left}px`,
  };

  function titleStyle(): React.CSSProperties {
    return {
      fontSize: `${styles.title.fontSize}px`,
      fontWeight: styles.title.bold ? 700 : 400,
      fontStyle: styles.title.italic ? "italic" : "normal",
      textAlign: styles.title.alignment,
      color: titleColor,
      marginBottom: `${styles.spacing.afterTitle}px`,
    };
  }

  function subtitleStyle(): React.CSSProperties {
    return {
      fontSize: `${styles.subtitle.fontSize}px`,
      fontWeight: styles.subtitle.bold ? 700 : 400,
      fontStyle: styles.subtitle.italic ? "italic" : "normal",
      textAlign: styles.subtitle.alignment,
      color: subtitleColor,
      marginTop: `${styles.spacing.beforeSection}px`,
      marginBottom: `${styles.spacing.afterSectionTitle}px`,
    };
  }

  function bodyStyle(): React.CSSProperties {
    return {
      fontSize: `${styles.body.fontSize}px`,
      fontWeight: styles.body.bold ? 700 : 400,
      fontStyle: styles.body.italic ? "italic" : "normal",
      textAlign: styles.body.alignment,
      marginBottom: `${styles.spacing.bodyParagraph}px`,
      color: "#1a1a1a",
    };
  }

  function thStyle(): React.CSSProperties {
    return {
      fontSize: `${styles.tableHeader.fontSize}px`,
      fontWeight: styles.tableHeader.bold ? 700 : 400,
      fontStyle: styles.tableHeader.italic ? "italic" : "normal",
      textAlign: styles.tableHeader.alignment,
      color: thColor,
      padding: "4px 8px",
      borderBottom: "1.5px solid #ccc",
    };
  }

  function renderSection(section: DocumentSectionConfig) {
    switch (section.type) {
      case "title":
        return <div style={titleStyle()}>{section.defaultText || "Título"}</div>;
      case "rich_text":
        if (!section.content) return null;
        return (
          <div
            style={bodyStyle()}
            dangerouslySetInnerHTML={{ __html: section.content }}
          />
        );
      case "data_table":
        return (
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: `${styles.spacing.beforeSection}px` }}>
            <thead>
              <tr>
                <th style={thStyle()}>Nome</th>
                <th style={thStyle()}>Demanda</th>
                <th style={thStyle()}>Capacidade</th>
              </tr>
            </thead>
            <tbody>
              {SAMPLE_SERVICES.map((s) => (
                <tr key={s.name}>
                  <td style={{ ...bodyStyle(), padding: "3px 8px", borderBottom: "1px solid #eee" }}>{s.name}</td>
                  <td style={{ ...bodyStyle(), padding: "3px 8px", borderBottom: "1px solid #eee" }}>{s.demand}</td>
                  <td style={{ ...bodyStyle(), padding: "3px 8px", borderBottom: "1px solid #eee" }}>{s.capacity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      case "data_list":
        return (
          <div style={{ marginTop: `${styles.spacing.beforeSection}px` }}>
            {SAMPLE_QUADRANTS.map((q) => (
              <div key={q.label}>
                <div style={subtitleStyle()}>{q.label}</div>
                {q.services.length === 0 ? (
                  <div style={bodyStyle()}>- Nenhum serviço</div>
                ) : (
                  q.services.map((s) => (
                    <div key={s} style={bodyStyle()}>• {s}</div>
                  ))
                )}
              </div>
            ))}
          </div>
        );
      default:
        return null;
    }
  }

  return (
    <div className="rounded-lg border bg-white shadow-sm overflow-auto max-h-[600px]">
      <div className="border-b bg-muted/30 px-3 py-2">
        <p className="text-xs font-medium text-muted-foreground">Pré-visualização</p>
      </div>
      <div style={pageStyle} className="min-h-[400px]">
        {sections.map((s) => (
          <div key={s.key}>{renderSection(s)}</div>
        ))}
        {sections.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-12">Nenhuma seção configurada.</p>
        )}
      </div>
    </div>
  );
}
