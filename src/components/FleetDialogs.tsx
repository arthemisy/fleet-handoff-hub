import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { Manager, Vehicle } from "@/lib/fleet";

const VFIELDS: [keyof Vehicle, string][] = [
  ["model", "Carro / modelo"],
  ["plate", "Placa"],
  ["obra", "Obra"],
  ["projeto", "Projeto"],
  ["local", "Local"],
  ["encarregado", "Encarregado"],
  ["motorista", "Motorista"],
  ["linked_plates", "Placas vinculadas"],
  ["observacao", "Observação"],
];

export function VehicleDialog({ trigger, vehicle, managers, defaultManagerId }: {
  trigger: ReactNode; vehicle?: Vehicle; managers: Manager[]; defaultManagerId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<Record<string, string>>({});
  const init = () => {
    const v = (vehicle ?? {}) as Record<string, unknown>;
    const o: Record<string, string> = {};
    VFIELDS.forEach(([k]) => (o[k] = (v[k] as string) ?? ""));
    o.efetivos = String(vehicle?.efetivos ?? 0);
    o.km = vehicle?.km ? String(vehicle.km) : "";
    o.status = vehicle?.status ?? "Ativo";
    o.manager_id = vehicle?.manager_id ?? defaultManagerId ?? "";
    setF(o);
  };
  async function save() {
    if (!f.plate?.trim() || !f.model?.trim()) return toast.error("Informe carro e placa");
    const row = {
      ...Object.fromEntries(VFIELDS.map(([k]) => [k, f[k]?.trim() || null])),
      model: f.model.trim(),
      plate: f.plate.trim().toUpperCase(),
      efetivos: Number(f.efetivos) || 0,
      km: f.km ? Number(f.km) : null,
      status: f.status || "Ativo",
      manager_id: f.manager_id || null,
    };
    const { error } = vehicle
      ? await supabase.from("vehicles").update(row).eq("id", vehicle.id)
      : await supabase.from("vehicles").insert(row);
    if (error) return toast.error(error.message);
    toast.success("Veículo salvo");
    setOpen(false);
  }
  async function remove() {
    if (!vehicle || !confirm(`Excluir ${vehicle.plate}?`)) return;
    const { error } = await supabase.from("vehicles").delete().eq("id", vehicle.id);
    if (error) return toast.error(error.message);
    setOpen(false);
  }
  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) init(); }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{vehicle ? `Editar ${vehicle.plate}` : "Novo veículo"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1">
            <Label>Gestor (pasta)</Label>
            <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={f.manager_id} onChange={(e) => setF({ ...f, manager_id: e.target.value })}>
              <option value="">— sem gestor —</option>
              {managers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          {VFIELDS.map(([k, l]) => (
            <div key={k} className="space-y-1">
              <Label>{l}</Label>
              <Input value={f[k] ?? ""} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
            </div>
          ))}
          <div className="space-y-1"><Label>Efetivos</Label><Input type="number" value={f.efetivos ?? ""} onChange={(e) => setF({ ...f, efetivos: e.target.value })} /></div>
          <div className="space-y-1"><Label>KM atual</Label><Input type="number" value={f.km ?? ""} onChange={(e) => setF({ ...f, km: e.target.value })} /></div>
          <div className="space-y-1">
            <Label>Situação</Label>
            <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
              {["Ativo", "Devolvido", "Em manutenção", "Transferido"].map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-between gap-2 pt-2">
          {vehicle ? <Button variant="ghost" className="text-destructive" onClick={remove}>Excluir</Button> : <span />}
          <Button onClick={save} className="font-bold">Salvar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ExpenseDialog({ trigger, plate, vehicleName }: { trigger: ReactNode; plate?: string; vehicleName?: string }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ plate: "", vehicle_name: "", expense_date: "", amount: "", description: "", provider: "", tipo: "Outros" });
  async function save() {
    const amount = Number(f.amount.replace(/\./g, "").replace(",", "."));
    if (!f.plate.trim() || !amount) return toast.error("Informe placa e valor");
    const { error } = await supabase.from("expenses").insert({
      plate: f.plate.trim().toUpperCase(), vehicle_name: f.vehicle_name || null, expense_date: f.expense_date || null,
      amount, description: f.description || null, provider: f.provider || null, tipo: f.tipo, status: "Concluída",
    });
    if (error) return toast.error(error.message);
    toast.success("Gasto registrado");
    setOpen(false);
  }
  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setF({ plate: plate ?? "", vehicle_name: vehicleName ?? "", expense_date: new Date().toISOString().slice(0, 10), amount: "", description: "", provider: "", tipo: "Outros" }); }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo gasto</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1"><Label>Placa</Label><Input value={f.plate} onChange={(e) => setF({ ...f, plate: e.target.value })} /></div>
          <div className="space-y-1"><Label>Veículo</Label><Input value={f.vehicle_name} onChange={(e) => setF({ ...f, vehicle_name: e.target.value })} /></div>
          <div className="space-y-1"><Label>Data</Label><Input type="date" value={f.expense_date} onChange={(e) => setF({ ...f, expense_date: e.target.value })} /></div>
          <div className="space-y-1"><Label>Valor (R$)</Label><Input inputMode="decimal" placeholder="0,00" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></div>
          <div className="col-span-2 space-y-1"><Label>Descrição</Label><Input value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
          <div className="col-span-2 space-y-1"><Label>Prestador</Label><Input value={f.provider} onChange={(e) => setF({ ...f, provider: e.target.value })} /></div>
        </div>
        <Button onClick={save} className="mt-2 font-bold">Salvar gasto</Button>
      </DialogContent>
    </Dialog>
  );
}
