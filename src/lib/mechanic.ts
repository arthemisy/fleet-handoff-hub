import { normPlate } from "./fleet";

type VehicleLike = {
  plate: string;
  obra?: string | null;
  /** Manual button: "in" (sent to repair) or "out" (fixed); wins over messages older than it. */
  mechanic_manual?: string | null;
  mechanic_shop?: string | null;
  mechanic_changed_at?: string | null;
  mechanic_since?: string | null;
};
type ChecklistLike = {
  plate: string;
  obra?: string | null;
  notes?: string | null;
  raw_text?: string | null;
  checked_date?: string | null;
  checked_at?: string | null;
  created_at?: string | null;
};

const RE = /mec[âa]nica|oficina/i;
/** Message says the car LEFT the mechanic ("pegou da mecânica", "saiu da oficina", "consertado"...). */
const LEFT_RE = /consertad|saiu da|retornou da|voltou da|pegou( [\wÀ-ÿ]+){0,3} da|retirou( [\wÀ-ÿ]+){0,3} da|liberad/i;
const NAME_AFTER_RE = /mec[âa]nica[ \t]+([A-ZÀ-ÿ][\wÀ-ÿ]*)/i;
const NAME_BEFORE_RE = /([A-ZÀ-ÿ][\wÀ-ÿ]*)[ \t]+mec[âa]nica/i;

/** Extracts the mechanic shop name ("Mecânica Maurício" or "Maurício Mecânica" → "Maurício"). */
function shopName(text: string): string | null {
  const stop = /^(na|no|da|do|de|a|o|em|para|pra|pela|pelo|e|com|data|local|km|hor[aá]rio)$/i;
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

/** Since when the car is at the mechanic (YYYY-MM-DD): the chosen date on the button, or the checklist's date. */
export function mechanicSince(v: VehicleLike, checklists: ChecklistLike[]): string | null {
  if (!inMechanic(v, checklists)) return null;
  const auto = fromMessages(v, checklists);
  if (v.mechanic_manual === "in" && v.mechanic_changed_at && (!auto.at || v.mechanic_changed_at >= auto.at))
    return v.mechanic_since ?? v.mechanic_changed_at.slice(0, 10);
  return auto.date;
}

function fromMessages(v: VehicleLike, checklists: ChecklistLike[]): { state: string | boolean; at: string | null; date: string | null } {
  const mine = checklists
    .filter((c) => normPlate(c.plate) === normPlate(v.plate))
    .sort((a, b) =>
      dayOf(b).localeCompare(dayOf(a)) || (b.created_at ?? "").localeCompare(a.created_at ?? ""),
    );
  // newest checklist with an actual message (notes/raw text) wins; obra alone doesn't clear the flag
  const last = mine.find((c) => c.notes || c.raw_text);
  const at = last?.created_at ?? null;
  const date = last ? (last.checked_date ?? legacyDate(last.checked_at) ?? last.created_at?.slice(0, 10) ?? null) : null;
  // the newest message wins: if it says the car left the mechanic, a stale "Mecânica ..." obra doesn't re-flag it
  if (last) {
    const text = [last.notes, last.raw_text, last.obra].filter(Boolean).join("\n");
    if (LEFT_RE.test(text)) return { state: false, at, date };
    if (RE.test(text)) return { state: shopName(text) ?? true, at, date };
  }
  if (v.obra && RE.test(v.obra)) return { state: shopName(v.obra) ?? true, at, date };
  return { state: false, at, date };
}

/** Old checklists keep the date as typed ("15/10/26 11:40"). */
function legacyDate(t?: string | null) {
  const m = t?.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (!m) return null;
  const y = m[3]!.length === 2 ? `20${m[3]}` : m[3];
  return `${y}-${m[2]!.padStart(2, "0")}-${m[1]!.padStart(2, "0")}`;
}

export const dayOf = (c: ChecklistLike) => c.checked_date ?? legacyDate(c.checked_at) ?? c.created_at?.slice(0, 10) ?? "";

/** Whether one checklist message says the car is at the mechanic (null when it has no message). */
export function mentionsMechanic(c: ChecklistLike): boolean | null {
  if (!c.notes && !c.raw_text) return null;
  const text = [c.notes, c.raw_text, c.obra].filter(Boolean).join("\n");
  return RE.test(text) && !LEFT_RE.test(text);
}
