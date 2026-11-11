import { normPlate } from "./fleet";

type VehicleLike = { plate: string; obra?: string | null };
type ChecklistLike = {
  plate: string;
  obra?: string | null;
  notes?: string | null;
  raw_text?: string | null;
  checked_date?: string | null;
  created_at?: string | null;
};

const RE = /mec[âa]nica|oficina/i;
const NAME_AFTER_RE = /mec[âa]nica\s+([A-ZÀ-ÿ][\wÀ-ÿ]*)/i;
const NAME_BEFORE_RE = /([A-ZÀ-ÿ][\wÀ-ÿ]*)\s+mec[âa]nica/i;

/** Extracts the mechanic shop name ("Mecânica Maurício" or "Maurício Mecânica" → "Maurício"). */
function shopName(text: string): string | null {
  const m = text.match(NAME_AFTER_RE) ?? text.match(NAME_BEFORE_RE);
  return m?.[1] ?? null;
}

/**
 * Detects whether a vehicle is currently at the mechanic, based on its obra
 * or the most recent checklist message that carries any text for that plate.
 * Returns the shop name when known, true when only the fact is known, false otherwise.
 */
export function inMechanic(
  v: VehicleLike,
  checklists: ChecklistLike[],
): string | boolean {
  if (v.obra && RE.test(v.obra)) return shopName(v.obra) ?? true;
  const mine = checklists
    .filter((c) => normPlate(c.plate) === normPlate(v.plate))
    .sort((a, b) =>
      (b.checked_date ?? b.created_at ?? "").localeCompare(a.checked_date ?? a.created_at ?? ""),
    );
  // newest checklist with an actual message (notes/raw text) wins; obra alone doesn't clear the flag
  const last = mine.find((c) => c.notes || c.raw_text);
  if (!last) return false;
  const text = [last.notes, last.raw_text, last.obra].filter(Boolean).join("\n");
  if (!RE.test(text)) return false;
  return shopName(text) ?? true;
}
