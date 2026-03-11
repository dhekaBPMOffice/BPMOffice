import { createClient } from "@/lib/supabase/server";
import { NovoEscritorioForm } from "./novo-escritorio-form";

export default async function NovoEscritorioPage() {
  const supabase = await createClient();

  const { data: plans } = await supabase
    .from("plans")
    .select("id, name")
    .eq("is_active", true)
    .order("name");

  return <NovoEscritorioForm plans={plans ?? []} />;
}
