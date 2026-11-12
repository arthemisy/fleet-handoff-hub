import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Layers, Car, Wallet, AlertTriangle, FileText, FolderOpen, Plus, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { brl, fleetQuery, managerStats } from "@/lib/fleet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Stat } from "@/components/Stat";
import { plateWarnings } from "@/lib/plates";

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({ meta: [{ title: "Painel · Controle de Frota" }, { name: "description", content: "Pastas dos gestores e gastos consolidados." }, { property: "og:title", content: "Painel · Controle de Frota" }, { property: "og:description", content: "Pastas dos gestores e gastos consolidados." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(fleetQuery),
  component: Painel,
});

function Painel() {
  const { data: f } = useSuspenseQuery(fleetQuery);
  const [newName, setNewName] = useState("");
  const stats = f.managers.map((m) => ({ m, s: managerStats(m, f) }));
  const total = stats.reduce((a, x) => a + x.s.total, 0);
  const max = Math.max(1, ...stats.map((x) => x.s.total));
  const warnings = plateWarnings(f.vehicles, f.expenses, f.managers);

  async function addManager() {
    const name = newName.trim();
    if (!name) return;
    const { error } = await supabase.from("managers").insert({ name });
    if (error) { toast.error(error.code === "23505" ? "Esse gestor já existe" : error.message); return; }
    setNewName("");
    toast.success(`Pasta de ${name} criada`);
  }

  return (
    <div className="space-y-7">
      <div>
        <h1 className="whitespace-nowrap font-title text-[clamp(1.05rem,5.2vw,1.5rem)] font-bold tracking-tight md:text-3xl"><span className="text-brand-blue">GESTÃO DE FROTA</span> <span className="text-brand-red">ELETROMW</span></h1>
        <p className="text-sm text-muted-foreground">Gestores de obra, veículos, efetivos e gastos consolidados por placa.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={Layers} label="Gestores" value={f.managers.length} tone="plain" />
        <Stat icon={Car} label="Veículos" value={f.vehicles.length} tone="blue" />
        <Stat icon={Wallet} label="Total gasto" value={brl(total)} tone="yellow" sub="Soma das pastas" />
        <Stat icon={FileText} label="Registros" value={f.expenses.length} tone="yellow" />
      </div>

      {warnings.length > 0 && (
        <details className="rounded-xl border border-destructive/50 bg-destructive/10 p-4" open={warnings.length <= 6}>
          <summary className="flex cursor-pointer items-center gap-2 font-bold text-destructive"><AlertTriangle className="h-5 w-5" />{warnings.length} aviso{warnings.length > 1 ? "s" : ""} de placa (repetida ou com erro de preenchimento)</summary>
          <ul className="mt-3 space-y-1.5 text-sm">
            {warnings.map((w, i) => (
              <li key={i} className="flex gap-2"><span className={`shrink-0 rounded px-1.5 text-[10px] font-bold uppercase leading-5 ${w.kind === "duplicate" ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"}`}>{w.kind === "duplicate" ? "Repetida" : w.kind === "invalid" ? "Formato" : "Não cadastrada"}</span>{w.message}</li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">A referência é a lista de placas da planilha de manutenções. Corrija editando o veículo.</p>
        </details>
      )}

      <section>
        <h2 className="mb-5 flex items-center gap-2 font-display font-extrabold text-primary"><FolderOpen className="h-5 w-5" />PASTAS DOS GESTORES</h2>
        <div className="grid gap-x-4 gap-y-8 sm:grid-cols-2 xl:grid-cols-3">
          {stats.map(({ m, s }) => (
            <Link key={m.id} to="/gestor/$id" params={{ id: m.id }} className="group relative block">
              <div className="absolute -top-3 left-4 h-4 w-20 rounded-t-md bg-brand-yellow" />
              <div className="relative rounded-xl border bg-folder p-4 shadow-sm transition group-hover:border-primary group-hover:shadow-md">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/20 p-2.5 text-primary"><FolderOpen className="h-5 w-5" /></div>
                  <div>
                    <p className="font-display text-lg font-extrabold">{m.name}</p>
                    <p className="text-xs text-muted-foreground">{s.vehicles.length} veículos{s.repeated ? ` · ${s.repeated} placa${s.repeated > 1 ? "s" : ""} repetida${s.repeated > 1 ? "s" : ""}` : ""}</p>
                  </div>
                </div>
                <div className="mt-4 text-center">
                  <div className="rounded-lg bg-background/60 p-2"><p className="text-[10px] uppercase text-muted-foreground">Total gasto</p><p className="font-bold text-primary">{brl(s.total)}</p></div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {s.obras.slice(0, 3).map((o) => <span key={o} className="rounded-md bg-background/60 px-2 py-0.5 text-[11px]">{o}</span>)}
                  {s.obras.length > 3 && <span className="rounded-md bg-background/60 px-2 py-0.5 text-[11px]">+{s.obras.length - 3}</span>}
                </div>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{s.expenses.length} registros de gastos</span>
                  <span className="flex items-center gap-1 font-bold text-primary">Abrir pasta <ArrowRight className="h-3 w-3" /></span>
                </div>
              </div>
            </Link>
          ))}
          <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-4 text-center">
            <div className="rounded-lg border p-2"><Plus className="h-5 w-5" /></div>
            <p className="font-bold">Nova pasta de gestor</p>
            <div className="flex w-full max-w-xs gap-2">
              <Input placeholder="Nome do gestor" value={newName} maxLength={80} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addManager()} />
              <Button onClick={addManager}>Criar</Button>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border bg-card p-4">
        <h2 className="mb-4 font-display font-extrabold text-primary">GASTOS POR GESTOR</h2>
        <div className="space-y-3">
          {[...stats].sort((a, b) => b.s.total - a.s.total).map(({ m, s }) => (
            <div key={m.id}>
              <div className="mb-1 flex justify-between text-sm"><span>{m.name}</span><span className="font-bold">{brl(s.total)}</span></div>
              <div className="h-3 rounded-full bg-muted"><div className="h-3 rounded-full bg-primary" style={{ width: `${(s.total / max) * 100}%` }} /></div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
