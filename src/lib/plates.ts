import { normPlate, type Expense, type Manager, type Vehicle } from "./fleet";

/** Brazilian plate: old (ABC1234) or Mercosul (ABC1D23). */
export const isValidPlate = (p: string) => /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(normPlate(p));

function distance(a: string, b: string) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0]![j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i]![j] = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length]![b.length]!;
}

export type PlateWarning = {
  kind: "duplicate" | "invalid" | "unknown";
  plate: string;
  message: string;
  vehicleIds: string[];
  suggestion?: string;
};

/**
 * Official plate list = plates in the maintenance spreadsheet (expenses).
 * Flags: same plate in more than one active vehicle, malformed plates,
 * and plates not in the official list (with the closest official plate as a hint).
 */
export function plateWarnings(vehicles: Vehicle[], expenses: Expense[], managers: Manager[]): PlateWarning[] {
  const name = (id: string | null) => managers.find((m) => m.id === id)?.name ?? "sem gestor";
  const official = [...new Set(expenses.map((e) => normPlate(e.plate)).filter(Boolean))];
  const officialSet = new Set(official);
  const out: PlateWarning[] = [];

  const groups = new Map<string, Vehicle[]>();
  vehicles
    .filter((v) => v.status !== "Devolvido" && v.status !== "Transferido")
    .forEach((v) => groups.set(normPlate(v.plate), [...(groups.get(normPlate(v.plate)) ?? []), v]));
  for (const [, vs] of groups)
    if (vs.length > 1)
      out.push({
        kind: "duplicate",
        plate: vs[0]!.plate,
        vehicleIds: vs.map((v) => v.id),
        message: `Placa ${vs[0]!.plate} repetida em ${vs.length} veículos: ${vs.map((v) => `${v.model} (${name(v.manager_id)})`).join(", ")}`,
      });

  for (const v of vehicles) {
    const p = normPlate(v.plate);
    const suggest = () => {
      const best = official.map((o) => ({ o, d: distance(p, o) })).sort((a, b) => a.d - b.d)[0];
      return best && best.d <= 2 ? best.o.slice(0, 3) + "-" + best.o.slice(3) : undefined;
    };
    if (!isValidPlate(v.plate)) {
      const s = suggest();
      out.push({ kind: "invalid", plate: v.plate, vehicleIds: [v.id], suggestion: s, message: `Placa ${v.plate} (${v.model}, ${name(v.manager_id)}) está fora do padrão${s ? ` — seria ${s}?` : ""}` });
    } else if (official.length && !officialSet.has(p)) {
      const linkedOk = (v.linked_plates ?? "").split(/[,;/]/).some((l) => officialSet.has(normPlate(l)));
      const s = suggest();
      out.push({
        kind: "unknown", plate: v.plate, vehicleIds: [v.id], suggestion: s,
        message: `Placa ${v.plate} (${v.model}, ${name(v.manager_id)}) não está na planilha de manutenções${linkedOk ? ` — usa placa vinculada ${v.linked_plates}` : s ? ` — seria ${s}?` : ""}`,
      });
    }
  }
  return out;
}
