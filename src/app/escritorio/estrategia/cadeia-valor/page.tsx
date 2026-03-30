import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dbRowToProcessItem } from "@/lib/value-chain-mappers";
import { CadeiaValorClient } from "./cadeia-valor-client";
import type { OfficeProcessBpmPhase } from "@/types/database";

export default async function CadeiaValorPage() {
  const profile = await requireRole(["leader"]);
  const supabase = await createClient();

  if (!profile.office_id) {
    return (
      <div className="p-6 text-destructive">
        Escritório não encontrado.
      </div>
    );
  }

  const { data } = await supabase
    .from("office_processes")
    .select(`
      *,
      office_process_bpm_phases (*)
    `)
    .eq("office_id", profile.office_id)
    .or("value_chain_id.not.is.null,vc_macroprocesso.not.is.null,creation_source.eq.created_in_value_chain")
    .order("updated_at", { ascending: false });

  const rows = (data ?? []) as Array<
    Record<string, unknown> & {
      office_process_bpm_phases: OfficeProcessBpmPhase[] | null;
    }
  >;

  const initialProcesses = rows.map((row) =>
    dbRowToProcessItem(row, row.office_process_bpm_phases ?? [])
  );

  return <CadeiaValorClient initialProcesses={initialProcesses} />;
}
