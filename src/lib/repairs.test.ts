import { describe, expect, it } from "vitest";
import { repairEpisodes, repairPayer } from "./repairs";

const hist = [
  { plate: "ABC1234", manager_id: "maicon", start_date: "2026-10-01", created_at: "1" },
  { plate: "ABC1234", manager_id: "rafael", start_date: "2026-10-10", created_at: "2" },
  { plate: "ABC1234", manager_id: "maicon", start_date: "2026-11-01", created_at: "3" },
  { plate: "ABC1234", manager_id: "cleiton", start_date: "2026-11-20", created_at: "4" },
];
const eps = repairEpisodes("ABC-1234", [{ plate: "ABC1234", start_date: "2026-11-03", end_date: "2026-11-08" }], []);

describe("gasto de conserto vai para quem devolveu", () => {
  it("nota dentro do período do conserto é do gestor que devolveu", () => {
    expect(repairPayer("2026-11-05", eps, hist, "maicon")).toBe("rafael");
  });
  it("aceita 1 dia antes ou depois", () => {
    expect(repairPayer("2026-11-02", eps, hist, "maicon")).toBe("rafael");
    expect(repairPayer("2026-11-09", eps, hist, "maicon")).toBe("rafael");
  });
  it("2 dias depois não conta como conserto", () => {
    expect(repairPayer("2026-11-10", eps, hist, "maicon")).toBeUndefined();
  });
  it("período lido das mensagens do checklist", () => {
    const e = repairEpisodes("ABC1234", [], [
      { plate: "ABC1234", notes: "carro na mecânica", checked_date: "2026-11-03" },
      { plate: "ABC1234", notes: "tudo ok", checked_date: "2026-11-07" },
    ]);
    expect(e).toEqual([{ start: "2026-11-03", end: "2026-11-07" }]);
  });
});
