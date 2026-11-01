import type { ParsedChecklist } from "@/lib/checklist-ai.functions";
import type { DraftChecklistItem } from "./checklist-template";

/** A conference being filled in: the read fields plus the points still waiting for OK/X. */
export type ChecklistDraft = Omit<ParsedChecklist, "items"> & { items: DraftChecklistItem[]; gestor?: string; funcionario?: string };

const blank: Omit<ParsedChecklist, "items"> = {
  plate: "", model: "", responsible: "", obra: "",
  checked_date: null, checked_time: null,
  km: null, next_belt_km: null, next_oil_km: null, notes: "",
};

const pad = (n: number) => String(n).padStart(2, "0");

/** A new conference opens blank except Data and Hora, which start at the phone's current moment (the handover is happening now). */
export const freshChecklist = (now: Date = new Date()): ChecklistDraft => ({
  ...blank,
  gestor: "",
  funcionario: "",
  checked_date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
  checked_time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
  items: [],
});
