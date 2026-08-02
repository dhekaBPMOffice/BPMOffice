"use server";

import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import type { OfficeCompanyProfile } from "@/types/database";
import {
  type CompanyProfileFormInput,
  validateCompanyProfileForm,
} from "@/lib/estrategia/company-profile";
import { fetchOfficeCompanyProfile } from "@/lib/estrategia/office-company-profile-server";

const REVALIDATE_PATHS = [
  "/escritorio/estrategia/dados-empresa",
  "/escritorio/estrategia/cadeia-valor",
];

function normalizeWebsiteUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withScheme = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
  return withScheme;
}

function formToRow(form: CompanyProfileFormInput, officeId: string) {
  return {
    office_id: officeId,
    company_name: form.company_name.trim(),
    website_url: normalizeWebsiteUrl(form.website_url),
    main_industry: form.main_industry.trim() || null,
    business_models: form.business_models,
    company_size: form.company_size || null,
    employee_count: form.employee_count,
    units_count: form.units_count,
    revenue_note: form.revenue_note.trim() || null,
    operation_scopes: form.operation_scopes,
    scope_locations: form.scope_locations.trim() || null,
    products_services: form.products_services.trim() || null,
    customer_types: form.customer_types,
    customers_description: form.customers_description.trim() || null,
    has_business_units: form.has_business_units || null,
    business_units_detail: form.business_units_detail.trim() || null,
    mission: form.mission.trim() || null,
    has_regulation: form.has_regulation || null,
    regulation_detail: form.regulation_detail.trim() || null,
    other_info: form.other_info.trim() || null,
  };
}

export async function getOfficeCompanyProfile(): Promise<{
  profile: OfficeCompanyProfile | null;
  officeName: string;
  error: string | null;
}> {
  return fetchOfficeCompanyProfile();
}

export async function saveOfficeCompanyProfile(
  form: CompanyProfileFormInput
): Promise<{ profile: OfficeCompanyProfile | null; error: string | null }> {
  const validationError = validateCompanyProfileForm(form);
  if (validationError) return { profile: null, error: validationError };

  const supabase = await createClient();
  const authProfile = await getProfile();
  if (!authProfile.office_id) {
    return { profile: null, error: "Escritório não encontrado." };
  }

  const payload = formToRow(form, authProfile.office_id);

  const { data: existing } = await supabase
    .from("office_company_profiles")
    .select("id")
    .eq("office_id", authProfile.office_id)
    .maybeSingle();

  let data: OfficeCompanyProfile | null = null;
  let errorMessage: string | null = null;

  if (existing?.id) {
    const { data: updated, error } = await supabase
      .from("office_company_profiles")
      .update(payload)
      .eq("id", existing.id)
      .select("*")
      .single();
    data = updated as OfficeCompanyProfile | null;
    errorMessage = error?.message ?? null;
  } else {
    const { data: inserted, error } = await supabase
      .from("office_company_profiles")
      .insert(payload)
      .select("*")
      .single();
    data = inserted as OfficeCompanyProfile | null;
    errorMessage = error?.message ?? null;
  }

  if (errorMessage || !data) {
    const hint =
      errorMessage &&
      (errorMessage.includes("office_company_profiles") ||
        errorMessage.toLowerCase().includes("does not exist"))
        ? " Execute a migration 047_office_company_profile.sql no Supabase."
        : "";
    return {
      profile: null,
      error: `${errorMessage ?? "Não foi possível salvar."}${hint}`,
    };
  }

  try {
    await logAudit({
      office_id: authProfile.office_id,
      user_id: authProfile.id,
      action: existing?.id ? "update" : "create",
      resource_type: "office_company_profile",
      resource_id: data.id,
      details: { company_name: data.company_name },
    });
  } catch {
    // Persistência principal já concluída; falha de auditoria não deve derrubar a UI.
  }

  for (const path of REVALIDATE_PATHS) {
    revalidatePath(path);
  }

  return { profile: data, error: null };
}
