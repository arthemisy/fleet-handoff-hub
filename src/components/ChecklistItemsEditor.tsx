import { Check, X, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { checklistGroup, type DraftChecklistItem } from "@/lib/checklist-template";

type Props = { items: DraftChecklistItem[]; onChange: (items: DraftChecklistItem[]) => void };

export function ChecklistItemsEditor({ items, onChange }: Props) {
  const groups = [...new Set(items.map((item) => checklistGroup(item.label)))];
  function update(index: number, patch: Partial<DraftChecklistItem>) {
    onChange(items.map((item, i) => i === index ? { ...item, ...patch } : item));
  }
  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <fieldset key={group} className="min-w-0 space-y-2">
          <legend className="mb-2 text-sm font-semibold text-primary">{group}</legend>
          <div className="grid gap-x-5 sm:grid-cols-2">
            {items.map((item, index) => checklistGroup(item.label) === group && (
              <div key={index} className="min-w-0 space-y-2 border-b py-3" data-checklist-item={item.label}>
                <div className="flex items-center gap-2">
                  <Input aria-label={`Nome do item ${index + 1}`} className="min-w-0 flex-1 border-transparent bg-transparent px-1 text-sm" value={item.label} onChange={(e) => update(index, { label: e.target.value })} />
                  <div className="flex shrink-0 gap-1" role="group" aria-label={`Resultado: ${item.label || "novo item"}`}>
                    <Button type="button" variant="outline" size="sm" aria-label={`OK: ${item.label}`} aria-pressed={item.ok === true} title="OK" className={`h-9 w-11 px-0 ${item.ok === true ? "border-success bg-success/20 text-success" : "text-muted-foreground"}`} onClick={() => update(index, { ok: true })}><Check className="h-4 w-4" /><span className="text-xs">OK</span></Button>
                    <Button type="button" variant="outline" size="icon" aria-label={`Reprovado: ${item.label}`} aria-pressed={item.ok === false} title="Reprovado" className={`h-9 w-9 ${item.ok === false ? "border-destructive bg-destructive/20 text-destructive" : "text-muted-foreground"}`} onClick={() => update(index, { ok: false })}><X className="h-4 w-4" /></Button>
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground" aria-label={`Remover item: ${item.label}`} title="Remover item" onClick={() => onChange(items.filter((_, i) => i !== index))}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
                <Textarea aria-label={`Observação: ${item.label}`} rows={2} className={`min-h-14 text-sm ${item.ok === false ? "border-destructive/50" : ""}`} placeholder={item.ok === false ? "Descreva o problema…" : "Observação (opcional)"} value={item.note ?? ""} onChange={(e) => update(index, { note: e.target.value || null })} />
              </div>
            ))}
          </div>
        </fieldset>
      ))}
      <Button type="button" variant="ghost" size="sm" onClick={() => onChange([...items, { label: "", ok: null, note: null }])}><Plus className="h-4 w-4" />Item</Button>
    </div>
  );
}