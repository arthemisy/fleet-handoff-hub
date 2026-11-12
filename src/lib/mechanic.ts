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

/** Lowercase, no accents, no punctuation: "Manutenção", "manutencao" and "MANUTENÇÃO" become the same thing. */
const flat = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ");

/**
 * Anything that says the vehicle is being repaired or is at the shop:
 * mecânica, oficina, manutenção (also "manutensao"), conserto/concerto, reparo...
 */
const IN_RE =
  /(mecanik|mecanic|oficin|manuten|manutens|manutenc|consert|concert|conssert|reparac|reparo|reparou|reparar)/;

/** Words used to fuzzy-match typos ("consserto", "mecanina", "ofisina", "manutencom"...). */
const IN_KEYS = ["mecanica", "oficina", "manutencao", "conserto", "concerto", "reparacao"];

/** Message says the car LEFT the mechanic ("pegou da mecânica", "saiu da oficina", "consertado"...). */
const LEFT_RE =
  /(consertad|concertad|reparad|saiu (da|de|do)|said[ao] (da|de|do)|retornou (da|de|do)|voltou (da|de|do)|retirad[ao] (da|de|do)|retirou( \w+){0,3} (da|de|do)|pegou( \w+){0,3} (da|de|do)|liberad)/;

/** Levenshtein distance, same helper style as plates.ts. */
function distance(a: string, b: string) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0]![j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i]![j] = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length]![b.length]!;
}

/** Catches misspelled words: "consserto", "manutençom", "mecanina", "ofisina". */
function fuzzyIn(flatText: string) {
  for (const w of flatText.split(" ")) {
    if (w.length < 6 || w.length > 13) continue;
    for (const key of IN_KEYS) {
      if (Math.abs(w.length - key.length) > 2) continue;
      if (distance(w, key) <= 2) return true;
    }
  }
  return false;
}

/** Whether a text says the vehicle is in maintenance / at the shop. */
export function saysRepair(text: string) {
  const f = flat(text);
  return IN_RE.test(f) || fuzzyIn(f);
}

/** Whether a text says the vehicle already came back. */
export function saysLeftRepair(text: string) {
  return LEFT_RE.test(flat(text));
}

const NAME_AFTER_RE = /\b(?:mec[âa]nic[ao]|oficin[ai])[ \t]+([A-ZÀ-ÿ][\wÀ-ÿ]*)/i;
const NAME_BEFORE_RE = /([A-ZÀ-ÿ][\wÀ-ÿ]*)[ \t]+(?:mec[âa]nic[ao]|oficin[ai])\b/i;

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
    if (saysLeftRepair(text)) return { state: false, at, date };
    if (saysRepair(text)) return { state: shopName(text) ?? true, at, date };
  }
  if (v.obra && saysRepair(v.obra)) return { state: shopName(v.obra) ?? true, at, date };
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
  return saysRepair(text) && !saysLeftRepair(text);
}
