import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Plus, Pencil, Car, Users, Wallet, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { brl, expensesForVehicle, fleetQuery, managerStats } from "@/lib/fleet";
import { Button } from "@/components/ui/button";
import { VehicleDialog, ExpenseDialog } from "@/components/FleetDialogs";
import { Stat } from "@/components/Stat";

export const Route = createFileRoute("/_authenticated/gestor/$id")({
  head: () => ({ meta: [{ title: "Pasta do gestor · Controle de Frota" }, { name: "description", content: "Veículos, obras e gastos sob responsabilidade do gestor." }, { property: "og:title", content: "Pasta do gestor · Controle de Frota" }, { property: "og:description", content: "Veículos, obras e gastos do gestor." }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(fleetQuery),
  component: Gestor,
});

function Gestor() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const { data: f } = useSuspenseQuery(fleetQuery);
  const m = f.managers.find((x) => x.id === id);
  if (!m) return <p>Pasta não encontrada. <Link to="/painel" className="text-primary">Voltar</Link></p>;
  const s = managerStats(m, f);
  const exp = [...s.expenses].sort((a, b) => (b.expense_date ?? "").localeCompare(a.expense_date ?? ""));

  async function rename() {
    const name = prompt("Novo nome da pasta", m!.name)?.trim();
    if (!name) return;
    const { error } = await supabase.from("managers").update({ name }).eq("id", m!.id);
    if (error) toast.error(error.message);
  }
  async function remove() {
    if (!confirm(`Excluir a pasta de ${m!.name}? Os veículos ficam sem gestor.`)) return;
    const { error } = await supabase.from("managers").delete().eq("id", m!.id);
    if (error) return toast.error(error.message);
    nav({ to: "/painel" });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/painel" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="h-4 w-4" />Pastas</Link>
          <h1 className="font-display text-2xl font-extrabold">{m.name}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={rename}>Renomear</Button>
          <Button variant="ghost" size="sm" className="text-destructive" onClick={remove}>Excluir pasta</Button>
          <VehicleDialog managers={f.managers} defaultManagerId={m.id} trigger={<Button size="sm"><Plus className="h-4 w-4" />Veículo</Button>} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={Car} label="Veículos" value={s.vehicles.length} tone="blue" />
        <Stat icon={Users} label="Efetivos" value={s.efetivos} tone="blue" />
        <Stat icon={Wallet} label="Total gasto" value={brl(s.total)} tone="yellow" />
        <Stat icon={FileText} label="Registros" value={s.expenses.length} tone="yellow" />
      </div>

      <section>
        <h2 className="mb-3 font-display font-extrabold text-primary">VEÍCULOS</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {s.vehicles.map((v) => {
            const ve = expensesForVehicle(v, f.expenses);
            const last = f.checklists.find((c) => c.plate.replace(/\W/g, "") === v.plate.replace(/\W/g, ""));
            return (
              <div key={v.id} className="rounded-xl border bg-card p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-display text-lg font-extrabold tracking-wide">{v.plate}</p>
                    <p className="text-sm text-muted-foreground">{v.model}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${v.status === "Ativo" ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"}`}>{v.status}</span>
                    <VehicleDialog vehicle={v} managers={f.managers} trigger={<Button variant="ghost" size="icon" aria-label="Editar"><Pencil className="h-4 w-4" /></Button>} />
                  </div>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  {[["Obra", v.obra], ["Projeto", v.projeto], ["Local", v.local], ["Encarregado", v.encarregado], ["Motorista", v.motorista], ["KM", v.km?.toLocaleString("pt-BR")]].filter(([, x]) => x).map(([k, x]) => (
                    <div key={k as string}><dt className="text-muted-foreground">{k}</dt><dd className="font-medium">{x}</dd></div>
                  ))}
                </dl>
                {v.observacao && <p className="mt-2 text-xs italic text-muted-foreground">{v.observacao}</p>}
                <div className="mt-3 flex items-center justify-between border-t pt-3 text-sm">
                  <span className="font-bold text-primary">{brl(ve.reduce((a, e) => a + Number(e.amount), 0))} <span className="text-xs font-normal text-muted-foreground">· {ve.length} gastos</span></span>
                  <ExpenseDialog plate={v.plate} vehicleName={v.model} trigger={<Button variant="outline" size="sm"><Plus className="h-3 w-3" />Gasto</Button>} />
                </div>
                {last && <p className="mt-2 text-[11px] text-muted-foreground">Último checklist: {last.checked_at ?? new Date(last.created_at).toLocaleDateString("pt-BR")}</p>}
              </div>
            );
          })}
          {s.vehicles.length === 0 && <p className="text-sm text-muted-foreground">Pasta vazia. Adicione um veículo.</p>}
        </div>
      </section>

      <section className="rounded-xl border bg-card p-4">
        <h2 className="mb-3 font-display font-extrabold text-primary">GASTOS</h2>
        <div className="divide-y text-sm">
          {exp.map((e) => (
            <div key={e.id} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="truncate font-medium">{e.description} <span className="text-muted-foreground">· {e.plate}</span></p>
                <p className="truncate text-xs text-muted-foreground">{e.expense_date?.split("-").reverse().join("/")} · {e.provider}</p>
              </div>
              <span className="shrink-0 font-bold">{brl(Number(e.amount))}</span>
            </div>
          ))}
          {exp.length === 0 && <p className="py-2 text-muted-foreground">Nenhum gasto.</p>}
        </div>
      </section>
    </div>
  );
}
