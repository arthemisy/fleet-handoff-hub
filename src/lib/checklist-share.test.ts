import { describe, expect, it } from "vitest";
import { checklistWhatsAppText } from "./checklist-share";

describe("checklistWhatsAppText", () => {
  it("lists only failed items", () => {
    const t = checklistWhatsAppText({ plate: "DTZ-3G96", when: "09/11", items: [{ label: "Luz de ré", ok: false, note: "queimada" }, { label: "Estepe", ok: true }] });
    expect(t).toContain("❌ Luz de ré — _queimada_");
    expect(t).not.toContain("Estepe");
  });

  it("keeps emojis only on the header, plate and item status, and ends with the logo link", () => {
    const t = checklistWhatsAppText({
      plate: "DTZ-3G96", when: "09/11", obra: "Terreno", gestor: "Maicon", km: 157535,
      items: [{ label: "Luz de ré", ok: false }], notes: "trocar lâmpada",
    });
    expect(t).toContain("🚗 *CHECKLIST*");
    expect(t).toContain("🔷 *PLACA: DTZ-3G96* 🔷");
    expect(t).toContain("Obra: Terreno");
    expect(t).not.toMatch(/📅|📍|👤|🛣️|📝|⚠️/);
    expect(t).not.toContain("http");
    expect(t).not.toContain("Controle de Frota");
  });
});
