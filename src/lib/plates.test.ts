import { describe, expect, it } from "vitest";
import { isValidPlate, plateWarnings } from "./plates";
import type { Expense, Manager, Vehicle } from "./fleet";

const v = (id: string, plate: string, extra: Partial<Vehicle> = {}) => ({ id, plate, model: "Fox", manager_id: "m", status: "Ativo", linked_plates: null, ...extra }) as Vehicle;
const e = (plate: string) => ({ plate }) as Expense;
const managers = [{ id: "m", name: "Rafael" }] as Manager[];

describe("plates", () => {
  it("accepts old and Mercosul formats, rejects short ones", () => {
    expect(isValidPlate("MIW-0436")).toBe(true);
    expect(isValidPlate("QHD-8A77")).toBe(true);
    expect(isValidPlate("ENF714")).toBe(false);
  });
  it("flags the same plate on two active vehicles", () => {
    const w = plateWarnings([v("1", "QHD-8A77"), v("2", "QHD8A77")], [e("QHD8A77")], managers);
    expect(w.filter((x) => x.kind === "duplicate")).toHaveLength(1);
  });
  it("does not flag a returned vehicle as duplicate", () => {
    const w = plateWarnings([v("1", "MHW-8F21"), v("2", "MHW-8F21", { status: "Devolvido" })], [e("MHW8F21")], managers);
    expect(w).toHaveLength(0);
  });
  it("flags plates missing from the maintenance list and suggests the closest", () => {
    const w = plateWarnings([v("1", "OAC-1D37")], [e("OCA1D37")], managers);
    expect(w[0]?.kind).toBe("unknown");
    expect(w[0]?.suggestion).toBe("OCA-1D37");
  });
});
