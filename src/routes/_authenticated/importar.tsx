import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { fleetQuery, normPlate } from "@/lib/fleet";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/importar")({
  head: () => ({ meta: [{ title: "Importar planilhas · Controle de Frota" }, { name: "description", content: "Importe planilhas de gestores e de manutenções." }, { property: "og:title", content: "Importar planilhas · Controle de Frota" }, { property: "og:description", content: "Importe planilhas de gestores e manutenções." }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(fleetQuery),
  component: Importar,
});

type Row = Record<string, unknown>;
const str = (v: unknown) => (v == null || String(v).trim() === "" ? null : String(v).trim());
const money = (v: unknown) => {
  if (typeof v === "number") return v;
  const s = String(v ?? "").replace(/R\$|\s/g, "");
  return Number(s.replace(/\./g, "").replace(",", ".")) || 0;
};
const isoDate = (v: unknown) => {
  if (typeof v === "number") return XLSX.SSF.format("yyyy-mm-dd", v);
  const m = String(v ?? "").match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
};
async function readRows(file: File): Promise<Row[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", codepage: 65001 });
  return XLSX.utils.sheet_to_json<Row>(wb.Sheets[wb.SheetNames[0]], { defval: "" });
}
const titleCase = (s: string) => s.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

function Importar() {
  const { data: f } = useSuspenseQuery(fleetQuery);
  const qc = useQueryClient();
  const [log, setLog] = useState<string[]>([]);
  const add = (s: string) => setLog((l) => [...l, s]);

  async function importManagers(files: FileList) {
    for (const file of Array.from(files)) {
      const guess = titleCase(file.name.replace(/\.(csv|xlsx?)$/i, "").replace(/^eletromw-gestor-/i, ""));
      const name = prompt(`Nome do gestor para "${file.name}"`, guess)?.trim();
      if (!name) continue;
      let m = f.managers.find((x) => x.name.toLowerCase() === name.toLowerCase());
      if (!m) {
        const { data, error } = await supabase.from("managers").insert({ name }).select().single();
        if (error) { add(`❌ ${name}: ${error.message}`); continue; }
        m = data;
      }
      const rows = await readRows(file);
      const existing = new Set(f.vehicles.filter((v) => v.manager_id === m!.id).map((v) => normPlate(v.plate) + "|" + String(v.model).toLowerCase()));
      const inserts = rows
        .filter((r) => str(r["Placa"]))
        .map((r) => ({
          manager_id: m!.id,
          model: str(r["Carro"]) ?? "",
          plate: String(r["Placa"]).trim().toUpperCase(),
          obra: str(r["Obra"]), projeto: str(r["Projeto"]), local: str(r["Local"]),
          encarregado: str(r["Encarregado"]), motorista: str(r["Motorista"]),
          efetivos: Number(r["Efetivos"]) || 0,
          status: str(r["Situação"]) ?? "Ativo",
          observacao: str(r["Observação"]), linked_plates: str(r["Placas vinculadas"]),
        }))
        .filter((v) => !existing.has(normPlate(v.plate) + "|" + v.model.toLowerCase()));
      if (inserts.length) {
        const { error } = await supabase.from("vehicles").insert(inserts);
        if (error) { add(`❌ ${name}: ${error.message}`); continue; }
      }
      add(`✅ ${name}: ${inserts.length} veículos importados (${rows.length - inserts.length} já existiam)`);
    }
    qc.invalidateQueries({ queryKey: ["fleet"] });
  }

  async function importExpenses(file: File) {
    const rows = await readRows(file);
    const known = new Set(f.expenses.map((e) => e.ext_id).filter(Boolean));
    const inserts = rows
      .filter((r) => str(r["Placa"]))
      .map((r) => ({
        ext_id: Number(r["ID"]) || null,
        plate: String(r["Placa"]).trim().toUpperCase(),
        vehicle_name: str(r["Veículo"]), tipo: str(r["Tipo"]), expense_date: isoDate(r["Data"]),
        status: str(r["Status"]), amount: money(r["Valor"]), description: str(r["Descrição"]), provider: str(r["Prestador"]),
      }))
      .filter((e) => !e.ext_id || !known.has(e.ext_id));
    for (let i = 0; i < inserts.length; i += 200) {
      const { error } = await supabase.from("expenses").insert(inserts.slice(i, i + 200));
      if (error) { add(`❌ Gastos: ${error.message}`); return; }
    }
    add(`✅ ${inserts.length} gastos importados (${rows.length - inserts.length} já existiam)`);
    qc.invalidateQueries({ queryKey: ["fleet"] });
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="font-display text-2xl font-extrabold">Importar planilhas</h1>
      <div className="rounded-xl border bg-card p-4">
        <p className="font-bold">Planilhas dos gestores (CSV ou Excel)</p>
        <p className="mb-3 text-sm text-muted-foreground">Colunas: Carro, Placa, Obra, Projeto, Local, Encarregado, Motorista, Situação… Cria a pasta do gestor se não existir.</p>
        <input aria-label="Planilhas dos gestores" type="file" multiple accept=".csv,.xlsx,.xls" onChange={(e) => e.target.files && importManagers(e.target.files)} className="text-sm" />
      </div>
      <div className="rounded-xl border bg-card p-4">
        <p className="font-bold">Planilha de manutenções / gastos</p>
        <p className="mb-3 text-sm text-muted-foreground">Colunas: ID, Placa, Veículo, Tipo, Data, Status, Valor, Descrição, Prestador. Registros com o mesmo ID não são duplicados.</p>
        <input aria-label="Planilha de manutenções" type="file" accept=".csv,.xlsx,.xls" onChange={(e) => e.target.files?.[0] && importExpenses(e.target.files[0])} className="text-sm" />
      </div>
      {log.length > 0 && (
        <div className="space-y-1 rounded-xl border bg-card p-4 text-sm" data-testid="import-log">
          {log.map((l, i) => <p key={i}>{l}</p>)}
          <Button variant="outline" size="sm" onClick={() => setLog([])}>Limpar</Button>
        </div>
      )}
    </div>
  );
}
