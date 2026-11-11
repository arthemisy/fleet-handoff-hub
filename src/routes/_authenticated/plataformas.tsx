import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BookOpen, MapPin, Wrench, CheckCircle2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CATALOG, platformImage, platformsQuery, type Platform } from "@/lib/platforms";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/plataformas")({
  head: () => ({ meta: [{ title: "Plataformas · Controle de Frota" }, { name: "description", content: "Plataformas elevatórias da EletroMW: onde estão e catálogo de cada modelo." }, { property: "og:title", content: "Plataformas · Controle de Frota" }, { property: "og:description", content: "Plataformas elevatórias da EletroMW." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(platformsQuery),
  component: Plataformas,
});

function Plataformas() {
  const { data } = useSuspenseQuery(platformsQuery);
  const qc = useQueryClient();
  const [open, setOpen] = useState<Platform | null>(null);
  useEffect(() => {
    const ch = supabase.channel(`plat-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "platforms" }, () => qc.invalidateQueries({ queryKey: ["platforms"] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);
  const inRepair = data.filter((p) => p.status === "manutencao").length;
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-extrabold"><span className="text-brand-blue">PLATAFORMAS</span></h1>
        <p className="text-sm text-muted-foreground">{data.length} máquinas · {inRepair} em manutenção</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {data.map((p) => <PlatformCard key={p.id} p={p} onCatalog={() => setOpen(p)} />)}
      </div>
      {open && <Catalog p={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function PlatformCard({ p, onCatalog }: { p: Platform; onCatalog: () => void }) {
  const qc = useQueryClient();
  const [loc, setLoc] = useState(p.location ?? "");
  useEffect(() => setLoc(p.location ?? ""), [p.location]);
  const repair = p.status === "manutencao";
  async function save(patch: Partial<Platform>, msg: string) {
    const { error } = await supabase.from("platforms").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    toast.success(msg);
    qc.invalidateQueries({ queryKey: ["platforms"] });
  }
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="relative bg-muted">
        <img src={platformImage(p)} alt={`Plataforma ${p.model}`} loading="lazy" width={1024} height={768} className="aspect-[4/3] w-full object-contain" />
        <img src="/logo-eletromw.png" alt="EletroMW" className="absolute bottom-3 right-3 h-8 w-auto rounded-md bg-card px-2 py-1 shadow" />
        <span className="absolute left-3 top-3 rounded-md bg-primary px-2 py-1 font-display text-lg font-extrabold text-primary-foreground">{p.number}</span>
        <button onClick={onCatalog} aria-label={`Abrir catálogo da ${p.model}`} className="absolute right-3 top-3 flex items-center gap-1 rounded-full border bg-card px-3 py-1.5 text-xs font-bold text-primary shadow">
          <BookOpen className="h-4 w-4" /> Catálogo
        </button>
      </div>
      <div className="space-y-3 p-4">
        <div>
          <p className="font-display text-lg font-extrabold">{p.model}</p>
          <p className="text-sm text-muted-foreground">Alcance {p.work_height} · {p.weight} · A nossa é {p.color?.toLowerCase()}</p>
        </div>
        {repair
          ? <span className="inline-flex items-center gap-1 rounded-md bg-brand-yellow px-2 py-1 text-xs font-bold text-foreground"><Wrench className="h-3.5 w-3.5" />EM MANUTENÇÃO</span>
          : <span className="inline-flex items-center gap-1 rounded-md bg-accent px-2 py-1 text-xs font-bold text-accent-foreground"><MapPin className="h-3.5 w-3.5" />{p.location || "Sem local"}</span>}
        <div className="flex gap-2">
          <Input aria-label="Localização atual" value={loc} onChange={(e) => setLoc(e.target.value)} />
          <Button variant="outline" disabled={loc.trim() === (p.location ?? "")} onClick={() => save({ location: loc.trim() || null }, `Plataforma ${p.number} agora em ${loc.trim()}`)}>Mover</Button>
        </div>
        {repair
          ? <Button className="w-full" variant="outline" onClick={() => save({ status: "ok" }, `Plataforma ${p.number} consertada`)}><CheckCircle2 className="h-4 w-4" />Consertada</Button>
          : <Button className="w-full" variant="outline" onClick={() => save({ status: "manutencao" }, `Plataforma ${p.number} em manutenção`)}><Wrench className="h-4 w-4" />Mandar para manutenção</Button>}
      </div>
    </div>
  );
}

function Catalog({ p, onClose }: { p: Platform; onClose: () => void }) {
  const c = CATALOG[p.catalog_key];
  const rows: [string, string | null][] = [
    ["Altura de trabalho", p.work_height], ["Altura da base", p.base_height], ["Capacidade da cesta", c?.capacity ?? null],
    ["Peso", p.weight], ["Medidas recolhida (L x C x A)", p.stowed_size], ["Nº de série", p.serial],
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div role="dialog" aria-label={`Catálogo ${p.model}`} onClick={(e) => e.stopPropagation()} className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-card shadow-xl sm:rounded-2xl">
        <div className="relative bg-muted">
          <img src={platformImage(p)} alt={p.model} width={1024} height={768} className="aspect-[4/3] w-full object-contain" />
          <img src="/logo-eletromw.png" alt="EletroMW" className="absolute bottom-3 right-3 h-8 w-auto rounded-md bg-card px-2 py-1 shadow" />
          <button onClick={onClose} aria-label="Fechar" className="absolute right-3 top-3 rounded-full border bg-card p-2"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-4 p-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-brand-red">Catálogo · Nº {p.number}</p>
            <h2 className="font-display text-2xl font-extrabold text-brand-blue">{p.model}</h2>
            {c && <p className="text-sm text-muted-foreground">{c.kind} · {c.maker} ({c.origin})</p>}
          </div>
          {c && <p className="text-base">{c.about}</p>}
          <p className="rounded-lg border bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground">A nossa é {p.color?.toLowerCase()} e está em {p.status === "manutencao" ? "manutenção" : p.location || "local não informado"}.</p>
          <dl className="grid grid-cols-2 gap-3">
            {rows.filter(([, v]) => v).map(([k, v]) => (
              <div key={k} className="rounded-lg border p-2.5"><dt className="text-[11px] font-bold uppercase text-muted-foreground">{k}</dt><dd className="font-semibold">{v}</dd></div>
            ))}
          </dl>
          {c && <div><p className="mb-1 text-sm font-bold text-primary">Destaques do modelo</p><ul className="list-disc space-y-1 pl-5 text-sm">{c.highlights.map((h) => <li key={h}>{h}</li>)}</ul></div>}
          <p className="text-xs text-muted-foreground">Imagem ilustrativa do modelo, na cor da nossa máquina.</p>
        </div>
      </div>
    </div>
  );
}
