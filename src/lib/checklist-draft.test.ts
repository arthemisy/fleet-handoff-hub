import { describe, expect, it } from "vitest";
import { freshChecklist } from "./checklist-draft";
import { createManualItems } from "./checklist-template";

describe("freshChecklist", () => {
  it("opens with every field empty, date and time included", () => {
    expect(freshChecklist()).toEqual({
      plate: "", model: "", responsible: "", obra: "",
      checked_date: null, checked_time: null,
      km: null, next_belt_km: null, next_oil_km: null, notes: "", items: [],
    });
  });

  it("loads the points without inventing anything about the car", () => {
    const draft = { ...freshChecklist(), items: createManualItems() };
    expect(draft.items.length).toBeGreaterThan(50);
    expect(draft.items.every((i) => i.ok === null)).toBe(true);
    expect(draft.plate).toBe("");
    expect(draft.checked_date).toBeNull();
    expect(draft.checked_time).toBeNull();
  });
});
