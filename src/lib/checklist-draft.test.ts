import { describe, expect, it } from "vitest";
import { freshChecklist } from "./checklist-draft";
import { createManualItems } from "./checklist-template";

describe("freshChecklist", () => {
  it("opens blank but with the current date and time already filled", () => {
    expect(freshChecklist(new Date(2026, 10, 1, 17, 49))).toEqual({
      plate: "", model: "", responsible: "", obra: "", gestor: "", funcionario: "",
      checked_date: "2026-11-01", checked_time: "17:49",
      km: null, next_belt_km: null, next_oil_km: null, notes: "", items: [],
    });
  });

  it("loads the points without inventing anything about the car", () => {
    const draft = { ...freshChecklist(), items: createManualItems() };
    expect(draft.items.length).toBeGreaterThan(50);
    expect(draft.items.every((i) => i.ok === null)).toBe(true);
    expect(draft.plate).toBe("");
  });
});
