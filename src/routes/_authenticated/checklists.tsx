import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Camera, ClipboardPaste, Sparkles, Trash2, CheckCircle2, XCircle, Save, ChevronDown, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fleetQuery, normPlate, type Checklist, type ChecklistItem } from "@/lib/fleet";
import { parseChecklist, type ParsedChecklist } from "@/lib/checklist-ai.functions";
import { Button } from "@/components/ui/button";
import { useIsAdmin } from "@/lib/use-admin";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/checklists")({
  head: () => ({ meta: [{ title: "Checklists · Controle de Frota" }, { name: "description", content: "Conferências de veículos lidas de mensagens e prints, salvas para consulta." }, { property: "og:title", content: "Checklists · Controle de Frota" }, { property: "og:description", content: "Conferências de veículos salvas para consulta." }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(fleetQuery),
  component: Checklists,
});

type Shot = { file: Blob; url: string };

async function shrink(file: File | Blob): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((r) => c.toBlob((b) => r(b!), "image/jpeg", 0.85));
}
const toDataURL = (b: Blob) => new Promise<string>((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result as string); fr.readAsDataURL(b); });

const empty: ParsedChecklist = { plate: "", model: "", responsible: "", obra: "", checked_at: "", km: null, next_belt_km: null, next_oil_km: null, items: [], notes: "" };

