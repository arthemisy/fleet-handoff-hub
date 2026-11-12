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

  it("não marca quando a mensagem mais nova diz que o carro saiu da mecânica, mesmo com obra de mecânica", () => {
    const r = inMechanic({ plate: "AUF-9E23", obra: "Mecânica Maurício" }, [
      { plate: "AUF-9E23", checked_date: "2026-11-05", created_at: "2026-11-11T02:28:39Z", notes: "PEGOU DIRETO DA MECANICA E LEVOU PARA OBRA", raw_text: "NOME SILVESTRE" },
      { plate: "AUF-9E23", checked_date: "2026-10-30", created_at: "2026-11-01T01:57:54Z", notes: "Carro na mecânica", obra: "Mecânica Maurício" },
    ]);
    expect(r).toBe(false);
  });

  it("mensagem de saída criada depois do 'consertado' não devolve o carro para o conserto", () => {
    const r = inMechanic({ plate: "AUF-9E23", obra: "Mecânica Maurício", mechanic_manual: "out", mechanic_changed_at: "2026-11-11T02:25:55Z" }, [
      { plate: "AUF-9E23", checked_date: "2026-11-05", created_at: "2026-11-11T02:28:39Z", notes: "PEGOU DIRETO DA MECANICA E LEVOU PARA OBRA" },
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

import { inMechanic as im2 } from "./mechanic";
describe("botões de conserto", () => {
  const msg = [{ plate: "ABC1234", notes: "carro na mecânica", created_at: "2026-11-01T10:00:00Z" }];
  it("marcar consertado depois da mensagem tira do conserto", () => {
    expect(im2({ plate: "ABC1234", mechanic_manual: "out", mechanic_changed_at: "2026-11-02T10:00:00Z" }, msg)).toBe(false);
  });
  it("mandar para o conserto manualmente mostra o aviso", () => {
    expect(im2({ plate: "ABC1234", mechanic_manual: "in", mechanic_changed_at: "2026-11-02T10:00:00Z" }, [])).toBe(true);
  });
  it("mensagem nova de mecânica vence um 'consertado' antigo", () => {
    expect(im2({ plate: "ABC1234", mechanic_manual: "out", mechanic_changed_at: "2026-10-01T10:00:00Z" }, msg)).toBe(true);
  });
});

import { mechanicSince } from "./mechanic";
describe("na mecânica desde", () => {
  it("usa a data escolhida ao mandar para o conserto", () => {
    expect(mechanicSince({ plate: "ABC1234", mechanic_manual: "in", mechanic_since: "2026-11-03", mechanic_changed_at: "2026-11-10T10:00:00Z" }, [])).toBe("2026-11-03");
  });
  it("usa a data do checklist quando veio da mensagem", () => {
    expect(mechanicSince({ plate: "ABC1234" }, [{ plate: "ABC1234", notes: "na mecânica", checked_date: "2026-11-05", created_at: "2026-11-06T10:00:00Z" }])).toBe("2026-11-05");
  });
});
it("não confunde a linha seguinte com o nome da oficina", () => {
  expect(inMechanic({ plate: "MMJ5763" }, [{ plate: "MMJ5763", raw_text: "LOCAL . MECÂNICA \nDATA. 15/10/26", checked_at: "15/10/26 11:40" }])).toBe(true);
  expect(mechanicSince({ plate: "MMJ5763" }, [{ plate: "MMJ5763", raw_text: "LOCAL . MECÂNICA \nDATA. 15/10/26", checked_at: "15/10/26 11:40" }])).toBe("2026-10-15");
});

import { mentionsMechanic as mm } from "./mechanic";
import { test as t2, expect as e2 } from "vitest";
t2("'está em manutenção' na obs conta como mecânica", () => {
  e2(mm({ plate: "AAA1B23", notes: "Carro está em manutenção" })).toBe(true);
});
