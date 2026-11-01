import { describe, expect, it } from "vitest";
import { exactVehicle, formatPlate, plateCandidates, searchPlates } from "./plate-search";
import type { Fleet } from "./fleet";

const fleet = {
  managers: [{ id: "m1", name: "Maicon Dias" }],
  vehicles: [
    { id: "v1", plate: "MIW0436", model: "Logan", manager_id: "m1", obra: "São Francisco do Sul", linked_plates: "MIW-0436" },
    { id: "v2", plate: "ARQ-5I93", model: "Strada", manager_id: null, obra: null, linked_plates: null },
    { id: "v3", plate: "MHW8F21", model: "S10", manager_id: "m1", obra: "Joinville", linked_plates: "MHW-8F21;XYZ1234" },
  ],
  expenses: [{ id: "e1", plate: "KLM1234", vehicle_name: "Fiorino" }],
  checklists: [
    { id: "c1", plate: "pqr-9876", model: "Kangoo", responsible: "Rafael", obra: "Brusque", checked_date: "2026-10-10", checked_at: "2026-10-10T10:00:00Z" },
  ],
} as unknown as Fleet;

const cands = plateCandidates(fleet);

describe("formatPlate", () => {
  it("puts the dash in and uppercases", () => {
    expect(formatPlate("miw0436")).toBe("MIW-0436");
    expect(formatPlate("abc1d23")).toBe("ABC-1D23");
  });
  it("leaves odd input as typed", () => {
    expect(formatPlate("ABC12")).toBe("ABC12");
  });
});

describe("plateCandidates", () => {
  it("keeps one entry per plate even when a linked plate repeats it", () => {
    const miw = cands.filter((c) => c.key === "MIW0436");
    expect(miw).toHaveLength(1);
    expect(miw[0]!.plate).toBe("MIW-0436");
    expect(miw[0]!.manager).toBe("Maicon Dias");
  });
  it("offers linked plates and marks them", () => {
    const xyz = cands.find((c) => c.key === "XYZ1234");
    expect(xyz?.linked).toBe(true);
    expect(xyz?.model).toBe("S10");
  });
  it("adds plates that only exist in a saved conference or the maintenance sheet", () => {
    expect(cands.find((c) => c.key === "PQR9876")?.source).toBe("conferência");
    expect(cands.find((c) => c.key === "KLM1234")?.source).toBe("manutenção");
  });
});

describe("searchPlates", () => {
  it("matches the plate as it is typed, dash or no dash", () => {
    expect(searchPlates(cands, "miw")[0]!.plate).toBe("MIW-0436");
    expect(searchPlates(cands, "MIW-04")[0]!.plate).toBe("MIW-0436");
    expect(searchPlates(cands, "8f21")[0]!.plate).toBe("MHW-8F21");
  });
  it("finds a car by model or by gestor", () => {
    expect(searchPlates(cands, "logan")[0]!.plate).toBe("MIW-0436");
    expect(searchPlates(cands, "maicon").map((c) => c.plate)).toEqual(["MHW-8F21", "MIW-0436"]);
  });
  it("returns nothing for an unknown plate", () => {
    expect(searchPlates(cands, "zzz")).toEqual([]);
  });
  it("opens with the most recently conferred car when nothing is typed", () => {
    expect(searchPlates(cands, "")[0]!.plate).toBe("PQR-9876");
  });
  it("caps the list", () => {
    expect(searchPlates(cands, "1", 2)).toHaveLength(2);
  });
});

describe("exactVehicle", () => {
  it("says a fully typed fleet plate is already identified", () => {
    expect(exactVehicle(cands, "MIW-0436")?.key).toBe("MIW0436");
    expect(exactVehicle(cands, "miw0436")?.key).toBe("MIW0436");
  });
  it("still lists plates that are not in the fleet", () => {
    expect(exactVehicle(cands, "PQR-9876")).toBeNull();
    expect(exactVehicle(cands, "MIW")).toBeNull();
  });
});
