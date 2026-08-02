"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { PageLayout } from "@/components/layout/page-layout";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Building2, Loader2, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OfficeCompanyProfile } from "@/types/database";
import {
  BUSINESS_MODEL_OPTIONS,
  COMPANY_SIZE_OPTIONS,
  CUSTOMER_TYPE_OPTIONS,
  INDUSTRY_SUGGESTIONS,
  OPERATION_SCOPE_OPTIONS,
  TRI_STATE_OPTIONS,
  profileToForm,
  type CompanyProfileFormInput,
} from "@/lib/estrategia/company-profile";
import { getOfficeCompanyProfile, saveOfficeCompanyProfile } from "./actions";

function toggleInList(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function CheckboxGroup({
  legend,
  options,
  selected,
  onChange,
}: {
  legend: string;
  options: readonly string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium leading-none">{legend}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <label
            key={option}
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded-lg border border-border/60 px-3 py-2 text-sm transition-colors",
              selected.includes(option) && "border-[var(--identity-primary)]/40 bg-[var(--identity-primary)]/[0.06]"
            )}
          >
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-border"
              checked={selected.includes(option)}
              onChange={() => onChange(toggleInList(selected, option))}
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function DadosEmpresaClient({
  initialProfile,
  initialOfficeName,
}: {
  initialProfile: OfficeCompanyProfile | null;
  initialOfficeName: string;
}) {
  const [form, setForm] = useState<CompanyProfileFormInput>(() =>
    profileToForm(initialProfile, initialOfficeName)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState(initialProfile?.updated_at ?? null);

  useEffect(() => {
    setForm(profileToForm(initialProfile, initialOfficeName));
    setUpdatedAt(initialProfile?.updated_at ?? null);
  }, [initialProfile, initialOfficeName]);

  function patch(partial: Partial<CompanyProfileFormInput>) {
    setForm((current) => ({ ...current, ...partial }));
    setSuccess(null);
    setError(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    const { profile, error: saveError } = await saveOfficeCompanyProfile(form);
    setSaving(false);

    if (saveError) {
      setError(saveError);
      return;
    }

    if (profile) {
      setForm(profileToForm(profile, initialOfficeName));
      setUpdatedAt(profile.updated_at);
    }
    setSuccess("Dados da empresa salvos com sucesso.");
  }

  return (
    <PageLayout
      title="Dados da Empresa"
      description="Cadastro institucional reutilizado na estratégia, na cadeia de valor e em fluxos com IA."
      iconName="Building2"
    >
      <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-6 pb-8">
        {error && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        {success && (
          <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-800 dark:text-emerald-200">
            {success}
          </p>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5 text-[var(--identity-primary)]" />
              Identificação
            </CardTitle>
            <CardDescription>
              Informações essenciais sobre a organização atendida pelo escritório.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="company_name" required>
                1. Qual é o nome da empresa?
              </Label>
              <Input
                id="company_name"
                value={form.company_name}
                onChange={(e) => patch({ company_name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website_url">2. Qual é o site da empresa?</Label>
              <Input
                id="website_url"
                type="url"
                placeholder="https://www.exemplo.com.br"
                value={form.website_url}
                onChange={(e) => patch({ website_url: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Pode ser usado pela IA como referência complementar (URL informada no cadastro).
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="main_industry" required>
                3. Qual é o principal ramo de atividade da empresa?
              </Label>
              <Input
                id="main_industry"
                list="industry-suggestions"
                value={form.main_industry}
                onChange={(e) => patch({ main_industry: e.target.value })}
                placeholder="Ex.: tecnologia, saúde, educação"
                required
              />
              <datalist id="industry-suggestions">
                {INDUSTRY_SUGGESTIONS.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Atuação e porte</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <CheckboxGroup
              legend="4. Qual é o modelo de atuação da empresa?"
              options={BUSINESS_MODEL_OPTIONS}
              selected={form.business_models}
              onChange={(business_models) => patch({ business_models })}
            />

            <div className="space-y-2">
              <Label htmlFor="company_size" required>
                5. Qual é o porte da empresa?
              </Label>
              <Select
                id="company_size"
                value={form.company_size}
                onChange={(e) =>
                  patch({ company_size: e.target.value as CompanyProfileFormInput["company_size"] })
                }
                required
              >
                <option value="">Selecione</option>
                {COMPANY_SIZE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
              <div className="grid gap-3 pt-2 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label htmlFor="employee_count" className="text-xs text-muted-foreground">
                    Colaboradores (opcional)
                  </Label>
                  <Input
                    id="employee_count"
                    type="number"
                    min={0}
                    value={form.employee_count ?? ""}
                    onChange={(e) =>
                      patch({
                        employee_count: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="units_count" className="text-xs text-muted-foreground">
                    Unidades (opcional)
                  </Label>
                  <Input
                    id="units_count"
                    type="number"
                    min={0}
                    value={form.units_count ?? ""}
                    onChange={(e) =>
                      patch({
                        units_count: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-1 sm:col-span-1">
                  <Label htmlFor="revenue_note" className="text-xs text-muted-foreground">
                    Faturamento (opcional)
                  </Label>
                  <Input
                    id="revenue_note"
                    value={form.revenue_note}
                    onChange={(e) => patch({ revenue_note: e.target.value })}
                    placeholder="Referência ou faixa"
                  />
                </div>
              </div>
            </div>

            <CheckboxGroup
              legend="6. Qual é a abrangência de atuação da empresa?"
              options={OPERATION_SCOPE_OPTIONS}
              selected={form.operation_scopes}
              onChange={(operation_scopes) => patch({ operation_scopes })}
            />

            <div className="space-y-2">
              <Label htmlFor="scope_locations">
                Em quais cidades, estados ou países a empresa atua?
              </Label>
              <Textarea
                id="scope_locations"
                rows={2}
                value={form.scope_locations}
                onChange={(e) => patch({ scope_locations: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Oferta e público</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="products_services" required>
                7. Quais são os principais produtos, serviços ou soluções oferecidos?
              </Label>
              <Textarea
                id="products_services"
                rows={4}
                value={form.products_services}
                onChange={(e) => patch({ products_services: e.target.value })}
                required
              />
            </div>

            <CheckboxGroup
              legend="8. Quem são os principais clientes, usuários ou públicos atendidos?"
              options={CUSTOMER_TYPE_OPTIONS}
              selected={form.customer_types}
              onChange={(customer_types) => patch({ customer_types })}
            />
            <div className="space-y-2">
              <Label htmlFor="customers_description">Complemento ou descrição</Label>
              <Textarea
                id="customers_description"
                rows={3}
                value={form.customers_description}
                onChange={(e) => patch({ customers_description: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Estrutura e regulação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="has_business_units" required>
                9. A empresa possui unidades de negócio, marcas, linhas ou operações distintas?
              </Label>
              <Select
                id="has_business_units"
                value={form.has_business_units}
                onChange={(e) =>
                  patch({
                    has_business_units: e.target.value as CompanyProfileFormInput["has_business_units"],
                    ...(e.target.value !== "yes" ? { business_units_detail: "" } : {}),
                  })
                }
                required
              >
                <option value="">Selecione</option>
                {TRI_STATE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>
            {form.has_business_units === "yes" && (
              <div className="space-y-2">
                <Label htmlFor="business_units_detail" required>
                  Quais são elas e o que cada uma oferece ou realiza?
                </Label>
                <Textarea
                  id="business_units_detail"
                  rows={4}
                  value={form.business_units_detail}
                  onChange={(e) => patch({ business_units_detail: e.target.value })}
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="mission">10. Qual é a missão ou o propósito da empresa? (opcional)</Label>
              <Textarea
                id="mission"
                rows={3}
                value={form.mission}
                onChange={(e) => patch({ mission: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="has_regulation" required>
                11. A empresa está sujeita a órgãos reguladores, normas ou exigências específicas?
              </Label>
              <Select
                id="has_regulation"
                value={form.has_regulation}
                onChange={(e) =>
                  patch({
                    has_regulation: e.target.value as CompanyProfileFormInput["has_regulation"],
                    ...(e.target.value !== "yes" ? { regulation_detail: "" } : {}),
                  })
                }
                required
              >
                <option value="">Selecione</option>
                {TRI_STATE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>
            {form.has_regulation === "yes" && (
              <div className="space-y-2">
                <Label htmlFor="regulation_detail" required>
                  Quais órgãos, normas, certificações ou exigências influenciam a atuação?
                </Label>
                <Textarea
                  id="regulation_detail"
                  rows={3}
                  value={form.regulation_detail}
                  onChange={(e) => patch({ regulation_detail: e.target.value })}
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="other_info">12. Há alguma outra informação importante sobre a empresa?</Label>
              <Textarea
                id="other_info"
                rows={3}
                value={form.other_info}
                onChange={(e) => patch({ other_info: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            {updatedAt ? (
              <span>Última atualização: {new Date(updatedAt).toLocaleString("pt-BR")}</span>
            ) : (
              <span>Cadastro ainda não salvo.</span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/escritorio/estrategia"
              className={buttonVariants({ variant: "outline" })}
            >
              Voltar à Estratégia
            </Link>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando…
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Salvar dados
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </PageLayout>
  );
}
