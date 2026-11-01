import { describe, expect, it } from "vitest";
import { dateStr, hm, legacyDateTime, timeStr, whenLabel } from "./checklist-time";

// Local components: no timezone surprises.
const now = new Date(2026, 9, 31, 22, 23, 5);

describe("checklist date and time", () => {
  it("defaults to the phone's current day and clock time", () => {
    expect(dateStr(now)).toBe("2026-10-31");
    expect(timeStr(now)).toBe("22:23");
  });

  it("shortens a stored time so it fits the time input", () => {
    expect(hm("22:23:00")).toBe("22:23");
    expect(hm(null)).toBe("");
  });

  it("pulls a time and a short date out of the old free-text field", () => {
    expect(legacyDateTime("10:52 SEXTA FEIRA")).toEqual({ checked_date: null, checked_time: "10:52" });
    expect(legacyDateTime("20/10/26")).toEqual({ checked_date: "2026-10-20", checked_time: null });
    expect(legacyDateTime("KM 308.000 / CORREIA 340.000")).toEqual({ checked_date: null, checked_time: null });
  });

  it("shows date and time together, or just what was saved", () => {
    expect(whenLabel({ checked_date: "2026-10-31", checked_time: "22:23:00", checked_at: null, created_at: "2026-10-31T22:23:00Z" })).toBe("31/10/2026 22:23");
    expect(whenLabel({ checked_date: "2026-10-31", checked_time: null, checked_at: null, created_at: "2026-10-31T22:23:00Z" })).toBe("31/10/2026");
  });

  it("falls back to the old text, then to the moment it was saved", () => {
    expect(whenLabel({ checked_date: null, checked_time: null, checked_at: "10:52 SEXTA FEIRA", created_at: "2026-10-31T22:23:00Z" })).toBe("10:52 SEXTA FEIRA");
    expect(whenLabel({ checked_date: null, checked_time: null, checked_at: null, created_at: "2026-10-31T22:23:00Z" })).toContain("31/10/2026");
  });
});
