import type { OfficeCompanyProfile } from "@/types/database";

export type CompanySize = "micro" | "small" | "medium" | "large" | "unknown";
export type TriStateAnswer = "yes" | "no" | "unknown";

export const BUSINESS_MODEL_OPTIONS = [
  "Indústria",
  "Comércio",
  "Prestação de serviços",
  "Distribuição",
  "Operação de infraestrutura",
  "Plataforma ou marketplace",
  "Administração pública",
  "Terceiro setor",
  "Outro",
] as const;

export const COMPANY_SIZE_OPTIONS: { value: CompanySize; label: string }[] = [
  { value: "micro", label: "Microempresa" },
  { value: "small", label: "Pequena empresa" },
  { value: "medium", label: "Média empresa" },
  { value: "large", label: "Grande empresa" },
  { value: "unknown", label: "Não sei informar" },
];

export const OPERATION_SCOPE_OPTIONS = [
  "Local",
  "Regional",
  "Nacional",
  "Internacional",
] as const;

export const CUSTOMER_TYPE_OPTIONS = [
  "Consumidor final",
  "Outras empresas",
  "Órgãos públicos",
  "Público interno",
  "Franqueados",
  "Distribuidores",
  "Comunidades",
  "Outros",
] as const;

export const TRI_STATE_OPTIONS: { value: TriStateAnswer; label: string }[] = [
  { value: "yes", label: "Sim" },
  { value: "no", label: "Não" },
  { value: "unknown", label: "Não sei informar" },
];

export const INDUSTRY_SUGGESTIONS = [
  "Energia",
  "Educação",
  "Indústria têxtil",
  "Tecnologia",
  "Saúde",
  "Serviços financeiros",
  "Varejo",
  "Construção civil",
  "Agroindústria",
  "Logística",
  "Telecomunicações",
] as const;

export type CompanyProfileFormInput = {
  company_name: string;
  website_url: string;
  main_industry: string;
  business_models: string[];
  company_size: CompanySize | "";
  employee_count: number | null;
  units_count: number | null;
  revenue_note: string;
  operation_scopes: string[];
  scope_locations: string;
  products_services: string;
  customer_types: string[];
  customers_description: string;
  has_business_units: TriStateAnswer | "";
  business_units_detail: string;
  mission: string;
  has_regulation: TriStateAnswer | "";
  regulation_detail: string;
  other_info: string;
};

export function emptyCompanyProfileForm(officeName = ""): CompanyProfileFormInput {
  return {
    company_name: officeName,
    website_url: "",
    main_industry: "",
    business_models: [],
    company_size: "",
    employee_count: null,
    units_count: null,
    revenue_note: "",
    operation_scopes: [],
    scope_locations: "",
    products_services: "",
    customer_types: [],
    customers_description: "",
    has_business_units: "",
    business_units_detail: "",
    mission: "",
    has_regulation: "",
    regulation_detail: "",
    other_info: "",
  };
}

export function profileToForm(
  profile: OfficeCompanyProfile | null,
  officeName: string
): CompanyProfileFormInput {
  if (!profile) return emptyCompanyProfileForm(officeName);
  return {
    company_name: profile.company_name || officeName,
    website_url: profile.website_url ?? "",
    main_industry: profile.main_industry ?? "",
    business_models: profile.business_models ?? [],
    company_size: (profile.company_size as CompanySize) ?? "",
    employee_count: profile.employee_count,
    units_count: profile.units_count,
    revenue_note: profile.revenue_note ?? "",
    operation_scopes: profile.operation_scopes ?? [],
    scope_locations: profile.scope_locations ?? "",
    products_services: profile.products_services ?? "",
    customer_types: profile.customer_types ?? [],
    customers_description: profile.customers_description ?? "",
    has_business_units: (profile.has_business_units as TriStateAnswer) ?? "",
    business_units_detail: profile.business_units_detail ?? "",
    mission: profile.mission ?? "",
    has_regulation: (profile.has_regulation as TriStateAnswer) ?? "",
    regulation_detail: profile.regulation_detail ?? "",
    other_info: profile.other_info ?? "",
  };
}

