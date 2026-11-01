import { normPlate, type Fleet } from "./fleet";

/** A plate the app already knows, with whatever context makes the car recognisable. */
export type PlateCandidate = {
  key: string;
  plate: string;
  model: string | null;
  manager: string | null;
  obra: string | null;
  source: "frota" | "conferência" | "manutenção";
  linked: boolean;
  last: string | null;
};

/** ABC1234 / ABC1D23 -> ABC-1234 / ABC-1D23. Anything odder is shown as it was typed. */
export const formatPlate = (p: string) => {
  const n = normPlate(p);
  return n.length === 7 ? `${n.slice(0, 3)}-${n.slice(3)}` : p.trim().toUpperCase();
};

const managerName = (f: Fleet, id: string | null) => f.managers.find((m) => m.id === id)?.name ?? null;

/** Newest conference date seen for each plate, so the list can open with the cars in use. */
function lastCheck(f: Fleet) {
  const out = new Map<string, string>();
  for (const c of f.checklists) {
    const k = normPlate(c.plate);
    if (!k) continue;
    const when = (c.checked_date ?? c.checked_at ?? "").slice(0, 10);
    if (when > (out.get(k) ?? "")) out.set(k, when);
  }
  return out;
}

/** Every plate known to the app: the fleet first, then plates seen only in saved conferences or in the maintenance sheet. */
export function plateCandidates(f?: Fleet): PlateCandidate[] {
  if (!f) return [];
  const last = lastCheck(f);
  const seen = new Set<string>();
  const out: PlateCandidate[] = [];
  const add = (
    plate: string,
    source: PlateCandidate["source"],
    model: string | null,
    manager: string | null,
    obra: string | null,
    linked = false,
  ) => {
    const key = normPlate(plate);
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push({ key, plate: formatPlate(plate), model, manager, obra, source, linked, last: last.get(key) ?? null });
  };

  for (const v of f.vehicles) {
    const who = managerName(f, v.manager_id);
    add(v.plate, "frota", v.model, who, v.obra);
    (v.linked_plates ?? "").split(/[,;/]/).forEach((p) => p.trim() && add(p, "frota", v.model, who, v.obra, true));
  }
  for (const c of f.checklists) add(c.plate, "conferência", c.model, c.responsible, c.obra);
  for (const e of f.expenses) add(e.plate, "manutenção", e.vehicle_name, null, null);
  return out;
}

const byRecent = (a: PlateCandidate, b: PlateCandidate) =>
  (b.last ?? "").localeCompare(a.last ?? "") || a.plate.localeCompare(b.plate);

/** 0 plate starts with it · 1 plate contains it · 2 model · 3 gestor · 99 no match. */
function score(c: PlateCandidate, q: string, raw: string) {
  if (c.key.startsWith(q)) return 0;
  if (c.key.includes(q)) return 1;
  if (raw.length >= 2 && c.model?.toLowerCase().includes(raw)) return 2;
  if (raw.length >= 2 && c.manager?.toLowerCase().includes(raw)) return 3;
  return 99;
}

/** Plates that match what was typed so far; with nothing typed, the cars most recently conferred. */
export function searchPlates(cands: PlateCandidate[], query: string, limit = 8): PlateCandidate[] {
  const q = normPlate(query);
  const raw = query.trim().toLowerCase();
  if (!q) return cands.slice().sort(byRecent).slice(0, limit);
  return cands
    .map((c) => ({ c, s: score(c, q, raw) }))
    .filter((x) => x.s < 99)
    .sort((a, b) => a.s - b.s || byRecent(a.c, b.c))
    .slice(0, limit)
    .map((x) => x.c);
}

/** A plate fully typed that is already in the fleet — no list needed, the car is identified. */
export function exactVehicle(cands: PlateCandidate[], query: string) {
  const q = normPlate(query);
  if (q.length < 6) return null;
  return cands.find((c) => c.source === "frota" && c.key === q) ?? null;
}
