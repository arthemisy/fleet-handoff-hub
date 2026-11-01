import type { ParsedChecklist } from "@/lib/checklist-ai.functions";
import type { DraftChecklistItem } from "./checklist-template";

/** A conference being filled in: the read fields plus the points still waiting for OK/X. */
export type ChecklistDraft = Omit<ParsedChecklist, "items"> & { items: DraftChecklistItem[] };

const blank: Omit<ParsedChecklist, "items"> = {
  plate: "", model: "", responsible: "", obra: "",
  checked_date: null, checked_time: null,
  km: null, next_belt_km: null, next_oil_km: null, notes: "",
};

/** A new conference opens with every field empty — nothing is filled in for the person typing. */
export const freshChecklist = (): ChecklistDraft => ({ ...blank, items: [] });
