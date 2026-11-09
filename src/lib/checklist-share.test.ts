import { describe, expect, it } from "vitest";
import { checklistWhatsAppText } from "./checklist-share";

describe("checklistWhatsAppText", () => {
  it("lists only failed items", () => {
    const t = checklistWhatsAppText({ plate: "DTZ-3G96", when: "09/11", items: [{ label: "Luz de ré", ok: false, note: "queimada" }, { label: "Estepe", ok: true }] });
    expect(t).toContain("❌ Luz de ré — _queimada_");
    expect(t).not.toContain("Estepe");
  });
});
