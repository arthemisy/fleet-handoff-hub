import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CheckCircle2, Wrench } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fleetQuery, normPlate } from "@/lib/fleet";
import { inMechanic, mechanicSince } from "@/lib/mechanic";
import { MechanicTag } from "@/components/MechanicTag";
import { PlateAutocomplete } from "@/components/PlateAutocomplete";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/conserto")({
  head: () => ({ meta: [{ title: "Conserto · Controle de Frota" }, { name: "description", content: "Carros que estão na mecânica no momento." }, { property: "og:title", content: "Conserto · Controle de Frota" }, { property: "og:description", content: "Carros da frota EletroMW em conserto." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(fleetQuery),
  component: Conserto,
});

function Conserto() {
  const { data: f } = useSuspenseQuery(fleetQuery);
  const [plate, setPlate] = useState("");
  const [shop, setShop] = useState("");
  const [defects, setDefects] = useState("");
  const today = () => new Date().toLocaleDateString("sv-SE");
  const [since, setSince] = useState(today());
  const [outDay, setOutDay] = useState(today());
  const [busy, setBusy] = useState(false);
  const name = (id: string | null) => f.managers.find((m) => m.id === id)?.name ?? "Sem gestor";
  const list = f.vehicles.map((v) => ({ v, mech: inMechanic(v, f.checklists) })).filter((x) => x.mech);

  async function mark(id: string, state: "in" | "out", shopName: string | null, day: string | null = null, notes: string | null = null) {
    setBusy(true);
    const { error } = await supabase.from("vehicles").update({ mechanic_manual: state, mechanic_shop: shopName, mechanic_changed_at: new Date().toISOString(), mechanic_since: day, mechanic_notes: state === "in" ? notes : null }).eq("id", id);
    setBusy(false);
    if (error) { toast.error(error.message); return false; }
    // keep the repair period so its bills are charged to the gestor who used the car before
    const v = f.vehicles.find((x) => x.id === id)!;
    const openV = f.visits.find((x) => normPlate(x.plate) === normPlate(v.plate) && !x.end_date);
    if (state === "in" && !openV) await supabase.from("mechanic_visits").insert({ plate: v.plate, start_date: day ?? today(), shop: shopName });
    if (state === "out") {
      if (openV) await supabase.from("mechanic_visits").update({ end_date: day ?? today() }).eq("id", openV.id);
      else { const since = mechanicSince(v, f.checklists); if (since) await supabase.from("mechanic_visits").insert({ plate: v.plate, start_date: since, end_date: day ?? today() }); }
    }
    return true;
  }
  async function send() {
    const v = f.vehicles.find((x) => normPlate(x.plate) === normPlate(plate));
    if (!v) { toast.error("Placa não encontrada na frota"); return; }
    if (await mark(v.id, "in", shop.trim() || null, since || today(), defects.trim() || null)) { toast.success(`${v.plate} enviado para o conserto`); setPlate(""); setShop(""); setDefects(""); setSince(today()); }
  }

  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-extrabold">Conserto</h1>
      <section className="space-y-3 rounded-xl border bg-card p-4">
        <h2 className="font-display font-extrabold text-primary">MANDAR PARA O CONSERTO</h2>
        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto]">
          <PlateAutocomplete value={plate} onChange={setPlate} onPick={(c) => setPlate(c.plate)} placeholder="Pesquisar placa" />
          <Input value={shop} onChange={(e) => setShop(e.target.value)} placeholder="Oficina (opcional)" className="text-base" />
          <label className="flex items-center gap-2 text-sm font-medium">Desde
            <Input type="date" value={since} onChange={(e) => setSince(e.target.value)} className="text-base" aria-label="Na mecânica desde" />
          </label>
          <Button onClick={send} disabled={busy || !plate.trim()}><Wrench className="h-4 w-4" />Mandar para conserto</Button>
        </div>
        <Textarea value={defects} onChange={(e) => setDefects(e.target.value)} placeholder="Defeitos do carro (opcional)" className="text-base" rows={2} aria-label="Defeitos do carro" />
      </section>
      <section>
        <h2 className="mb-3 font-display font-extrabold text-primary">NA MECÂNICA AGORA ({list.length})</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map(({ v }) => (
            <div key={v.id} className="rounded-xl border bg-card p-4">
              <p className="font-display text-lg font-extrabold tracking-wide">{v.plate} <span className="font-sans text-sm font-normal text-muted-foreground">{v.model}</span></p>
              <p className="mt-2"><MechanicTag plate={v.plate} /></p>
              <p className="mt-2 text-sm text-muted-foreground">{name(v.manager_id)}{v.obra ? ` · ${v.obra}` : ""}</p>
              <Textarea
                key={`${v.id}-${v.mechanic_notes ?? ""}`}
                defaultValue={v.mechanic_notes ?? ""}
                placeholder="Defeitos do carro"
                className="mt-3 text-base"
                rows={2}
                aria-label={`Defeitos do ${v.plate}`}
                onBlur={async (e) => {
                  const notes = e.target.value.trim() || null;
                  if (notes === (v.mechanic_notes ?? null)) return;
                  const { error } = await supabase.from("vehicles").update({ mechanic_notes: notes }).eq("id", v.id);
                  if (error) toast.error(error.message); else toast.success("Defeitos salvos");
                }}
              />
              <label className="mt-3 flex items-center gap-2 text-sm">Saiu em
                <Input type="date" value={outDay} onChange={(e) => setOutDay(e.target.value)} className="h-9 text-base" aria-label="Saiu da mecânica em" />
              </label>
              <Button className="mt-2 w-full" variant="outline" disabled={busy} onClick={async () => { if (await mark(v.id, "out", null, outDay || today())) toast.success(`${v.plate} consertado`); }}>
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
