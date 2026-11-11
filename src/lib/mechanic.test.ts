import { describe, expect, it } from "vitest";
import { inMechanic } from "./mechanic";

const V = { plate: "NXR-8E10", obra: "Almoxarifado" };

describe("inMechanic", () => {
  it("flags when the newest checklist message says the car is at the mechanic", () => {
    const r = inMechanic(V, [
      { plate: "NXR8E10", checked_date: "2026-11-10", notes: null, raw_text: null, obra: "PORTO BELO" },
      { plate: "NXR-8E10", checked_date: "2026-11-04", notes: "Carro está na Maurício Mecânica.", raw_text: "LOCAL DE ENTREGA ALMOXARIFADO", obra: "Almoxarifado" },
    ]);
    expect(r).toBe("Maurício");
  });

  it("flags from the vehicle obra when it names a mechanic shop", () => {
    expect(inMechanic({ plate: "MEE-9656", obra: "Manutenção — Mecânica Maurício" }, [])).toBe("Maurício");
  });

  it("does not flag when the newest message has no mechanic mention", () => {
    const r = inMechanic(V, [
      { plate: "NXR-8E10", checked_date: "2026-11-10", notes: "Tudo certo, carro liberado", raw_text: null, obra: "Almoxarifado" },
      { plate: "NXR-8E10", checked_date: "2026-11-04", notes: "Carro está na Maurício Mecânica.", raw_text: null, obra: null },
    ]);
    expect(r).toBe(false);
  });

  it("ignores checklists of other plates", () => {
    const r = inMechanic(V, [
      { plate: "MEE-9656", checked_date: "2026-10-30", notes: "Vai para manutenção na Mecânica Maurício", raw_text: null, obra: null },
    ]);
    expect(r).toBe(false);
  });
});
