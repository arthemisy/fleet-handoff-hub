import { useEffect } from "react";
import { queryOptions, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { expenseOwners, historyFor, type Assignment } from "./assignments";
import { repairEpisodes, repairPayer, type Visit } from "./repairs";

export type Manager = Database["public"]["Tables"]["managers"]["Row"];
export type Vehicle = Database["public"]["Tables"]["vehicles"]["Row"];
export type Expense = Database["public"]["Tables"]["expenses"]["Row"];
export type Checklist = Database["public"]["Tables"]["checklists"]["Row"];
export type ChecklistItem = { label: string; ok: boolean; note?: string | null };

export const normPlate = (p?: string | null) => (p ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");

export const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

async function all<T>(table: "managers" | "vehicles" | "expenses" | "checklists" | "vehicle_assignments" | "mechanic_visits", order: string) {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .order(order, { ascending: order === "name" })
      .range(from, from + 999);
    if (error) throw error;
    out.push(...((data ?? []) as T[]));
    if (!data || data.length < 1000) break;
  }
  return out;
}

export const fleetQuery = queryOptions({
  queryKey: ["fleet"],
  queryFn: async () => {
    const [managers, vehicles, expenses, checklists, assignments, visits] = await Promise.all([
      all<Manager>("managers", "name"),
      all<Vehicle>("vehicles", "created_at"),
      all<Expense>("expenses", "expense_date"),
      all<Checklist>("checklists", "created_at"),
      all<Assignment>("vehicle_assignments", "created_at"),
      all<Visit & { id: string; shop: string | null; created_at: string }>("mechanic_visits", "created_at"),
    ]);
    const owners = expenseOwners(vehicles, expenses, assignments);
    // repair bills go to the gestor who used the car before it broke (see repairs.ts)
    const ownerId = managers.find((m) => m.name.toLowerCase().startsWith("maicon"))?.id ?? null;
    const repairBilled = new Set<string>();
    for (const v of vehicles) {
      const eps = repairEpisodes(v.plate, visits, checklists);
      if (!eps.length) continue;
      const hist = historyFor(v.plate, assignments);
      for (const e of expensesForVehicle(v, expenses)) {
        const payer = e.expense_date ? repairPayer(e.expense_date, eps, hist, ownerId) : undefined;
        if (payer) { owners.set(e.id, payer); repairBilled.add(e.id); }
      }
    }
    return { managers, vehicles, expenses, checklists, assignments, visits, owners, repairBilled };
  },
});

export type Fleet = Awaited<ReturnType<NonNullable<typeof fleetQuery.queryFn>>>;

/** Live sync: any change made by anyone on the team refreshes every open phone. */
export function useFleetRealtime() {
  const qc = useQueryClient();
  useEffect(() => {
    const ch = supabase.channel(`fleet-${Math.random().toString(36).slice(2)}`);
    for (const table of ["managers", "vehicles", "expenses", "checklists", "vehicle_assignments", "mechanic_visits"]) {
      ch.on("postgres_changes", { event: "*", schema: "public", table }, () =>
        qc.invalidateQueries({ queryKey: ["fleet"] }),
      );
    }
    ch.subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);
}

export function vehiclePlates(v: Vehicle) {
  const set = new Set([normPlate(v.plate)]);
  (v.linked_plates ?? "").split(/[,;/]/).forEach((p) => p.trim() && set.add(normPlate(p)));
  return set;
}

export function expensesForVehicle(v: Vehicle, expenses: Expense[]) {
  const plates = vehiclePlates(v);
  return expenses.filter((e) => plates.has(normPlate(e.plate)));
}

export function managerStats(m: Manager, f: Fleet) {
  const vehicles = f.vehicles.filter((v) => v.manager_id === m.id);
  // each expense belongs to whoever held the car on its date (see assignments.ts)
  const expenses = f.expenses.filter((e) => f.owners.get(e.id) === m.id);
  const counts = new Map<string, number>();
  vehicles.forEach((v) => counts.set(normPlate(v.plate), (counts.get(normPlate(v.plate)) ?? 0) + 1));
  return {
    vehicles,
    expenses,
    total: expenses.reduce((s, e) => s + Number(e.amount), 0),
    repeated: [...counts.values()].filter((c) => c > 1).length,
    obras: [...new Set(vehicles.map((v) => v.obra).filter(Boolean))] as string[],
  };
}
