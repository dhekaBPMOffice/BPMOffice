import { createServiceClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { EditarPlanoForm } from "./editar-plano-form";

export default async function EditarPlanoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServiceClient();

  const { data: plan, error } = await supabase
    .from("plans")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !plan) {
    notFound();
  }

  return <EditarPlanoForm plan={plan} />;
}
