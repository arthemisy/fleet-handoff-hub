import { normPlate } from "./fleet";

type VehicleLike = {
  plate: string;
  obra?: string | null;
  /** Manual button: "in" (sent to repair) or "out" (fixed); wins over messages older than it. */
  mechanic_manual?: string | null;
  mechanic_shop?: string | null;
  mechanic_changed_at?: string | null;
};
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
  const stop = /^(na|no|da|do|de|a|o|em|para|pra|pela|pelo|e|com)$/i;
  for (const re of [NAME_AFTER_RE, NAME_BEFORE_RE]) {
    const m = text.match(re)?.[1];
    if (m && !stop.test(m)) return m;
  }
  return null;
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
  const auto = fromMessages(v, checklists);
  if (v.mechanic_manual && v.mechanic_changed_at && (!auto.at || v.mechanic_changed_at >= auto.at)) {
    return v.mechanic_manual === "in" ? (v.mechanic_shop || true) : false;
  }
  return auto.state;
}

function fromMessages(v: VehicleLike, checklists: ChecklistLike[]): { state: string | boolean; at: string | null } {
  const mine = checklists
    .filter((c) => normPlate(c.plate) === normPlate(v.plate))
    .sort((a, b) =>
      (b.checked_date ?? b.created_at ?? "").localeCompare(a.checked_date ?? a.created_at ?? ""),
    );
  // newest checklist with an actual message (notes/raw text) wins; obra alone doesn't clear the flag
  const last = mine.find((c) => c.notes || c.raw_text);
  const at = last?.created_at ?? null;
  if (v.obra && RE.test(v.obra)) return { state: shopName(v.obra) ?? true, at };
  if (!last) return { state: false, at };
  const text = [last.notes, last.raw_text, last.obra].filter(Boolean).join("\n");
  if (!RE.test(text) || /consertad|saiu da (mec|oficina)|retornou da/i.test(text)) return { state: false, at };
  return { state: shopName(text) ?? true, at };
}
