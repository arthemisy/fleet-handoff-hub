import { createFileRoute } from "@tanstack/react-router";
import { MechanicTag } from "@/components/MechanicTag";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, type ChangeEvent } from "react";
import { toast } from "sonner";
import { Camera, ClipboardPaste, Sparkles, Trash2, CheckCircle2, XCircle, Save, ChevronDown, Pencil, Car, ClipboardList, ImagePlus, Send } from "lucide-react";
import { checklistWhatsAppText, whatsappLink } from "@/lib/checklist-share";
import { supabase } from "@/integrations/supabase/client";
import { fleetQuery, normPlate, type Checklist, type ChecklistItem } from "@/lib/fleet";
import { parseChecklist } from "@/lib/checklist-ai.functions";
import { dateStr, hm, legacyDateTime, timeStr, whenLabel } from "@/lib/checklist-time";
import { Button, buttonVariants } from "@/components/ui/button";
import { ChecklistItemsEditor } from "@/components/ChecklistItemsEditor";
import { createManualItems, reviewedItems } from "@/lib/checklist-template";
import { freshChecklist, type ChecklistDraft } from "@/lib/checklist-draft";
import { PlateAutocomplete } from "@/components/PlateAutocomplete";
import { useIsAdmin } from "@/lib/use-admin";
import { historyFor, isTerreno, resolveGestor, terrenoConflict, terrenoManager } from "@/lib/assignments";
import type { PlateCandidate } from "@/lib/plate-search";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/checklists")({
  head: () => ({ meta: [{ title: "Checklists · Controle de Frota" }, { name: "description", content: "Conferências de veículos lidas de mensagens e prints, salvas para consulta." }, { property: "og:title", content: "Checklists · Controle de Frota" }, { property: "og:description", content: "Conferências de veículos salvas para consulta." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(fleetQuery),
  component: Checklists,
});


type Shot = { file: Blob; url: string };
const LBL = "text-base font-semibold";
const INP = "h-12 text-base";

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

/** Two pickers side by side: the phone's rear camera for a new shot, the gallery for photos that already exist. */
function PhotoButtons({ onFiles, disabled }: { onFiles: (files: File[]) => void; disabled?: boolean }) {
  const pick = (e: ChangeEvent<HTMLInputElement>) => {
    // copy the list first: clearing the input also empties the live FileList the handler is holding
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length) onFiles(files);
  };
  return (
    <div className="flex flex-wrap gap-2">
      <label className={cn(buttonVariants({ variant: "default" }), "cursor-pointer")}>
        <Camera className="h-4 w-4" />Tirar foto
        <input aria-label="Tirar foto com a câmera" type="file" accept="image/*" capture="environment" disabled={disabled} className="hidden" onChange={pick} />
      </label>
      <label className={cn(buttonVariants({ variant: "outline" }), "cursor-pointer")}>
        <ImagePlus className="h-4 w-4" />Galeria / Anexar
        <input aria-label="Anexar fotos da galeria" type="file" accept="image/*" multiple disabled={disabled} className="hidden" onChange={pick} />
      </label>
    </div>
  );
}

function Checklists() {
  const { data: f } = useSuspenseQuery(fleetQuery);
  const parse = useServerFn(parseChecklist);
  const [text, setText] = useState("");
  const [shots, setShots] = useState<Shot[]>([]);
  const [form, setForm] = useState<ChecklistDraft>(freshChecklist);
  const [busy, setBusy] = useState<"" | "read" | "save">("");
  const [filter, setFilter] = useState("");
  const isAdmin = useIsAdmin();

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
    if (!isAdmin) return; // pasting prints is one of the admin-only ways in
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [isAdmin]);

  async function read() {
    setBusy("read");
    try {
      const images = await Promise.all(shots.map((s) => toDataURL(s.file)));
      const r = await parse({ data: { text, images, today: dateStr(new Date()) } });
      setForm({ ...r, gestor: form.gestor, funcionario: r.responsible || form.funcionario, checked_date: r.checked_date || dateStr(new Date()), checked_time: r.checked_time || timeStr(new Date()) });
      toast.success("Checklist lido — confira e salve");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha na leitura");
    } finally {
      setBusy("");
    }
  }

  const match = form.plate ? f.vehicles.find((v) => normPlate(v.plate) === normPlate(form.plate)) : undefined;
  const hasContent = form.items.length > 0 || text.trim().length > 0 || shots.length > 0;

  /** Choosing a plate from the list also fills whatever is still blank about that car. */
  function fillFrom(p: PlateCandidate) {
    setForm((prev) => ({
      ...prev,
      plate: p.plate,
      model: prev.model || p.model || "",
      obra: prev.obra || p.obra || "",
      gestor: prev.gestor || p.manager || "",
    }));
  }

  /** Typing an employee's name in GESTOR moves it to FUNCIONÁRIO and fills in their boss. */
  function checkGestor() {
    const r = resolveGestor(form.gestor ?? "", f.managers, f.vehicles, f.assignments);
    if (r.kind === "employee") {
      setForm((p) => ({ ...p, gestor: r.manager.name, funcionario: p.funcionario || r.employee }));
      toast.info(`${r.employee} é funcionário de ${r.manager.name}`);
    }
  }
  const gestorInfo = resolveGestor(form.gestor ?? "", f.managers, f.vehicles, f.assignments);

  /** The checklist hands the car over: new gestor's folder from that date on, the old one keeps what was spent before. */
  async function handover(checklistId: string | null) {
    let r = resolveGestor(form.gestor ?? "", f.managers, f.vehicles, f.assignments);
    const yard = isTerreno(form.obra) ? terrenoManager(f.managers) : undefined;
    if (yard) r = { kind: "manager", manager: yard };
    let employee = (form.funcionario ?? "").trim() || null;
    if (r.kind === "empty") return;
    if (r.kind === "employee") { employee = employee ?? r.employee; r = { kind: "manager", manager: r.manager }; }
    let managerId: string;
    if (r.kind === "new") {
      const { data, error } = await supabase.from("managers").insert({ name: r.name }).select("id").single();
      if (error) throw error;
      managerId = data.id;
      toast.success(`Pasta criada para ${r.name}`);
    } else managerId = r.manager.id;
    const date = form.checked_date || dateStr(new Date());
    const plate = (form.plate ?? "").trim().toUpperCase();
    if (!match) {
      const { error } = await supabase.from("vehicles").insert({ plate, model: form.model || "", manager_id: managerId, encarregado: employee, obra: form.obra || null, km: form.km, status: "Ativo" });
      if (error) throw error;
      await supabase.from("vehicle_assignments").insert({ plate, manager_id: managerId, employee, start_date: date, checklist_id: checklistId });
    }
    // The database moves the car (gestor, funcionário, obra, KM) and records the custody change from this checklist.
    if (checklistId) {
      const { error } = await supabase.from("checklists").update({ manager_id: managerId, employee }).eq("id", checklistId);
      if (error) throw error;
    }
  }

  async function save() {
    if (!form.plate?.trim()) { toast.error("Informe a placa"); return; }
    if ((form.funcionario ?? "").trim() && !(form.gestor ?? "").trim()) { toast.error("Informe o gestor desse funcionário"); return; }
    if (terrenoConflict(form.obra, gestorInfo.kind === "manager" || gestorInfo.kind === "employee" ? gestorInfo.manager.id : gestorInfo.kind === "new" ? "new" : null, f.managers)) {
      toast.error("A obra \"Terreno\" é só do Maicon Dias (é a garagem). Se o carro está com outro gestor, ele está saindo do terreno: informe a obra para onde ele vai.");
      return;
    }
    setBusy("save");
    try {
      const items = reviewedItems(form.items);
      const { data: u } = await supabase.auth.getUser();
      const paths: string[] = [];
      for (const s of shots) {
        const path = `${normPlate(form.plate)}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
        const { error } = await supabase.storage.from("checklists").upload(path, s.file, { contentType: "image/jpeg" });
        if (error) throw error;
        paths.push(path);
      }
      const gestorName = gestorInfo.kind === "manager" || gestorInfo.kind === "employee" ? gestorInfo.manager.name : (form.gestor ?? "").trim() || null;
      const { data: saved, error } = await supabase.from("checklists").insert({
        manager_name: gestorName, employee: (form.funcionario ?? "").trim() || null,
        manager_id: gestorInfo.kind === "manager" || gestorInfo.kind === "employee" ? gestorInfo.manager.id : null,
        plate: form.plate.trim().toUpperCase(), model: form.model || match?.model || null, responsible: (form.funcionario ?? "").trim() || gestorName,
        obra: form.obra || null, checked_date: form.checked_date || null, checked_time: form.checked_time || null, km: form.km, next_belt_km: form.next_belt_km,
        next_oil_km: form.next_oil_km, items, notes: form.notes || null, raw_text: text || null,
        attachments: paths, created_by: u.user?.id ?? null,
      }).select("id").single();
      if (error) throw error;
      await handover(saved.id);
      toast.success("Checklist salvo");
      setForm(freshChecklist()); setText(""); setShots([]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setBusy("");
    }
  }

  function clearAll() {
    setForm(freshChecklist()); setText(""); setShots([]);
  }

  const list = f.checklists.filter((c) => `${c.plate} ${c.model} ${c.responsible} ${c.obra}`.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-extrabold">Checklist de conferência</h1>

      {/* 1. Vehicle identification — always the first thing on screen */}
      <section className="space-y-3 rounded-xl border-2 border-primary/50 bg-card p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Car className="h-5 w-5 text-primary" />
          <h2 className="font-display text-base font-extrabold uppercase tracking-wide text-primary">Veículo conferido</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="plate" className={LBL}>Placa</Label>
            <PlateAutocomplete id="plate" className="h-12 font-display text-xl font-extrabold uppercase tracking-wider" value={form.plate ?? ""} onChange={(v) => setForm({ ...form, plate: v })} onPick={fillFrom} />
          </div>
          <div className="space-y-1.5 md:col-span-2"><Label className={LBL}>Modelo</Label><Input className={INP} value={form.model ?? ""} onChange={(e) => setForm({ ...form, model: e.target.value })} /></div>
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="gestor" className={LBL}>Gestor{(form.funcionario ?? "").trim() && <span className="text-destructive"> *</span>}</Label>
            <Input id="gestor" list="gestores-list" autoComplete="off" className={INP} value={form.gestor ?? ""} onChange={(e) => setForm({ ...form, gestor: e.target.value })} onBlur={checkGestor} />
            <datalist id="gestores-list">{f.managers.map((m) => <option key={m.id} value={m.name} />)}</datalist>
            {gestorInfo.kind === "new" && <p className="text-sm text-muted-foreground">Uma nova pasta será criada para <b>{gestorInfo.name}</b>.</p>}
          </div>
          <div className="col-span-2 space-y-1.5"><Label htmlFor="func" className={LBL}>Funcionário</Label><Input id="func" className={INP} value={form.funcionario ?? ""} onChange={(e) => setForm({ ...form, funcionario: e.target.value })} /></div>
          <div className="col-span-2 space-y-1.5 md:col-span-4"><Label className={LBL}>Obra</Label><Input className={INP} value={form.obra ?? ""} onChange={(e) => setForm({ ...form, obra: e.target.value })} /></div>
          <div className="space-y-1.5"><Label className={LBL}>Data</Label><Input type="date" className={INP} value={form.checked_date ?? ""} onChange={(e) => setForm({ ...form, checked_date: e.target.value || null })} /></div>
          <div className="space-y-1.5"><Label className={LBL}>Hora</Label><Input type="time" className={INP} value={form.checked_time ?? ""} onChange={(e) => setForm({ ...form, checked_time: e.target.value || null })} /></div>
          {([["km", "KM atual"], ["next_belt_km", "Próx. correia (KM)"], ["next_oil_km", "Próx. óleo (KM)"]] as const).map(([k, l]) => (
            <div key={k} className="space-y-1.5"><Label className={LBL}>{l}</Label><Input type="number" inputMode="numeric" className={INP} value={form[k] ?? ""} onChange={(e) => setForm({ ...form, [k]: e.target.value ? Number(e.target.value) : null })} /></div>
          ))}
        </div>
        {(form.plate ?? "").trim() && (match
          ? <p className="rounded-lg bg-success/10 px-3 py-2 text-base">Veículo encontrado: <b>{match.plate}</b> {match.model} · {f.managers.find((m) => m.id === match.manager_id)?.name ?? "sem gestor"}</p>
          : <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">Placa não encontrada na frota — confira se digitou certo. Ao salvar com gestor, o carro é cadastrado.</p>)}
      </section>

      {/* 2. The message / prints the conference came from */}
      <section className="space-y-4 rounded-xl border bg-card p-4">
{isAdmin && (
        <div className="space-y-1.5">
          <Label htmlFor="raw" className="flex items-center gap-1.5"><ClipboardPaste className="h-4 w-4" />Cole a mensagem do checklist</Label>
          <Textarea id="raw" rows={7} value={text} onChange={(e) => setText(e.target.value)} placeholder={"LOGAN  MIW-0436\nRES . IGOR\nHORÁRIO .10:52 SEXTA FEIRA.\nCARTÃO 🆗 …"} />
        </div>
)}
        <div className="space-y-2">
          <Label className={cn(LBL, "flex items-center gap-1.5")}><Camera className="h-5 w-5" />Fotos</Label>
          {shots.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {shots.map((s, i) => (
                <div key={s.url} className="relative">
                  <img src={s.url} alt={`Print ${i + 1}`} className="h-24 w-20 rounded-md border object-cover" />
                  <button aria-label="Remover" onClick={() => setShots(shots.filter((_, j) => j !== i))} className="absolute -right-1.5 -top-1.5 rounded-full bg-destructive p-1 text-destructive-foreground"><Trash2 className="h-3 w-3" /></button>
                </div>
              ))}
            </div>
          )}
          <PhotoButtons onFiles={addFiles} disabled={busy !== ""} />
        </div>
        <div className="flex flex-wrap gap-2">
          {isAdmin && <Button onClick={read} disabled={busy !== "" || (!text.trim() && !shots.length)} className="font-bold">
            <Sparkles className="h-4 w-4" />{busy === "read" ? "Lendo…" : "Ler checklist automaticamente"}
          </Button>}
          <Button size="lg" variant={isAdmin ? "outline" : "default"} className="text-base font-bold" onClick={() => setForm((p) => ({ ...p, items: createManualItems() }))}>
            <ClipboardList className="h-4 w-4" />Preencher manualmente
          </Button>
        </div>
      </section>

      {/* 3. The points themselves + observations */}
      {form.items.length > 0 && (
        <section className="space-y-4 rounded-xl border border-primary/40 bg-card p-4">
          <h2 className="font-display font-extrabold text-primary">ITENS DA CONFERÊNCIA</h2>
          <ChecklistItemsEditor items={form.items} onChange={(items) => setForm({ ...form, items })} />
          <div className="space-y-1"><Label>Observações</Label><Textarea rows={2} value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        </section>
      )}

      <div className="flex flex-wrap gap-2">
        <Button size="lg" onClick={save} disabled={busy !== "" || !hasContent} className="text-base font-bold"><Save className="h-4 w-4" />{busy === "save" ? "Salvando…" : "Salvar checklist"}</Button>
        <Button variant="ghost" onClick={clearAll}>Limpar</Button>
      </div>

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
  const [urlMap, setUrlMap] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState(false);
  const [ef, setEf] = useState<ChecklistDraft & { raw_text: string }>({ plate: "", model: "", responsible: "", obra: "", checked_date: null, checked_time: null, km: null, next_belt_km: null, next_oil_km: null, items: [], notes: "", raw_text: "" });
  const [att, setAtt] = useState<string[]>([]);
  const [newShots, setNewShots] = useState<Shot[]>([]);
  const [saving, setSaving] = useState(false);
  const items = (c.items as unknown as ChecklistItem[]) ?? [];
  const bad = items.filter((i) => !i.ok).length;
  const missing = c.attachments.filter((p) => !urlMap[p]);
  useEffect(() => {
    if (!open || !missing.length) return;
    supabase.storage.from("checklists").createSignedUrls(missing, 3600).then(({ data }) => {
      const m: Record<string, string> = {};
      (data ?? []).forEach((d) => { if (d.path && d.signedUrl) m[d.path] = d.signedUrl; });
      setUrlMap((u) => ({ ...u, ...m }));
    });
  }, [open, missing.join("|")]);
  const urls = c.attachments.map((p) => urlMap[p]).filter(Boolean) as string[];

  /** Choosing a plate from the list also fills whatever is still blank about that car. */
  function fillEditFrom(p: PlateCandidate) {
    setEf((prev) => ({
      ...prev,
      plate: p.plate,
      model: prev.model || p.model || "",
      obra: prev.obra || p.obra || "",
      responsible: prev.responsible || p.manager || "",
    }));
  }
  async function remove() {
    if (!confirm("Excluir esta conferência?")) return;
    if (c.attachments.length) await supabase.storage.from("checklists").remove(c.attachments);
    const { error } = await supabase.from("checklists").delete().eq("id", c.id);
    if (error) toast.error(error.message);
  }
  function startEdit() {
    setEf({
      plate: c.plate, model: c.model ?? "", responsible: c.responsible ?? "", obra: c.obra ?? "",
      checked_date: c.checked_date ?? legacyDateTime(c.checked_at).checked_date,
      checked_time: hm(c.checked_time) || legacyDateTime(c.checked_at).checked_time,
      km: c.km, next_belt_km: c.next_belt_km, next_oil_km: c.next_oil_km,
      items: items.map((i) => ({ label: i.label, ok: i.ok, note: i.note ?? null })), notes: c.notes ?? "", raw_text: c.raw_text ?? "",
    });
    setAtt([...c.attachments]);
    setNewShots([]);
    setEditing(true);
  }
  async function addEditFiles(files: Iterable<File>) {
    const next: Shot[] = [];
    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;
      const b = await shrink(file);
      next.push({ file: b, url: URL.createObjectURL(b) });
    }
    setNewShots((s) => [...s, ...next]);
  }
  async function saveEdit() {
    const plate = (ef.plate ?? "").trim();
    if (!plate) { toast.error("Informe a placa"); return; }
    setSaving(true);
    try {
      const updatedItems = reviewedItems(ef.items);
      const paths: string[] = [];
      for (const s of newShots) {
        const path = `${normPlate(plate)}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
        const { error } = await supabase.storage.from("checklists").upload(path, s.file, { contentType: "image/jpeg" });
        if (error) throw error;
        paths.push(path);
      }
      const { error } = await supabase.from("checklists").update({
        plate: plate.toUpperCase(), model: ef.model || null, responsible: ef.responsible || null,
        obra: ef.obra || null, checked_date: ef.checked_date || null, checked_time: ef.checked_time || null, km: ef.km, next_belt_km: ef.next_belt_km,
        next_oil_km: ef.next_oil_km, items: updatedItems, notes: ef.notes || null, raw_text: ef.raw_text || null,
        attachments: [...att, ...paths],
      }).eq("id", c.id);
      if (error) throw error;
      toast.success("Conferência atualizada");
      setEditing(false);
      setNewShots([]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="rounded-xl border bg-card">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 p-3 text-left">
        <div className="min-w-0 flex-1">
          <p className="font-display font-extrabold tracking-wide">{c.plate} <span className="font-sans text-sm font-normal text-muted-foreground">{c.model}</span> <MechanicTag plate={c.plate} /></p>
          <p className="truncate text-xs text-muted-foreground">{whenLabel(c)} · {c.obra ?? "—"} · {[c.manager_name, c.employee].filter(Boolean).join(" · ") || c.responsible || "—"}</p>
        </div>
        <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", items.length === 0 ? "bg-muted text-muted-foreground" : bad ? "bg-destructive/20 text-destructive" : "bg-success/20 text-success")}>{items.length === 0 ? "Sem pontos marcados" : bad ? `${bad} pendência${bad > 1 ? "s" : ""}` : `${items.length} ponto${items.length > 1 ? "s" : ""} OK`}</span>
        <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && !editing && (
        <div className="space-y-3 border-t p-3 text-sm">
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs">
            {c.km != null && <span>KM: <b>{c.km.toLocaleString("pt-BR")}</b></span>}
            {c.next_belt_km != null && <span>Próx. correia: <b>{c.next_belt_km.toLocaleString("pt-BR")}</b></span>}
            {c.next_oil_km != null && <span>Próx. óleo: <b>{c.next_oil_km.toLocaleString("pt-BR")}</b></span>}
          </div>
          {items.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum ponto foi marcado nesta conferência.</p>
          ) : (
            <div className="grid gap-1 sm:grid-cols-2">
              {items.map((i, k) => (
                <p key={k} className="flex items-center gap-1.5">{i.ok ? <CheckCircle2 className="h-4 w-4 text-success" /> : <XCircle className="h-4 w-4 text-destructive" />}{i.label}{i.note && <span className="text-xs text-muted-foreground">· {i.note}</span>}</p>
              ))}
            </div>
          )}
          {c.notes && <p className="italic">Obs.: {c.notes}</p>}
          {urls.length > 0 && <div className="flex flex-wrap gap-2">{urls.map((u) => <a key={u} href={u} target="_blank" rel="noreferrer"><img src={u} alt="Anexo" className="h-28 rounded-md border" /></a>)}</div>}
          {c.raw_text && <details><summary className="cursor-pointer text-xs text-muted-foreground">Mensagem original</summary><pre className="mt-2 whitespace-pre-wrap rounded-md bg-background/60 p-2 text-xs">{c.raw_text}</pre></details>}
          <div className="flex gap-2">
            <a className={buttonVariants({ size: "sm" })} target="_blank" rel="noreferrer" href={whatsappLink(checklistWhatsAppText({ plate: c.plate, model: c.model, when: whenLabel(c), obra: c.obra, gestor: c.manager_name, employee: c.employee ?? c.responsible, km: c.km, items, notes: c.notes }))}><Send className="h-4 w-4" />WhatsApp</a>
            <Button variant="outline" size="sm" onClick={startEdit}><Pencil className="h-4 w-4" />Editar</Button>
            {isAdmin && <Button variant="ghost" size="sm" className="text-destructive" onClick={remove}><Trash2 className="h-4 w-4" />Excluir</Button>}
          </div>
        </div>
      )}
      {open && editing && (
        <div className="space-y-4 border-t p-3 text-sm">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="space-y-1"><Label htmlFor="edit-plate">Placa</Label><PlateAutocomplete id="edit-plate" value={ef.plate ?? ""} onChange={(v) => setEf({ ...ef, plate: v })} onPick={fillEditFrom} /></div>
            {(["model", "responsible", "obra"] as const).map((k) => (
              <div key={k} className="space-y-1"><Label>{k === "model" ? "Modelo" : k === "responsible" ? "Responsável" : "Obra"}</Label><Input value={ef[k] ?? ""} onChange={(e) => setEf({ ...ef, [k]: e.target.value })} /></div>
            ))}
            <div className="space-y-1"><Label className="flex items-center justify-between">Data<button type="button" className="text-xs text-primary" onClick={() => setEf({ ...ef, checked_date: dateStr(new Date()) })}>hoje</button></Label><Input type="date" value={ef.checked_date ?? ""} onChange={(e) => setEf({ ...ef, checked_date: e.target.value || null })} /></div>
            <div className="space-y-1"><Label className="flex items-center justify-between">Hora<button type="button" className="text-xs text-primary" onClick={() => setEf({ ...ef, checked_time: timeStr(new Date()) })}>agora</button></Label><Input type="time" value={ef.checked_time ?? ""} onChange={(e) => setEf({ ...ef, checked_time: e.target.value || null })} /></div>
            {([["km", "KM atual"], ["next_belt_km", "Próx. correia (KM)"], ["next_oil_km", "Próx. óleo (KM)"]] as const).map(([k, l]) => (
              <div key={k} className="space-y-1"><Label>{l}</Label><Input type="number" value={ef[k] ?? ""} onChange={(e) => setEf({ ...ef, [k]: e.target.value ? Number(e.target.value) : null })} /></div>
            ))}
          </div>
          <ChecklistItemsEditor items={ef.items} onChange={(items) => setEf({ ...ef, items })} />
          <div className="space-y-1"><Label>Observações</Label><Textarea rows={2} value={ef.notes ?? ""} onChange={(e) => setEf({ ...ef, notes: e.target.value })} /></div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5"><Camera className="h-4 w-4" />Fotos e prints</Label>
            {(att.length > 0 || newShots.length > 0) && (
              <div className="flex flex-wrap gap-2">
                {att.map((p) => (
                  <div key={p} className="relative">
                    {urlMap[p] ? <img src={urlMap[p]} alt="Anexo" className="h-24 w-20 rounded-md border object-cover" /> : <div className="h-24 w-20 rounded-md border bg-muted" />}
                    <button aria-label="Remover foto" onClick={() => setAtt(att.filter((x) => x !== p))} className="absolute -right-1.5 -top-1.5 rounded-full bg-destructive p-1 text-destructive-foreground"><Trash2 className="h-3 w-3" /></button>
                  </div>
                ))}
                {newShots.map((s, i) => (
                  <div key={s.url} className="relative">
                    <img src={s.url} alt="Nova foto" className="h-24 w-20 rounded-md border border-primary object-cover" />
                    <button aria-label="Remover foto" onClick={() => setNewShots(newShots.filter((_, j) => j !== i))} className="absolute -right-1.5 -top-1.5 rounded-full bg-destructive p-1 text-destructive-foreground"><Trash2 className="h-3 w-3" /></button>
                  </div>
                ))}
              </div>
            )}
            <PhotoButtons onFiles={addEditFiles} disabled={saving} />
          </div>
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
