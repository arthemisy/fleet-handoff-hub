import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAskShop } from "@/components/AskShopDialog";
import { sendVehicleToRepair } from "@/lib/send-to-repair";
import { inMechanic } from "@/lib/mechanic";
import { useState } from "react";
import { Plus, Pencil, Wrench } from "lucide-react";
import { brl, expensesForVehicle, fleetQuery } from "@/lib/fleet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { VehicleDialog, ExpenseDialog } from "@/components/FleetDialogs";
import { MechanicTag } from "@/components/MechanicTag";

export const Route = createFileRoute("/_authenticated/veiculos")({
  head: () => ({ meta: [{ title: "Veículos · Controle de Frota" }, { name: "description", content: "Todos os veículos da frota com gastos por placa." }, { property: "og:title", content: "Veículos · Controle de Frota" }, { property: "og:description", content: "Gastos por veículo da frota EletroMW." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(fleetQuery),
  component: Veiculos,
});

function Veiculos() {
  const { data: f } = useSuspenseQuery(fleetQuery);
  const [q, setQ] = useState("");
  const qc = useQueryClient();
  const [askShop, shopDialog] = useAskShop();
  async function toRepair(plate: string, model: string) {
    const shop = await askShop(`${plate} · ${model}`);
    if (!shop) return;
    try { await sendVehicleToRepair(plate, shop); toast.success(`${plate} enviado para a mecânica ${shop}`); qc.invalidateQueries({ queryKey: ["fleet"] }); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Erro ao enviar"); }
  }
  const name = (id: string | null) => f.managers.find((m) => m.id === id)?.name ?? "—";
  const rows = f.vehicles
    .map((v) => ({ v, total: expensesForVehicle(v, f.expenses).reduce((a, e) => a + Number(e.amount), 0) }))
    .filter(({ v }) => `${v.plate} ${v.model} ${v.obra} ${v.encarregado} ${name(v.manager_id)}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.total - a.total);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-extrabold">Gastos por veículo</h1>
        <div className="flex gap-2">
          <ExpenseDialog trigger={<Button variant="outline" size="sm"><Plus className="h-4 w-4" />Gasto</Button>} />
          <VehicleDialog managers={f.managers} trigger={<Button size="sm"><Plus className="h-4 w-4" />Veículo</Button>} />
        </div>
      </div>
      <Input placeholder="Buscar placa, modelo, obra, gestor…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="divide-y rounded-xl border bg-card">
        {rows.map(({ v, total }) => (
          <div key={v.id} className="flex items-center gap-3 p-3">
            <div className="min-w-0 flex-1">
              <p className="font-display font-extrabold tracking-wide">{v.plate} <span className="font-sans text-sm font-normal text-muted-foreground">{v.model}</span> <MechanicTag plate={v.plate} /></p>
              <p className="truncate text-xs text-muted-foreground">
                {v.manager_id ? <Link to="/gestor/$id" params={{ id: v.manager_id }} className="text-primary">{name(v.manager_id)}</Link> : "Sem gestor"}{v.encarregado ? ` · com ${v.encarregado}` : ""} · {v.obra ?? "sem obra"} · {v.status}
              </p>
            </div>
            <span className="font-bold text-primary">{brl(total)}</span>
            {!inMechanic(v, f.checklists) && <Button variant="ghost" size="icon" aria-label={`Enviar ${v.plate} para manutenção`} title="Enviar para manutenção" onClick={() => toRepair(v.plate, v.model)}><Wrench className="h-4 w-4" /></Button>}
            <VehicleDialog vehicle={v} managers={f.managers} trigger={<Button variant="ghost" size="icon" aria-label="Editar"><Pencil className="h-4 w-4" /></Button>} />
          </div>
        ))}
      </div>
      {shopDialog}
    </div>
  );
}
