import { describe, expect, it } from "vitest";
import { createManualItems, reviewedCount, reviewedItems } from "./checklist-template";

describe("manual conference template", () => {
  it("starts with conference points ready to review, never approved automatically", () => {
    const items = createManualItems();
    expect(items.map((item) => item.label)).toEqual(expect.arrayContaining(["Estepe", "Macaco", "Triângulo", "Cartão de abastecimento", "Pisca / seta esquerda", "Pisca / seta direita", "Vazamento de óleo", "Correia dentada", "Rack", "Cintas de amarração"]));
    expect(items.every((item) => item.ok === null)).toBe(true);
    expect(new Set(items.map((item) => item.label)).size).toBe(items.length);
    const first = items[0];
    if (!first) throw new Error("Template vazio");
    first.note = "alterado";
    expect(createManualItems()[0]?.note).toBeNull();
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
  it("saves the conference without requiring every point to be marked", () => {
    const items = createManualItems();
    expect(() => reviewedItems(items)).not.toThrow();
    expect(reviewedItems(items)).toEqual([]);
    expect(reviewedCount(items)).toBe(0);
    items[0]!.ok = true;
    expect(reviewedCount(items)).toBe(1);
    expect(reviewedItems(items)).toEqual([{ label: items[0]!.label, ok: true, note: null }]);
  });
  it("drops unmarked points instead of recording them as approved or reproved", () => {
    expect(reviewedItems([
      { label: "Estepe", ok: true, note: null },
      { label: "Macaco", ok: null, note: null },
      { label: "Pisca / seta esquerda", ok: false, note: "pisca lado motorista quebrado" },
    ])).toEqual([
      { label: "Estepe", ok: true, note: null },
      { label: "Pisca / seta esquerda", ok: false, note: "pisca lado motorista quebrado" },
    ]);
  });
  it("keeps points that were never cited in a saved conference out of the template", () => {
    const labels = createManualItems().map((item) => item.label);
    expect(labels).not.toContain("Mangueira do esguicho");
    expect(labels).toContain("Esguicho do para-brisa");
    expect(labels.length).toBe(70);
  });
});