function triStateLabel(value: TriStateAnswer | null | undefined): string {
  if (!value) return "";
  return TRI_STATE_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

function companySizeLabel(value: CompanySize | null | undefined): string {
  if (!value) return "";
  return COMPANY_SIZE_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export function isCompanyProfileComplete(profile: OfficeCompanyProfile | null): boolean {
  if (!profile) return false;
  if (!profile.company_name?.trim()) return false;
  if (!profile.main_industry?.trim()) return false;
  if (!profile.business_models?.length) return false;
  if (!profile.company_size) return false;
  if (!profile.operation_scopes?.length) return false;
  if (!profile.products_services?.trim()) return false;
  if (!profile.customer_types?.length && !profile.customers_description?.trim()) return false;
  if (!profile.has_business_units) return false;
  if (profile.has_business_units === "yes" && !profile.business_units_detail?.trim()) return false;
  if (!profile.has_regulation) return false;
  if (profile.has_regulation === "yes" && !profile.regulation_detail?.trim()) return false;
  return true;
}

export function validateCompanyProfileForm(form: CompanyProfileFormInput): string | null {
  if (!form.company_name.trim()) return "Informe o nome da empresa.";
  if (!form.main_industry.trim()) return "Informe o principal ramo de atividade.";
  if (form.business_models.length === 0) return "Selecione ao menos um modelo de atuação.";
  if (!form.company_size) return "Informe o porte da empresa.";
  if (form.operation_scopes.length === 0) return "Selecione ao menos uma abrangência de atuação.";
  if (!form.products_services.trim()) {
    return "Descreva os principais produtos, serviços ou soluções.";
  }
  if (form.customer_types.length === 0 && !form.customers_description.trim()) {
    return "Indique os principais clientes ou públicos atendidos.";
  }
  if (!form.has_business_units) {
    return "Informe se a empresa possui unidades de negócio ou operações distintas.";
  }
  if (form.has_business_units === "yes" && !form.business_units_detail.trim()) {
    return "Descreva as unidades de negócio ou operações distintas.";
  }
  if (!form.has_regulation) {
    return "Informe se a empresa está sujeita a órgãos reguladores ou normas específicas.";
  }
  if (form.has_regulation === "yes" && !form.regulation_detail.trim()) {
    return "Descreva os órgãos, normas ou exigências aplicáveis.";
  }
  if (form.website_url.trim()) {
    try {
      const url = form.website_url.trim().startsWith("http")
        ? form.website_url.trim()
        : `https://${form.website_url.trim()}`;
      new URL(url);
    } catch {
      return "Informe um site válido (URL).";
    }
  }
  return null;
}

export function formatCompanyProfileForAI(profile: OfficeCompanyProfile | null): string {
  if (!profile) return "";

  const lines: string[] = ["=== Dados da Empresa ==="];

  if (profile.company_name?.trim()) lines.push(`Nome: ${profile.company_name.trim()}`);
  if (profile.website_url?.trim()) lines.push(`Site: ${profile.website_url.trim()}`);
  if (profile.main_industry?.trim()) lines.push(`Ramo principal: ${profile.main_industry.trim()}`);
  if (profile.business_models?.length) {
    lines.push(`Modelos de atuação: ${profile.business_models.join(", ")}`);
  }
  const size = companySizeLabel(profile.company_size as CompanySize);
  if (size) lines.push(`Porte: ${size}`);
  if (profile.employee_count != null) lines.push(`Colaboradores (aprox.): ${profile.employee_count}`);
  if (profile.units_count != null) lines.push(`Unidades (aprox.): ${profile.units_count}`);
  if (profile.revenue_note?.trim()) lines.push(`Faturamento (referência): ${profile.revenue_note.trim()}`);
  if (profile.operation_scopes?.length) {
    lines.push(`Abrangência: ${profile.operation_scopes.join(", ")}`);
  }
  if (profile.scope_locations?.trim()) {
    lines.push(`Locais de atuação: ${profile.scope_locations.trim()}`);
  }
  if (profile.products_services?.trim()) {
    lines.push(`Produtos/serviços: ${profile.products_services.trim()}`);
  }
  if (profile.customer_types?.length) {
    lines.push(`Públicos/clientes: ${profile.customer_types.join(", ")}`);
  }
  if (profile.customers_description?.trim()) {
    lines.push(`Detalhe de clientes: ${profile.customers_description.trim()}`);
  }
  const units = triStateLabel(profile.has_business_units as TriStateAnswer);
  if (units) lines.push(`Unidades de negócio distintas: ${units}`);
  if (profile.business_units_detail?.trim()) {
    lines.push(`Detalhe unidades: ${profile.business_units_detail.trim()}`);
  }
  if (profile.mission?.trim()) lines.push(`Missão/propósito: ${profile.mission.trim()}`);
  const reg = triStateLabel(profile.has_regulation as TriStateAnswer);
  if (reg) lines.push(`Sujeita a reguladores/normas: ${reg}`);
  if (profile.regulation_detail?.trim()) {
    lines.push(`Regulação: ${profile.regulation_detail.trim()}`);
  }
  if (profile.other_info?.trim()) lines.push(`Outras informações: ${profile.other_info.trim()}`);

  return lines.length > 1 ? lines.join("\n") : "";
}

export function deriveAiQuestionPrefill(
  profile: OfficeCompanyProfile | null
): Partial<Record<string, string>> {
  if (!profile) return {};
  const customers = [
    ...(profile.customer_types ?? []),
    profile.customers_description?.trim() ?? "",
  ]
    .filter(Boolean)
    .join("; ");

  return {
    produtosEscopo: profile.products_services?.trim() ?? "",
    publicosEscopo: customers,
  };
}

export type ParsedValueChainSuggestion = {
  tipo: string;
  macroprocesso: string;
  niveis: string[];
};

/** Interpreta resposta da IA (JSON array ou texto) em sugestões de macroprocessos. */
export function parseValueChainAiResponse(text: string): ParsedValueChainSuggestion[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const jsonMatch = trimmed.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]) as unknown;
      if (Array.isArray(parsed)) {
        const rows: ParsedValueChainSuggestion[] = [];
        for (const item of parsed) {
          if (!item || typeof item !== "object") continue;
          const obj = item as Record<string, unknown>;
          const macro = String(obj.macroprocesso ?? obj.macro ?? "").trim();
          if (!macro) continue;
          let tipo = String(obj.tipo ?? "Primário").trim();
          if (tipo !== "Primário" && tipo !== "Apoio" && tipo !== "Gerencial") {
            tipo = "Primário";
          }
          let niveis: string[] = [];
          if (Array.isArray(obj.niveis)) {
            niveis = obj.niveis.map((n) => String(n).trim()).filter(Boolean);
          } else if (typeof obj.niveis === "string") {
            niveis = obj.niveis.split(/[,;|]/).map((n) => n.trim()).filter(Boolean);
          }
          if (niveis.length === 0) niveis = [macro];
          rows.push({ tipo, macroprocesso: macro, niveis });
        }
        if (rows.length > 0) return rows;
      }
    } catch {
      /* fallback abaixo */
    }
  }

  const lines = trimmed
    .split("\n")
    .map((l) => l.replace(/^[-*•\d.)]+\s*/, "").trim())
    .filter(Boolean);

  return lines.slice(0, 12).map((line) => ({
    tipo: "Primário",
    macroprocesso: line.slice(0, 120),
    niveis: [line.slice(0, 120)],
  }));
}
