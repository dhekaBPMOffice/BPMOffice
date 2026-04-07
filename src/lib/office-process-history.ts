import { BPM_PHASE_LABELS, BPM_PHASE_SLUGS } from "@/lib/bpm-phases";
import { OFFICE_PROCESS_STATUS_META } from "@/lib/processes";
import type { OfficeProcessStatus } from "@/types/database";

const EVENT_TYPE_LABELS: Record<string, string> = {
  created_from_questionnaire: "Inclusão pelo questionário",
  created_manual: "Adição manual",
  updated: "Atualização",
  bpm_phase_updated: "Fase BPM",
  checklist_item_added: "Checklist",
  checklist_item_updated: "Checklist",
  attachment_added: "Anexo",
};

const OFFICE_STATUSES = Object.keys(OFFICE_PROCESS_STATUS_META) as OfficeProcessStatus[];

/** Rótulo em português para o tipo de evento (chave interna continua em inglês no banco). */
export function getOfficeProcessEventTypeLabel(eventType: string): string {
  return EVENT_TYPE_LABELS[eventType] ?? eventType;
}

/**
 * Substitui valores técnicos em inglês nas descrições já gravadas (status, fases BPM, etc.).
 */
export function localizeOfficeProcessHistoryDescription(description: string): string {
  let out = description;
  for (const s of OFFICE_STATUSES) {
    const label = OFFICE_PROCESS_STATUS_META[s].label;
    out = out.replace(new RegExp(`\\b${escapeRegExp(s)}\\b`, "g"), label);
  }
  for (const slug of BPM_PHASE_SLUGS) {
    const label = BPM_PHASE_LABELS[slug];
    out = out.replace(new RegExp(`\\b${escapeRegExp(slug)}\\b`, "g"), label);
  }
  return out;
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
