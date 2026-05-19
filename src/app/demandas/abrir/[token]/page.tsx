import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { PublicDemandForm } from "./public-demand-form";

export default async function AbrirDemandaPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createServiceClient();

  const { data: form } = await supabase
    .from("office_demand_forms")
    .select("id, title, description, public_token, is_active, offices ( name )")
    .eq("public_token", token)
    .eq("is_active", true)
    .maybeSingle();

  if (!form) {
    notFound();
  }

  const [{ data: sections }, { data: questions }] = await Promise.all([
    supabase
      .from("office_demand_form_sections")
      .select("id, title, subtitle, description, sort_order")
      .eq("office_demand_form_id", form.id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("office_demand_form_questions")
      .select(`
        id,
        section_id,
        prompt,
        helper_text,
        question_type,
        is_required,
        demand_field_key,
        sort_order,
        office_demand_form_options (
          id,
          label,
          value,
          helper_text,
          sort_order,
          is_active
        )
      `)
      .eq("office_demand_form_id", form.id)
      .order("sort_order", { ascending: true }),
  ]);

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <PublicDemandForm
          token={token}
          form={form}
          sections={sections ?? []}
          questions={questions ?? []}
        />
      </div>
    </main>
  );
}
