import type { Database } from "@/integrations/supabase/types";

type Manager = Database["public"]["Tables"]["managers"]["Row"];
type Vehicle = Database["public"]["Tables"]["vehicles"]["Row"];
type Expense = Database["public"]["Tables"]["expenses"]["Row"];
export type Assignment = Database["public"]["Tables"]["vehicle_assignments"]["Row"];

const norm = (p?: string | null) => (p ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
export const normName = (s?: string | null) =>
  (s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

function platesOf(v: Vehicle) {
  const set = new Set([norm(v.plate)]);
  (v.linked_plates ?? "").split(/[,;/]/).forEach((p) => p.trim() && set.add(norm(p)));
  return set;
}

/** Assignments of one car, oldest first (an undated baseline counts as "since always"). */
export function historyFor(plate: string, all: Assignment[]) {
  const k = norm(plate);
  return all
    .filter((a) => norm(a.plate) === k)
    .sort((a, b) => (a.start_date ?? "").localeCompare(b.start_date ?? "") || a.created_at.localeCompare(b.created_at));
}

/**
 * Which gestor pays for each expense: the one holding the car on the expense date.
 * Cars with no history keep the old rule (the car's current gestor pays everything).
 */
export function expenseOwners(vehicles: Vehicle[], expenses: Expense[], assignments: Assignment[]) {
  const byPlate = new Map<string, Vehicle>();
  vehicles.forEach((v) => platesOf(v).forEach((p) => byPlate.set(p, v)));
  const out = new Map<string, string | null>();
  for (const e of expenses) {
    const v = byPlate.get(norm(e.plate));
    if (!v) continue;
    const hist = historyFor(v.plate, assignments);
    if (!hist.length) { out.set(e.id, v.manager_id); continue; }
    const d = e.expense_date ?? "9999-12-31";
    const first = hist[0]!;
    let owner: string | null = first.start_date && d < first.start_date ? null : first.manager_id;
    for (const a of hist) if (!a.start_date || a.start_date <= d) owner = a.manager_id;
    out.set(e.id, owner);
  }
  return out;
}

/** Cars a gestor gave back: held by them at some point, now with someone else. */
export function returnedVehicles(m: Manager, vehicles: Vehicle[], assignments: Assignment[]) {
  const res: { vehicle: Vehicle; returnedOn: string | null }[] = [];
  for (const v of vehicles) {
    if (v.manager_id === m.id) continue;
    const hist = historyFor(v.plate, assignments);
    const i = hist.map((a) => a.manager_id).lastIndexOf(m.id);
    if (i < 0) continue;
    const next = hist.slice(i + 1).find((a) => a.manager_id !== m.id);
    res.push({ vehicle: v, returnedOn: next?.start_date ?? null });
  }
  return res;
}

/** Date the current gestor received the car (null when unknown). */
export function activeSince(v: Vehicle, assignments: Assignment[]) {
  const hist = historyFor(v.plate, assignments);
  let since: string | null = null;
  for (let i = hist.length - 1; i >= 0 && hist[i]!.manager_id === v.manager_id; i--) since = hist[i]!.start_date;
  return since;
}

/**
 * Resolves the name typed in GESTOR: an existing folder, a known employee of a folder
 * (then it is really a FUNCIONÁRIO of that gestor), or a brand new gestor.
 */
export function resolveGestor(name: string, managers: Manager[], vehicles: Vehicle[], assignments: Assignment[]):
  | { kind: "manager"; manager: Manager }
  | { kind: "employee"; manager: Manager; employee: string }
  | { kind: "new"; name: string }
  | { kind: "empty" } {
  const n = normName(name);
  if (!n) return { kind: "empty" };
  const m = managers.find((x) => normName(x.name) === n);
  if (m) return { kind: "manager", manager: m };
  // only the first name ("Maicon" = Maicon Dias), when it points to a single gestor
  const byFirst = managers.filter((x) => normName(x.name).split(" ")[0] === n.split(" ")[0]);
  if (!n.includes(" ") && byFirst.length === 1) return { kind: "manager", manager: byFirst[0]! };
  if (n.includes(" ") && byFirst.length === 1 && normName(byFirst[0]!.name).startsWith(n.split(" ")[0]! + " ")) {
    const last = n.split(" ").slice(1).join(" ");
    if (normName(byFirst[0]!.name).includes(last.slice(0, 4))) return { kind: "manager", manager: byFirst[0]! };
  }
  const people: { name: string; managerId: string | null }[] = [];
  vehicles.forEach((v) => [v.encarregado, v.motorista].forEach((p) => p && people.push({ name: p, managerId: v.manager_id })));
  assignments.forEach((a) => a.employee && people.push({ name: a.employee, managerId: a.manager_id }));
  const hit = people.find((p) => normName(p.name) === n) ??
    (n.length >= 4 ? people.find((p) => normName(p.name).startsWith(n + " ")) : undefined);
  const boss = hit && managers.find((x) => x.id === hit.managerId);
  if (hit && boss) return { kind: "employee", manager: boss, employee: hit.name };
  return { kind: "new", name: name.trim() };
}

/** "Terreno" is the yard where cars wait for a new gestor: a car sent there is with Maicon. */
export const isTerreno = (obra?: string | null) => normName(obra) === "terreno";
export const terrenoManager = (managers: Manager[]) => managers.find((x) => normName(x.name).startsWith("maicon"));
