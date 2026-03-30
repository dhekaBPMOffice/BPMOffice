"use client";

/**
 * Pré-visualização dos tipos de documento (catálogo / matriz).
 * O conteúdo por serviço deve seguir a mesma regra que a exportação PDF/DOCX
 * (`export-button` + `portfolio-service-fields`); ao alterar campos exportáveis,
 * atualize também este ficheiro se o layout de pré-visualização mudar.
 */

import type { DocumentTemplateStyles, DocumentSectionConfig, BrandingMapping } from "@/types/database";
import { getPortfolioFieldRows, normalizePortfolioService } from "@/lib/export/portfolio-service-fields";

interface DocumentPreviewProps {
  styles: DocumentTemplateStyles;
  sections: DocumentSectionConfig[];
  brandingMapping: BrandingMapping;
}

/** Objetos de exemplo com os mesmos campos que `ServicePortfolio` (exportação). */
const SAMPLE_CATALOG_SERVICES = [
  {
    id: "demo-1",
    office_id: "",
    name: "Mapeamento de Processos",
    description: "Levantamento e documentação dos processos da organização.",
    methodology: "Entrevistas, workshops e modelagem BPMN.",
    deliverables: "Mapa de processos, ata de reuniões.",
    resources: "Software de modelagem, templates.",
    team: "2 consultores sénior.",
    pricing: "Projeto fechado por escopo.",
    marketing: "Cases e página institucional.",
    demand_level: "Alta",
    capacity_level: "Alta",
    is_custom: false,
    base_service_id: "base-1",
    created_at: "",
    updated_at: "",
  },
  {
    id: "demo-2",
    office_id: "",
    name: "Análise de Indicadores",
    description: "Definição e acompanhamento de KPIs.",
    methodology: "Dashboards e revisão periódica.",
    deliverables: "Painel de indicadores, relatório mensal.",
    resources: "BI, planilhas.",
    team: "1 analista.",
    pricing: "Retainer mensal.",
    marketing: "Newsletter.",
    demand_level: "Alta",
    capacity_level: "Baixa",
    is_custom: true,
    base_service_id: null,
    created_at: "",
    updated_at: "",
  },
  {
    id: "demo-3",
    office_id: "",
    name: "Redesenho de Fluxos",
    description: "Otimização de processos e automação.",
    methodology: "Lean e automação RPA.",
    deliverables: "TO-BE, plano de implementação.",
    resources: "Ferramentas RPA.",
    team: "Arquiteto + desenvolvedor.",
    pricing: "Por fase.",
    marketing: "—",
    demand_level: "Baixa",
    capacity_level: "Alta",
    is_custom: false,
    base_service_id: "base-3",
    created_at: "",
    updated_at: "",
  },
];

const SAMPLE_QUADRANTS: { label: string; services: typeof SAMPLE_CATALOG_SERVICES }[] = [
  { label: "Alta demanda / Alta capacidade", services: [SAMPLE_CATALOG_SERVICES[0]] },
  { label: "Alta demanda / Baixa capacidade", services: [SAMPLE_CATALOG_SERVICES[1]] },
  { label: "Baixa demanda / Alta capacidade", services: [SAMPLE_CATALOG_SERVICES[2]] },
  { label: "Baixa demanda / Baixa capacidade", services: [] },
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

  function subtitleStyle(firstInGroup: boolean): React.CSSProperties {
    return {
      fontSize: `${styles.subtitle.fontSize}px`,
      fontWeight: styles.subtitle.bold ? 700 : 400,
      fontStyle: styles.subtitle.italic ? "italic" : "normal",
      textAlign: styles.subtitle.alignment,
      color: subtitleColor,
      marginTop: firstInGroup ? 0 : `${styles.spacing.beforeSection}px`,
      marginBottom: `${styles.spacing.afterSectionTitle}px`,
    };
  }

  function quadrantTitleStyle(quadrantIndex: number): React.CSSProperties {
    return {
      fontSize: `${styles.subtitle.fontSize}px`,
      fontWeight: styles.subtitle.bold ? 700 : 400,
      fontStyle: styles.subtitle.italic ? "italic" : "normal",
      textAlign: styles.subtitle.alignment,
      color: subtitleColor,
      marginTop: quadrantIndex === 0 ? 0 : `${styles.spacing.beforeSection}px`,
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

  const fieldGapPx = Math.max(10, Math.round(styles.spacing.bodyParagraph * 1.75));

  function renderServiceBlock(
    serviceRaw: unknown,
    serviceIndexInSection: number,
    keySuffix: string,
  ) {
    const svc = normalizePortfolioService(serviceRaw);
    const rows = getPortfolioFieldRows(svc);
    const isFirst = serviceIndexInSection === 0;
    return (
      <div key={keySuffix}>
        <div style={subtitleStyle(isFirst)}>{svc.name}</div>
        {rows.map((row) => (
          <div
            key={row.label}
            style={{
              marginBottom: `${fieldGapPx}px`,
              fontSize: `${styles.body.fontSize}px`,
              fontWeight: styles.body.bold ? 700 : 400,
              fontStyle: styles.body.italic ? "italic" : "normal",
              textAlign: styles.body.alignment as React.CSSProperties["textAlign"],
              color: "#1a1a1a",
              lineHeight: 1.45,
            }}
          >
            <span style={{ fontWeight: 700 }}>{row.label}:</span>{" "}
            <span style={{ fontWeight: styles.body.bold ? 700 : 400 }}>{row.value}</span>
          </div>
        ))}
      </div>
    );
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
          <div style={{ marginTop: `${styles.spacing.beforeSection}px` }}>
            {SAMPLE_CATALOG_SERVICES.map((s, idx) =>
              renderServiceBlock(s, idx, `cat-${s.id}-${idx}`),
            )}
          </div>
        );
      case "data_list":
        return (
          <div style={{ marginTop: `${styles.spacing.beforeSection}px` }}>
            {SAMPLE_QUADRANTS.map((q, qi) => (
              <div key={q.label}>
                <div style={quadrantTitleStyle(qi)}>{q.label}</div>
                {q.services.length === 0 ? (
                  <div style={bodyStyle()}>- Nenhum serviço</div>
                ) : (
                  q.services.map((s, idx) =>
                    renderServiceBlock(s, idx, `${q.label}-${idx}-${s.id}`),
                  )
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
