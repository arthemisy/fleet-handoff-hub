import { normPlate } from "./fleet";
import { dayOf, mentionsMechanic } from "./mechanic";

export type Visit = { plate: string; start_date: string; end_date: string | null };
type Check = Parameters<typeof mentionsMechanic>[0];
type Hold = { plate: string; manager_id: string | null; start_date: string | null; created_at: string };
export type Episode = { start: string; end: string | null };

const addDays = (d: string, n: number) => new Date(Date.parse(d + "T12:00:00Z") + n * 86400000).toISOString().slice(0, 10);

/** Repair periods of one car: the button records plus the ones read from checklist messages. */
export function repairEpisodes(plate: string, visits: Visit[], checklists: Check[]): Episode[] {
  const k = normPlate(plate);
  const eps: Episode[] = visits.filter((v) => normPlate(v.plate) === k).map((v) => ({ start: v.start_date, end: v.end_date }));
  const mine = checklists.filter((c) => normPlate(c.plate) === k && dayOf(c)).sort((a, b) => dayOf(a).localeCompare(dayOf(b)));
  let open: string | null = null;
  for (const c of mine) {
    const m = mentionsMechanic(c);
    if (m === true && !open) open = dayOf(c);
    else if (m === false && open) { eps.push({ start: open, end: dayOf(c) }); open = null; }
  }
  if (open) eps.push({ start: open, end: null });
  return eps;
}

/**
 * A repair bill dated inside a repair period (±1 day) is paid by the gestor who used the car
 * before it broke — the last borrower before the repair began — not the owner nor the next one.
 */
export function repairPayer(date: string, eps: Episode[], hist: Hold[], ownerId: string | null, today = new Date().toISOString().slice(0, 10)) {
  const ep = eps.find((e) => date >= addDays(e.start, -1) && date <= addDays(e.end ?? today, 1));
  if (!ep) return undefined;
  const before = hist
    .filter((a) => !a.start_date || a.start_date <= ep.start)
    .sort((a, b) => (a.start_date ?? "").localeCompare(b.start_date ?? "") || a.created_at.localeCompare(b.created_at));
  const prev = [...before].reverse().find((a) => a.manager_id && a.manager_id !== ownerId);
  return prev?.manager_id ?? undefined;
}
