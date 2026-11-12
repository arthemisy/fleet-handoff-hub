import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Pointer, MapPin, Wrench, CheckCircle2, X, Pencil, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CATALOG, platformImage, platformsQuery, type Platform } from "@/lib/platforms";
import { fleetQuery } from "@/lib/fleet";
import { Button } from "@/components/ui/button";
import { useAskShop } from "@/components/AskShopDialog";

export const Route = createFileRoute("/_authenticated/plataformas")({
  head: () => ({ meta: [{ title: "Plataformas · Controle de Frota" }, { name: "description", content: "Plataformas elevatórias da EletroMW: onde estão e catálogo de cada modelo." }, { property: "og:title", content: "Plataformas · Controle de Frota" }, { property: "og:description", content: "Plataformas elevatórias da EletroMW." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(platformsQuery), context.queryClient.ensureQueryData(fleetQuery)]),
  component: Plataformas,
});

function Plataformas() {
  const { data } = useSuspenseQuery(platformsQuery);
  const qc = useQueryClient();
  const [open, setOpen] = useState<Platform | null>(null);
  useEffect(() => {
    const ch = supabase.channel(`plat-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "platforms" }, () => qc.invalidateQueries({ queryKey: ["platforms"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "platform_history" }, () => qc.invalidateQueries({ queryKey: ["platform_history"] }))
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
      <PlatformHistoryFeed platforms={data} />
      {open && <Catalog p={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

const br = (d: string | null) => (d ? d.split("-").reverse().join("/") : "—");

function PlatformCard({ p, onCatalog }: { p: Platform; onCatalog: () => void }) {
  const qc = useQueryClient();
  const { data: f } = useSuspenseQuery(fleetQuery);
  const [edit, setEdit] = useState(false);
  const [askShop, shopDialog] = useAskShop();
  const [form, setForm] = useState({ location: "", manager_id: "", loaned_at: "", returned_at: "" });
  const repair = p.status === "manutencao";
  const gestor = f.managers.find((m) => m.id === p.manager_id)?.name ?? "—";
  function openEdit() {
    setForm({ location: p.location ?? "", manager_id: p.manager_id ?? "", loaned_at: p.loaned_at ?? "", returned_at: p.returned_at ?? "" });
    setEdit(true);
  }
  async function save(patch: Partial<Platform>, msg: string) {
    const { error } = await supabase.from("platforms").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    toast.success(msg);
    setEdit(false);
    qc.invalidateQueries({ queryKey: ["platforms"] });
    qc.invalidateQueries({ queryKey: ["platform_history"] });
  }
  const field = "h-9 w-full rounded-md border bg-background px-2 text-sm";
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="relative bg-muted">
        <button type="button" onClick={onCatalog} aria-label={`Abrir catálogo da ${p.model}`} className="block w-full cursor-pointer">
          <img src={platformImage(p)} alt={`Plataforma ${p.model}`} loading="lazy" width={1024} height={768} className="aspect-[16/10] w-full object-contain" />
        </button>
        <img src="/logo-eletromw.png" alt="EletroMW" className="pointer-events-none absolute bottom-2 right-2 h-7 w-auto rounded-md bg-card px-2 py-1 shadow" />
        <span className="pointer-events-none absolute left-2 top-2 rounded-md bg-primary px-2 py-0.5 font-display text-base font-extrabold text-primary-foreground">{p.number}</span>
      </div>
      <button type="button" onClick={onCatalog} className="flex w-full items-center justify-center gap-1.5 border-b bg-brand-yellow py-1.5 font-display text-xs font-extrabold uppercase tracking-wide text-foreground transition-colors hover:bg-brand-yellow/80">
        <Pointer className="h-3.5 w-3.5" /> Clique para ver o catálogo
      </button>
      <div className="space-y-2.5 p-3">
        <p className="font-display text-base font-extrabold">{p.model}</p>
        <div className={`flex h-14 items-center gap-2 rounded-lg px-3 ${repair ? "bg-brand-yellow text-foreground" : "bg-primary text-primary-foreground"}`}>
          {repair ? <Wrench className="h-5 w-5 shrink-0" /> : <MapPin className="h-5 w-5 shrink-0" />}
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">{repair ? "Em manutenção" : "Localização"}</p>
            <p className="truncate text-2xl leading-tight font-extrabold">{p.location || "Sem local"}</p>
          </div>
        </div>
        <dl className="grid grid-cols-3 divide-x rounded-lg border text-center">
          <div className="p-1.5"><dt className="text-[10px] font-bold uppercase text-muted-foreground">Gestor</dt><dd className="truncate text-sm font-semibold">{gestor}</dd></div>
          <div className="p-1.5"><dt className="text-[10px] font-bold uppercase text-muted-foreground">Emprestada</dt><dd className="text-sm font-semibold">{br(p.loaned_at)}</dd></div>
          <div className="p-1.5"><dt className="text-[10px] font-bold uppercase text-muted-foreground">Devolvida</dt><dd className="text-sm font-semibold">{br(p.returned_at)}</dd></div>
        </dl>
        {edit ? (
          <div className="space-y-2 rounded-lg border p-2">
            <label className="block text-[11px] font-bold uppercase text-muted-foreground">Local<input className={field} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></label>
            <label className="block text-[11px] font-bold uppercase text-muted-foreground">Gestor
              <select className={field} value={form.manager_id} onChange={(e) => setForm({ ...form, manager_id: e.target.value })}>
                <option value="">—</option>
                {f.managers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-[11px] font-bold uppercase text-muted-foreground">Emprestada em<input type="date" className={field} value={form.loaned_at} onChange={(e) => setForm({ ...form, loaned_at: e.target.value })} /></label>
              <label className="block text-[11px] font-bold uppercase text-muted-foreground">Devolvida em<input type="date" className={field} value={form.returned_at} onChange={(e) => setForm({ ...form, returned_at: e.target.value })} /></label>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="flex-1" onClick={() => save({ location: form.location.trim() || null, manager_id: form.manager_id || null, loaned_at: form.loaned_at || null, returned_at: form.returned_at || null }, `Plataforma ${p.number} atualizada`)}>Salvar</Button>
              <Button size="sm" variant="outline" onClick={() => setEdit(false)}>Cancelar</Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" variant="outline" onClick={openEdit}><Pencil className="h-4 w-4" />Editar</Button>
            {repair
              ? <Button size="sm" variant="outline" onClick={() => save({ status: "ok", location: "Nova sede" }, `Plataforma ${p.number} consertada — voltou para a Nova sede`)}><CheckCircle2 className="h-4 w-4" />Consertada</Button>
              : <Button size="sm" variant="outline" onClick={async () => { const shop = await askShop(`Plataforma ${p.number} · ${p.model}`); if (shop) save({ status: "manutencao", location: shop }, `Plataforma ${p.number} enviada para a mecânica ${shop}`); }}><Wrench className="h-4 w-4" />Manutenção</Button>}
          </div>
        )}
      </div>
      {shopDialog}
    </div>
  );
}

function PlatformHistoryFeed({ platforms }: { platforms: Platform[] }) {
  const [limit, setLimit] = useState(15);
  const { data = [], isFetching } = useQuery({
    queryKey: ["platform_history", limit],
    placeholderData: (prev) => prev,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_history")
        .select("id, changes, user_email, created_at, platform_id")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data;
    },
  });
  const label = (id: string) => {
    const p = platforms.find((x) => x.id === id);
    return p ? { number: p.number, model: p.model } : { number: "?", model: "Plataforma removida" };
  };
  return (
    <section className="rounded-xl border bg-card shadow-sm">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <History className="h-4 w-4 text-brand-blue" />
        <div>
          <h2 className="font-display text-base font-extrabold text-brand-blue">HISTÓRICO DE MUDANÇAS</h2>
          <p className="text-xs text-muted-foreground">O que mudou em cada plataforma, quando e quem mudou.</p>
        </div>
      </div>
      <ul className="divide-y">
        {data.length === 0 && (
          <li className="px-4 py-4 text-sm text-muted-foreground">Nenhuma mudança registrada ainda.</li>
        )}
        {data.map((h) => {
          const { number, model } = label(h.platform_id);
          return (
            <li key={h.id} className="flex items-start gap-3 px-4 py-2.5">
              <span className="mt-0.5 shrink-0 rounded-md bg-primary px-2 py-0.5 font-display text-xs font-extrabold text-primary-foreground">{number}</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{h.changes}</p>
                <p className="text-xs text-muted-foreground">
                  {model} · {new Date(h.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })} · {h.user_email?.split("@")[0] ?? "sistema"}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
      {data.length === limit && (
        <div className="border-t p-3">
          <Button size="sm" variant="outline" className="w-full" disabled={isFetching} onClick={() => setLimit((n) => n + 15)}>
            Mostrar mais
          </Button>
        </div>
      )}
    </section>
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
