import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Plus, Pencil, Car, Wallet, FileText, AlertTriangle } from "lucide-react";
import { plateWarnings } from "@/lib/plates";
import { MechanicTag } from "@/components/MechanicTag";
import { useIsAdmin } from "@/lib/use-admin";
import { supabase } from "@/integrations/supabase/client";
import { brl, expensesForVehicle, fleetQuery, managerStats } from "@/lib/fleet";
import { activeSince, historyFor, normName, returnedVehicles } from "@/lib/assignments";

const br = (d?: string | null) => (d ? d.split("-").reverse().join("/") : "");
import { Button } from "@/components/ui/button";
import { VehicleDialog, ExpenseDialog } from "@/components/FleetDialogs";
import { Stat } from "@/components/Stat";

export const Route = createFileRoute("/_authenticated/gestor/$id")({
  head: () => ({ meta: [{ title: "Pasta do gestor · Controle de Frota" }, { name: "description", content: "Veículos, obras e gastos sob responsabilidade do gestor." }, { property: "og:title", content: "Pasta do gestor · Controle de Frota" }, { property: "og:description", content: "Veículos, obras e gastos do gestor." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(fleetQuery),
  component: Gestor,
});

function Gestor() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const { data: f } = useSuspenseQuery(fleetQuery);
  const isAdmin = useIsAdmin();
  const m = f.managers.find((x) => x.id === id);
  if (!m) return <p>Pasta não encontrada. <Link to="/painel" className="text-primary">Voltar</Link></p>;
  const s = managerStats(m, f);
  const owner = normName(m.name).startsWith("maicon");
  /** With the owner (Maicon) a car is "at home": only say where it was last, under which gestor. */
  const prevText = (v: (typeof f.vehicles)[number]) => {
    const hist = historyFor(v.plate, f.assignments);
    const prev = [...hist].reverse().find((a) => a.manager_id && a.manager_id !== m.id);
    const gestor = prev && f.managers.find((x) => x.id === prev.manager_id)?.name;
    const place = v.local && !/terreno/i.test(v.local) ? v.local : null;
    if (!gestor && !place && !v.projeto) return null;
    return `Estava anteriormente${gestor ? ` com o gestor ${gestor}` : ""}${place ? `, em ${place}` : ""}${v.projeto ? `, do projeto ${v.projeto}` : ""}.`.replace("anteriormente,", "anteriormente");
  };
  const returned = returnedVehicles(m, f.vehicles, f.assignments);
  const warns = plateWarnings(f.vehicles, f.expenses, f.managers);
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
    if (error) { toast.error(error.message); return; }
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
          {isAdmin && <Button variant="ghost" size="sm" className="text-destructive" onClick={remove}>Excluir pasta</Button>}
          <VehicleDialog managers={f.managers} defaultManagerId={m.id} trigger={<Button size="sm"><Plus className="h-4 w-4" />Veículo</Button>} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat icon={Car} label="Veículos" value={s.vehicles.length} tone="blue" />
        <Stat icon={Wallet} label="Total gasto" value={brl(s.total)} tone="yellow" />
        <Stat icon={FileText} label="Registros" value={s.expenses.length} tone="yellow" />
      </div>

      <section>
        <h2 className="mb-3 font-display font-extrabold text-primary">VEÍCULOS</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {s.vehicles.map((v) => {
            const ve = expensesForVehicle(v, s.expenses);
            const since = activeSince(v, f.assignments);
            const hist = historyFor(v.plate, f.assignments);
            const lastMine = [...hist].reverse().find((a) => a.manager_id === m.id);
            const received = owner && hist.length > 1 && lastMine?.start_date && hist.indexOf(lastMine) > 0 ? lastMine.start_date : null;
            const last = [...f.checklists].reverse().find((c) => c.plate.replace(/\W/g, "") === v.plate.replace(/\W/g, ""));
            return (
              <div key={v.id} className="rounded-xl border bg-card p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-display text-lg font-extrabold tracking-wide">{v.plate}</p>
                    <p className="text-sm text-muted-foreground">{v.model}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${v.status === "Ativo" ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"}`}>{v.status === "Ativo" && received ? `RECEBIDO EM ${br(received)}` : v.status === "Ativo" && since ? `ATIVO DESDE ${br(since)}` : v.status}</span>
                    <VehicleDialog vehicle={v} managers={f.managers} trigger={<Button variant="ghost" size="icon" aria-label="Editar"><Pencil className="h-4 w-4" /></Button>} />
                  </div>
                </div>
                <MechanicTag plate={v.plate} className="mt-2" />
                {owner && prevText(v) && <p className="mt-3 rounded-md bg-muted px-2 py-1.5 text-xs">{prevText(v)}</p>}
                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  {(owner ? [["KM", v.km?.toLocaleString("pt-BR")]] : [["Obra", v.obra], ["Projeto", v.projeto], ["Local", v.local], ["Encarregado", v.encarregado], ["Motorista", v.motorista], ["KM", v.km?.toLocaleString("pt-BR")]]).filter(([, x]) => x).map(([k, x]) => (
                    <div key={k as string}><dt className="text-muted-foreground">{k}</dt><dd className="font-medium">{x}</dd></div>
                  ))}
                </dl>
                {warns.filter((w) => w.vehicleIds.includes(v.id)).map((w, i) => <p key={i} className="mt-2 flex gap-1.5 rounded-md bg-destructive/15 p-2 text-xs text-destructive"><AlertTriangle className="h-4 w-4 shrink-0" />{w.message}</p>)}
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

      {returned.length > 0 && (
        <section>
          <h2 className="mb-3 font-display font-extrabold text-primary">{owner ? "VEÍCULOS EMPRESTADOS" : "VEÍCULOS DEVOLVIDOS"}</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {returned.map(({ vehicle: v, returnedOn, heldFrom }) => {
              const ve = expensesForVehicle(v, s.expenses);
              const days = heldFrom && returnedOn ? Math.round((Date.parse(returnedOn) - Date.parse(heldFrom)) / 86400000) : null;
              return (
                <div key={v.id} className="rounded-xl border bg-muted/40 p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-display text-lg font-extrabold tracking-wide">{v.plate}</p>
                      <p className="text-sm text-muted-foreground">{v.model}</p>
                    </div>
                    <span className="rounded-full bg-destructive/20 px-2 py-0.5 text-[11px] font-bold text-destructive">{owner ? "EMPRESTADO" : "DEVOLVIDO"}{returnedOn ? ` EM ${br(returnedOn)}` : ""}</span>
                  </div>
                  <MechanicTag plate={v.plate} className="mt-2" />
                  {!owner && (heldFrom || returnedOn) && <p className="mt-2 text-sm">Utilizou {heldFrom ? `de ${br(heldFrom)} ` : ""}{returnedOn ? `a ${br(returnedOn)}` : ""}{days != null ? ` (${days} dias)` : ""}</p>}
                  <p className="mt-1 text-sm">Agora com: <b>{f.managers.find((x) => x.id === v.manager_id)?.name ?? "—"}</b>{v.obra ? ` (${v.obra})` : ""}</p>
                  <p className="mt-2 border-t pt-2 text-sm font-bold text-primary">{brl(ve.reduce((a, e) => a + Number(e.amount), 0))} <span className="text-xs font-normal text-muted-foreground">· {ve.length} gastos enquanto esteve com {m.name.split(" ")[0]}</span></p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="rounded-xl border bg-card p-4">
        <h2 className="mb-3 font-display font-extrabold text-primary">GASTOS</h2>
        <div className="divide-y text-sm">
          {exp.map((e) => (
            <div key={e.id} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="truncate font-medium">{e.description} <span className="text-muted-foreground">· {e.plate}</span>{f.repairBilled.has(e.id) && <span className="ml-1 rounded bg-brand-yellow/40 px-1.5 text-[10px] font-bold">CONSERTO APÓS USO</span>}</p>
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
