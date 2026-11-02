import { describe, expect, it } from "vitest";
import { activeSince, expenseOwners, isTerreno, terrenoConflict, terrenoManager, resolveGestor, returnedVehicles, type Assignment } from "./assignments";

const mgr = (id: string, name: string) => ({ id, name, created_at: "" });
const rafael = mgr("r", "Rafael Pupulim");
const maicon = mgr("m", "Maicon Dias");
const veh = (o: Record<string, unknown>) => ({ id: "v", plate: "MHW-8F40", model: "", manager_id: "m", encarregado: null, motorista: null, linked_plates: null, ...o }) as never;
const asg = (o: Partial<Assignment>): Assignment => ({ id: Math.random().toString(), plate: "MHW8F40", manager_id: null, employee: null, start_date: null, checklist_id: null, created_at: "2026-01-01", ...o });
const exp = (id: string, d: string) => ({ id, plate: "MHW 8F40", expense_date: d, amount: 10 }) as never;

describe("car handover between gestores", () => {
  const car = veh({ manager_id: "m" });
  const hist = [asg({ manager_id: "r" }), asg({ manager_id: "m", start_date: "2026-10-20" })];

  it("expenses before the checklist date stay with Rafael, from that date on go to Maicon", () => {
    const o = expenseOwners([car], [exp("old", "2026-10-19"), exp("same", "2026-10-20"), exp("new", "2026-11-01")], hist);
    expect(o.get("old")).toBe("r");
    expect(o.get("same")).toBe("m");
    expect(o.get("new")).toBe("m");
  });

  it("the car leaves Rafael's folder as returned and is active for Maicon since the date", () => {
    expect(returnedVehicles(rafael, [car], hist)).toEqual([{ vehicle: car, returnedOn: "2026-10-20" }]);
    expect(returnedVehicles(maicon, [car], hist)).toEqual([]);
    expect(activeSince(car, hist)).toBe("2026-10-20");
  });

  it("cars with no history keep charging the current gestor", () => {
    expect(expenseOwners([car], [exp("x", "2020-01-01")], []).get("x")).toBe("m");
  });
});

describe("GESTOR name", () => {
  const vs = [veh({ plate: "AUF-9E23", manager_id: "r", encarregado: "Silvestre Rosa Guimarães" })];
  it("an employee of Rafael is not a new folder", () => {
    expect(resolveGestor("silvestre rosa guimaraes", [rafael, maicon], vs, [])).toMatchObject({ kind: "employee", manager: rafael });
    expect(resolveGestor("Silvestre", [rafael, maicon], vs, [])).toMatchObject({ kind: "employee", manager: rafael });
  });
  it("existing gestor and new gestor", () => {
    expect(resolveGestor("maicon dias", [rafael, maicon], vs, [])).toMatchObject({ kind: "manager", manager: maicon });
    expect(resolveGestor("João Novo", [rafael, maicon], vs, [])).toEqual({ kind: "new", name: "João Novo" });
  });
});

describe("team rules", () => {
  it("first name alone means the gestor", async () => {
    expect(resolveGestor("Maicon", [rafael, maicon], [], [])).toMatchObject({ kind: "manager", manager: maicon });
    expect(resolveGestor("rafael pupulin", [rafael, maicon], [], [])).toMatchObject({ kind: "manager", manager: rafael });
  });
  it("obra Terreno means the car is with Maicon", async () => {
    expect(isTerreno(" Terreno ")).toBe(true);
    expect(terrenoManager([rafael, maicon])).toBe(maicon);
  });
  it("Rafael Pupulin with a typo goes to the existing Rafael Pupulim folder", () => {
    expect(resolveGestor("Rafael Pupulin", [rafael, maicon, mgr("e", "Emerson – Comercial EletroMW")], [], [])).toMatchObject({ kind: "manager", manager: rafael });
  });
  it("obra Terreno is only for Maicon", () => {
    expect(terrenoConflict("Terreno", "r", [rafael, maicon])).toBe(true);
    expect(terrenoConflict("Terreno", "m", [rafael, maicon])).toBe(false);
    expect(terrenoConflict("Joinville", "r", [rafael, maicon])).toBe(false);
  });
});
