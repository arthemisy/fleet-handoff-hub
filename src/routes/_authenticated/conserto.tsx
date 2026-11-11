import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CheckCircle2, Wrench } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fleetQuery, normPlate } from "@/lib/fleet";
import { inMechanic } from "@/lib/mechanic";
import { PlateAutocomplete } from "@/components/PlateAutocomplete";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/conserto")({
  head: () => ({ meta: [{ title: "Conserto · Controle de Frota" }, { name: "description", content: "Carros que estão na mecânica no momento." }, { property: "og:title", content: "Conserto · Controle de Frota" }, { property: "og:description", content: "Carros da frota EletroMW em conserto." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(fleetQuery),
  component: Conserto,
});

function Conserto() {
  const { data: f } = useSuspenseQuery(fleetQuery);
  const [plate, setPlate] = useState("");
  const [shop, setShop] = useState("");
  const [busy, setBusy] = useState(false);
  const name = (id: string | null) => f.managers.find((m) => m.id === id)?.name ?? "Sem gestor";
  const list = f.vehicles.map((v) => ({ v, mech: inMechanic(v, f.checklists) })).filter((x) => x.mech);

  async function mark(id: string, state: "in" | "out", shopName: string | null) {
    setBusy(true);
    const { error } = await supabase.from("vehicles").update({ mechanic_manual: state, mechanic_shop: shopName, mechanic_changed_at: new Date().toISOString() }).eq("id", id);
    setBusy(false);
    if (error) { toast.error(error.message); return false; }
    return true;
  }
  async function send() {
    const v = f.vehicles.find((x) => normPlate(x.plate) === normPlate(plate));
    if (!v) { toast.error("Placa não encontrada na frota"); return; }
    if (await mark(v.id, "in", shop.trim() || null)) { toast.success(`${v.plate} enviado para o conserto`); setPlate(""); setShop(""); }
  }

  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-extrabold">Conserto</h1>
      <section className="space-y-3 rounded-xl border bg-card p-4">
        <h2 className="font-display font-extrabold text-primary">MANDAR PARA O CONSERTO</h2>
        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <PlateAutocomplete value={plate} onChange={setPlate} onPick={(c) => setPlate(c.plate)} placeholder="Pesquisar placa" />
          <Input value={shop} onChange={(e) => setShop(e.target.value)} placeholder="Oficina (opcional)" className="text-base" />
          <Button onClick={send} disabled={busy || !plate.trim()}><Wrench className="h-4 w-4" />Mandar para conserto</Button>
        </div>
      </section>
      <section>
        <h2 className="mb-3 font-display font-extrabold text-primary">NA MECÂNICA AGORA ({list.length})</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map(({ v, mech }) => (
            <div key={v.id} className="rounded-xl border bg-card p-4">
              <p className="font-display text-lg font-extrabold tracking-wide">{v.plate} <span className="font-sans text-sm font-normal text-muted-foreground">{v.model}</span></p>
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-brand-yellow/40 px-2 py-1 text-xs font-bold"><Wrench className="h-3.5 w-3.5" />NA MECÂNICA{typeof mech === "string" ? ` — ${mech}` : ""}</p>
              <p className="mt-2 text-sm text-muted-foreground">{name(v.manager_id)}{v.obra ? ` · ${v.obra}` : ""}</p>
              <Button className="mt-3 w-full" variant="outline" disabled={busy} onClick={async () => { if (await mark(v.id, "out", null)) toast.success(`${v.plate} consertado`); }}>
                <CheckCircle2 className="h-4 w-4 text-success" />Consertado
              </Button>
            </div>
          ))}
          {list.length === 0 && <p className="text-sm text-muted-foreground">Nenhum carro na mecânica.</p>}
        </div>
      </section>
    </div>
  );
}
