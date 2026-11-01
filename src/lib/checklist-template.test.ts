import { describe, expect, it } from "vitest";
import { createManualItems, reviewedItems } from "./checklist-template";

describe("manual conference template", () => {
  it("starts with conference points ready to review, never approved automatically", () => {
    const items = createManualItems();
    expect(items.map((item) => item.label)).toEqual(expect.arrayContaining(["Estepe", "Macaco", "Triângulo", "Cartão de abastecimento", "Pisca / seta esquerda", "Pisca / seta direita", "Vazamento de óleo", "Correia dentada", "Rack", "Cintas de amarração"]));
    expect(items.every((item) => item.ok === null)).toBe(true);
    expect(new Set(items.map((item) => item.label)).size).toBe(items.length);
    items[0].note = "alterado";
    expect(createManualItems()[0].note).toBeNull();
  });
  it("preserves OK, X and each point's negative observation when saving", () => {
    expect(reviewedItems([
      { label: "Estepe", ok: true, note: null },
      { label: "Pisca / seta esquerda", ok: false, note: "pisca lado motorista quebrado" },
    ])).toEqual([
      { label: "Estepe", ok: true, note: null },
      { label: "Pisca / seta esquerda", ok: false, note: "pisca lado motorista quebrado" },
    ]);
  });
  it("does not silently save an unreviewed point as OK or reprovado", () => {
    expect(() => reviewedItems([{ label: "Estepe", ok: null, note: null }])).toThrow("Marque OK ou X em: Estepe");
  });
});