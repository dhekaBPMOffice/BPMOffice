import type { ServicePortfolio } from "@/app/escritorio/estrategia/portfolio/actions";

/**
 * Utilitários de exportação do portfólio (PDF/DOCX e pré-visualização admin).
 * Sem origem nem níveis de demanda/capacidade nos documentos.
 * Ao alterar rótulos, atualize também `app/admin/modelos-documento/document-preview.tsx`.
 */
export function formatPortfolioScalar(value: string | null | undefined): string {
  const v = (value ?? "").trim();
  return v === "" ? "—" : v;
}

/** Linhas exportáveis por serviço (sem origem nem níveis de demanda/capacidade). */
export function getPortfolioFieldRows(service: ServicePortfolio): { label: string; value: string }[] {
  return [
    { label: "Descrição", value: formatPortfolioScalar(service.description) },
    { label: "Metodologia", value: formatPortfolioScalar(service.methodology) },
    { label: "Entregas", value: formatPortfolioScalar(service.deliverables) },
    { label: "Recursos", value: formatPortfolioScalar(service.resources) },
    { label: "Equipe", value: formatPortfolioScalar(service.team) },
    { label: "Precificação", value: formatPortfolioScalar(service.pricing) },
    { label: "Marketing", value: formatPortfolioScalar(service.marketing) },
  ];
}

/** Normaliza qualquer objeto de serviço (completo ou parcial) para exportação. */
export function normalizePortfolioService(input: unknown): ServicePortfolio {
  const o = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  return {
    id: String(o.id ?? ""),
    office_id: String(o.office_id ?? ""),
    base_service_id: o.base_service_id != null ? String(o.base_service_id) : null,
    name: typeof o.name === "string" ? o.name : "—",
    description: o.description != null ? String(o.description) : null,
    methodology: o.methodology != null ? String(o.methodology) : null,
    deliverables: o.deliverables != null ? String(o.deliverables) : null,
    resources: o.resources != null ? String(o.resources) : null,
    team: o.team != null ? String(o.team) : null,
    pricing: o.pricing != null ? String(o.pricing) : null,
    marketing: o.marketing != null ? String(o.marketing) : null,
    demand_level: o.demand_level != null ? String(o.demand_level) : null,
    capacity_level: o.capacity_level != null ? String(o.capacity_level) : null,
    is_custom: Boolean(o.is_custom),
    created_at: String(o.created_at ?? ""),
    updated_at: String(o.updated_at ?? ""),
  };
}