function Checklists() {
  const { data: f } = useSuspenseQuery(fleetQuery);
  const parse = useServerFn(parseChecklist);
  const [text, setText] = useState("");
  const [shots, setShots] = useState<Shot[]>([]);
  const [form, setForm] = useState<ParsedChecklist | null>(null);
  const [busy, setBusy] = useState<"" | "read" | "save">("");
  const [updateVehicle, setUpdateVehicle] = useState(true);
  const [filter, setFilter] = useState("");

  async function addFiles(files: Iterable<File | Blob>) {
    const next: Shot[] = [];
    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;
      const b = await shrink(file);
      next.push({ file: b, url: URL.createObjectURL(b) });
    }
    setShots((s) => [...s, ...next].slice(0, 8));
  }

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const imgs = Array.from(e.clipboardData?.files ?? []).filter((x) => x.type.startsWith("image/"));
      if (imgs.length) addFiles(imgs);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  async function read() {
    setBusy("read");
    try {
      const images = await Promise.all(shots.map((s) => toDataURL(s.file)));
      const r = await parse({ data: { text, images } });
      setForm(r);
      toast.success("Checklist lido — confira e salve");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha na leitura");
    } finally {
      setBusy("");
    }
  }

  const match = form?.plate ? f.vehicles.find((v) => normPlate(v.plate) === normPlate(form.plate)) : undefined;

  async function save() {
    if (!form?.plate?.trim()) { toast.error("Informe a placa"); return; }
    setBusy("save");
    try {
      const { data: u } = await supabase.auth.getUser();
      const paths: string[] = [];
      for (const s of shots) {
        const path = `${normPlate(form.plate)}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
        const { error } = await supabase.storage.from("checklists").upload(path, s.file, { contentType: "image/jpeg" });
        if (error) throw error;
        paths.push(path);
      }
      const { error } = await supabase.from("checklists").insert({
        plate: form.plate.trim().toUpperCase(), model: form.model || match?.model || null, responsible: form.responsible || null,
        obra: form.obra || null, checked_at: form.checked_at || null, km: form.km, next_belt_km: form.next_belt_km,
        next_oil_km: form.next_oil_km, items: form.items, notes: form.notes || null, raw_text: text || null,
        attachments: paths, created_by: u.user?.id ?? null,
      });
      if (error) throw error;
      if (updateVehicle && match) {
        const upd: { km?: number; obra?: string } = {};
        if (form.km) upd.km = form.km;
        if (form.obra) upd.obra = form.obra;
        if (Object.keys(upd).length) await supabase.from("vehicles").update(upd).eq("id", match.id);
      }
      toast.success("Checklist salvo");
      setForm(null); setText(""); setShots([]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setBusy("");
    }
  }

  const list = f.checklists.filter((c) => `${c.plate} ${c.model} ${c.responsible} ${c.obra}`.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="space-y-8">
      <h1 className="font-display text-2xl font-extrabold">Checklist de conferência</h1>

      <section className="space-y-4 rounded-xl border bg-card p-4">
        <div className="space-y-1.5">
          <Label htmlFor="raw" className="flex items-center gap-1.5"><ClipboardPaste className="h-4 w-4" />Cole a mensagem do checklist</Label>
          <Textarea id="raw" rows={7} value={text} onChange={(e) => setText(e.target.value)} placeholder={"LOGAN  MIW-0436\nRES . IGOR\nHORÁRIO .10:52 SEXTA FEIRA.\nCARTÃO 🆗 …"} />
        </div>
        <div>
          <Label className="mb-1.5 flex items-center gap-1.5"><Camera className="h-4 w-4" />Prints ou fotos (também pode colar com Ctrl+V)</Label>
          <div className="flex flex-wrap gap-2">
            {shots.map((s, i) => (
              <div key={s.url} className="relative">
                <img src={s.url} alt={`Print ${i + 1}`} className="h-24 w-20 rounded-md border object-cover" />
                <button aria-label="Remover" onClick={() => setShots(shots.filter((_, j) => j !== i))} className="absolute -right-1.5 -top-1.5 rounded-full bg-destructive p-1 text-destructive-foreground"><Trash2 className="h-3 w-3" /></button>
              </div>
            ))}
            <label className="flex h-24 w-20 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground hover:border-primary">
              <Camera className="h-5 w-5" />Adicionar
              <input aria-label="Adicionar prints" type="file" accept="image/*" multiple className="hidden" onChange={(e) => e.target.files && addFiles(e.target.files)} />
            </label>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={read} disabled={busy !== "" || (!text.trim() && !shots.length)} className="font-bold">
            <Sparkles className="h-4 w-4" />{busy === "read" ? "Lendo…" : "Ler checklist automaticamente"}
          </Button>
          <Button variant="outline" onClick={() => setForm({ ...empty })}>Preencher manualmente</Button>
        </div>
      </section>

      {form && (
        <section className="space-y-4 rounded-xl border border-primary/50 bg-card p-4">
          <h2 className="font-display font-extrabold text-primary">CONFIRA OS DADOS</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {([["plate", "Placa"], ["model", "Modelo"], ["responsible", "Responsável"], ["obra", "Obra"], ["checked_at", "Data / horário"]] as const).map(([k, l]) => (
              <div key={k} className="space-y-1"><Label>{l}</Label><Input value={form[k] ?? ""} onChange={(e) => setForm({ ...form, [k]: e.target.value })} /></div>
            ))}
            {([["km", "KM atual"], ["next_belt_km", "Próx. correia (KM)"], ["next_oil_km", "Próx. óleo (KM)"]] as const).map(([k, l]) => (
              <div key={k} className="space-y-1"><Label>{l}</Label><Input type="number" value={form[k] ?? ""} onChange={(e) => setForm({ ...form, [k]: e.target.value ? Number(e.target.value) : null })} /></div>
            ))}
          </div>
          <p className="text-sm">{match ? <>Veículo encontrado: <b>{match.plate}</b> {match.model} · {f.managers.find((m) => m.id === match.manager_id)?.name ?? "sem gestor"}</> : <span className="text-destructive">Placa não encontrada na frota — o checklist será salvo mesmo assim.</span>}</p>
          <div>
            <Label>Itens conferidos (toque para alternar)</Label>
            <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
              {form.items.map((it, i) => (
                <div key={i} className="flex items-center gap-2 rounded-md border bg-background/50 px-2 py-1.5">
                  <button aria-label="Alternar" onClick={() => setForm({ ...form, items: form.items.map((x, j) => j === i ? { ...x, ok: !x.ok } : x) })}>
                    {it.ok ? <CheckCircle2 className="h-5 w-5 text-success" /> : <XCircle className="h-5 w-5 text-destructive" />}
                  </button>
                  <Input className="h-8 border-0 bg-transparent px-1" value={it.label} onChange={(e) => setForm({ ...form, items: form.items.map((x, j) => j === i ? { ...x, label: e.target.value } : x) })} />
                  {it.note && <span className="shrink-0 text-xs text-muted-foreground">{it.note}</span>}
                  <button aria-label="Remover item" onClick={() => setForm({ ...form, items: form.items.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4 text-muted-foreground" /></button>
                </div>
              ))}
            </div>
            <Button variant="ghost" size="sm" className="mt-1" onClick={() => setForm({ ...form, items: [...form.items, { label: "", ok: true, note: null }] })}>+ Item</Button>
          </div>
          <div className="space-y-1"><Label>Observações</Label><Textarea rows={2} value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          {match && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={updateVehicle} onChange={(e) => setUpdateVehicle(e.target.checked)} />Atualizar KM e obra do veículo na tabela</label>}
          <div className="flex gap-2">
            <Button onClick={save} disabled={busy !== ""} className="font-bold"><Save className="h-4 w-4" />{busy === "save" ? "Salvando…" : "Salvar checklist"}</Button>
            <Button variant="ghost" onClick={() => setForm(null)}>Cancelar</Button>
          </div>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display font-extrabold text-primary">CONFERÊNCIAS SALVAS ({f.checklists.length})</h2>
          <Input className="max-w-xs" placeholder="Buscar placa, obra…" value={filter} onChange={(e) => setFilter(e.target.value)} />
        </div>
        {list.map((c) => <SavedChecklist key={c.id} c={c} />)}
        {list.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma conferência salva ainda.</p>}
      </section>
    </div>
  );
}

function SavedChecklist({ c }: { c: Checklist }) {
  const [open, setOpen] = useState(false);
  const isAdmin = useIsAdmin();
  const [urls, setUrls] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);
  const [ef, setEf] = useState<ParsedChecklist & { raw_text: string }>({ plate: "", model: "", responsible: "", obra: "", checked_at: "", km: null, next_belt_km: null, next_oil_km: null, items: [], notes: "", raw_text: "" });
  const [saving, setSaving] = useState(false);
  const items = (c.items as unknown as ChecklistItem[]) ?? [];
  const bad = items.filter((i) => !i.ok).length;
  useEffect(() => {
    if (!open || !c.attachments.length || urls.length) return;
    supabase.storage.from("checklists").createSignedUrls(c.attachments, 3600).then(({ data }) => setUrls((data ?? []).map((d) => d.signedUrl).filter(Boolean) as string[]));
  }, [open, c.attachments, urls.length]);
  async function remove() {
    if (!confirm("Excluir esta conferência?")) return;
    if (c.attachments.length) await supabase.storage.from("checklists").remove(c.attachments);
    const { error } = await supabase.from("checklists").delete().eq("id", c.id);
    if (error) toast.error(error.message);
  }
  function startEdit() {
    setEf({
      plate: c.plate, model: c.model ?? "", responsible: c.responsible ?? "", obra: c.obra ?? "",
      checked_at: c.checked_at ?? "", km: c.km, next_belt_km: c.next_belt_km, next_oil_km: c.next_oil_km,
      items: items.map((i) => ({ label: i.label, ok: i.ok, note: i.note ?? null })), notes: c.notes ?? "", raw_text: c.raw_text ?? "",
    });
    setEditing(true);
  }
  async function saveEdit() {
    const plate = (ef.plate ?? "").trim();
    if (!plate) { toast.error("Informe a placa"); return; }
    setSaving(true);
    const { error } = await supabase.from("checklists").update({
      plate: plate.toUpperCase(), model: ef.model || null, responsible: ef.responsible || null,
      obra: ef.obra || null, checked_at: ef.checked_at || null, km: ef.km, next_belt_km: ef.next_belt_km,
      next_oil_km: ef.next_oil_km, items: ef.items, notes: ef.notes || null, raw_text: ef.raw_text || null,
    }).eq("id", c.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Conferência atualizada");
    setEditing(false);
  }
  return (
    <div className="rounded-xl border bg-card">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 p-3 text-left">
        <div className="min-w-0 flex-1">
          <p className="font-display font-extrabold tracking-wide">{c.plate} <span className="font-sans text-sm font-normal text-muted-foreground">{c.model}</span></p>
          <p className="truncate text-xs text-muted-foreground">{c.checked_at ?? new Date(c.created_at).toLocaleString("pt-BR")} · {c.obra ?? "—"} · {c.responsible ?? "—"}</p>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${bad ? "bg-destructive/20 text-destructive" : "bg-success/20 text-success"}`}>{bad ? `${bad} pendência${bad > 1 ? "s" : ""}` : "Tudo OK"}</span>
        <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && !editing && (
        <div className="space-y-3 border-t p-3 text-sm">
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs">
            {c.km != null && <span>KM: <b>{c.km.toLocaleString("pt-BR")}</b></span>}
            {c.next_belt_km != null && <span>Próx. correia: <b>{c.next_belt_km.toLocaleString("pt-BR")}</b></span>}
            {c.next_oil_km != null && <span>Próx. óleo: <b>{c.next_oil_km.toLocaleString("pt-BR")}</b></span>}
          </div>
          <div className="grid gap-1 sm:grid-cols-2">
            {items.map((i, k) => (
              <p key={k} className="flex items-center gap-1.5">{i.ok ? <CheckCircle2 className="h-4 w-4 text-success" /> : <XCircle className="h-4 w-4 text-destructive" />}{i.label}{i.note && <span className="text-xs text-muted-foreground">· {i.note}</span>}</p>
            ))}
          </div>
          {c.notes && <p className="italic">Obs.: {c.notes}</p>}
          {urls.length > 0 && <div className="flex flex-wrap gap-2">{urls.map((u) => <a key={u} href={u} target="_blank" rel="noreferrer"><img src={u} alt="Anexo" className="h-28 rounded-md border" /></a>)}</div>}
          {c.raw_text && <details><summary className="cursor-pointer text-xs text-muted-foreground">Mensagem original</summary><pre className="mt-2 whitespace-pre-wrap rounded-md bg-background/60 p-2 text-xs">{c.raw_text}</pre></details>}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={startEdit}><Pencil className="h-4 w-4" />Editar</Button>
            {isAdmin && <Button variant="ghost" size="sm" className="text-destructive" onClick={remove}><Trash2 className="h-4 w-4" />Excluir</Button>}
          </div>
        </div>
      )}
      {open && editing && (
        <div className="space-y-4 border-t p-3 text-sm">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {([["plate", "Placa"], ["model", "Modelo"], ["responsible", "Responsável"], ["obra", "Obra"], ["checked_at", "Data / horário"]] as const).map(([k, l]) => (
              <div key={k} className="space-y-1"><Label>{l}</Label><Input value={ef[k] ?? ""} onChange={(e) => setEf({ ...ef, [k]: e.target.value })} /></div>
            ))}
            {([["km", "KM atual"], ["next_belt_km", "Próx. correia (KM)"], ["next_oil_km", "Próx. óleo (KM)"]] as const).map(([k, l]) => (
              <div key={k} className="space-y-1"><Label>{l}</Label><Input type="number" value={ef[k] ?? ""} onChange={(e) => setEf({ ...ef, [k]: e.target.value ? Number(e.target.value) : null })} /></div>
            ))}
          </div>
          <div>
            <Label>Itens conferidos (toque para alternar)</Label>
            <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
              {ef.items.map((it, i) => (
                <div key={i} className="flex items-center gap-2 rounded-md border bg-background/50 px-2 py-1.5">
                  <button aria-label="Alternar" onClick={() => setEf({ ...ef, items: ef.items.map((x, j) => j === i ? { ...x, ok: !x.ok } : x) })}>
                    {it.ok ? <CheckCircle2 className="h-5 w-5 text-success" /> : <XCircle className="h-5 w-5 text-destructive" />}
                  </button>
                  <Input className="h-8 border-0 bg-transparent px-1" value={it.label} onChange={(e) => setEf({ ...ef, items: ef.items.map((x, j) => j === i ? { ...x, label: e.target.value } : x) })} />
                  <Input className="h-8 w-28 border-0 bg-transparent px-1 text-xs" placeholder="Detalhe" value={it.note ?? ""} onChange={(e) => setEf({ ...ef, items: ef.items.map((x, j) => j === i ? { ...x, note: e.target.value || null } : x) })} />
                  <button aria-label="Remover item" onClick={() => setEf({ ...ef, items: ef.items.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4 text-muted-foreground" /></button>
                </div>
              ))}
            </div>
            <Button variant="ghost" size="sm" className="mt-1" onClick={() => setEf({ ...ef, items: [...ef.items, { label: "", ok: true, note: null }] })}>+ Item</Button>
          </div>
          <div className="space-y-1"><Label>Observações</Label><Textarea rows={2} value={ef.notes ?? ""} onChange={(e) => setEf({ ...ef, notes: e.target.value })} /></div>
          <div className="space-y-1"><Label>Mensagem original</Label><Textarea rows={5} value={ef.raw_text} onChange={(e) => setEf({ ...ef, raw_text: e.target.value })} /></div>
          <div className="flex gap-2">
            <Button onClick={saveEdit} disabled={saving} className="font-bold"><Save className="h-4 w-4" />{saving ? "Salvando…" : "Salvar alterações"}</Button>
            <Button variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button>
          </div>
        </div>
      )}
    </div>
  );
}
