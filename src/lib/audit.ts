import { createClient } from "@/lib/supabase/server";

interface AuditEntry {
  office_id?: string | null;
  user_id?: string | null;
  action: string;
  resource_type: string;
  resource_id?: string | null;
  details?: Record<string, unknown> | null;
}

export async function logAudit(entry: AuditEntry) {
  const supabase = await createClient();
  await supabase.from("audit_log").insert(entry);
}
