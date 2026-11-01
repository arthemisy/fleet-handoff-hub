import { useState } from "react";
import { Check, ChevronDown, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { checklistGroup, type DraftChecklistItem } from "@/lib/checklist-template";
import { cn } from "@/lib/utils";

type Props = { items: DraftChecklistItem[]; onChange: (items: DraftChecklistItem[]) => void };

/** Each group starts folded with a counter, so the full 71-point template doesn't take over the screen. */
export function ChecklistItemsEditor({ items, onChange }: Props) {
  const [forced, setForced] = useState<Record<string, boolean>>({});
  const groups = [...new Set(items.map((item) => checklistGroup(item.label)))];
  const marked = items.filter((item) => item.ok !== null).length;

  function update(index: number, patch: Partial<DraftChecklistItem>) {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }
  function markGroup(group: string, ok: boolean | null) {
    onChange(items.map((item) => (checklistGroup(item.label) === group ? { ...item, ok, note: null } : item)));
  }
  function addItem() {
    setForced((f) => ({ ...f, "Outros itens": true }));
    onChange([...items, { label: "", ok: null, note: null }]);
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5 rounded-lg bg-muted/60 p-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-xs">
          <span className="font-bold">{marked} de {items.length} pontos marcados</span>
          <span className="text-muted-foreground">os que ficarem sem marca não são salvos</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-border">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${items.length ? Math.round((marked / items.length) * 100) : 0}%` }} />
        </div>
      </div>

      {groups.map((group) => {
        const rows = items.map((item, index) => ({ item, index })).filter(({ item }) => checklistGroup(item.label) === group);
        const done = rows.filter(({ item }) => item.ok !== null).length;
        const failed = rows.filter(({ item }) => item.ok === false).length;
        const open = forced[group] ?? done > 0;
        return (
          <fieldset key={group} className="min-w-0 rounded-lg border">
            <legend className="sr-only">{group}</legend>
            <button type="button" aria-expanded={open} className="flex w-full items-center gap-2 px-3 py-2.5 text-left" onClick={() => setForced((f) => ({ ...f, [group]: !open }))}>
              <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition", open && "rotate-180")} />
              <span className="min-w-0 flex-1 truncate font-semibold text-primary">{group}</span>
              {failed > 0 && <span className="shrink-0 rounded-full bg-destructive/15 px-2 py-0.5 text-[11px] font-bold text-destructive">{failed} reprovado{failed > 1 ? "s" : ""}</span>}
              <span className="shrink-0 text-xs font-bold text-muted-foreground">{done}/{rows.length}</span>
            </button>
            {open && (
              <div className="border-t px-3 pb-2">
                <div className="flex flex-wrap gap-1 py-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => markGroup(group, true)}><Check className="h-3.5 w-3.5" />Tudo OK</Button>
                  {done > 0 && <Button type="button" variant="ghost" size="sm" onClick={() => markGroup(group, null)}>Nenhum marcado</Button>}
                </div>
                <div className="grid gap-x-5 sm:grid-cols-2">
                  {rows.map(({ item, index }) => (
                    <div key={index} className="min-w-0 border-b py-1.5 last:border-0" data-checklist-item={item.label}>
                      <div className="flex items-center gap-2">
                        <Input aria-label={`Nome do item ${index + 1}`} className="min-w-0 flex-1 border-transparent bg-transparent px-1 text-sm" value={item.label} onChange={(e) => update(index, { label: e.target.value })} />
                        <div className="flex shrink-0 gap-1" role="group" aria-label={`Resultado: ${item.label || "novo item"}`}>
                          <Button type="button" variant="outline" size="sm" aria-label={`OK: ${item.label}`} aria-pressed={item.ok === true} title="OK" className={cn("h-9 w-11 px-0", item.ok === true ? "border-success bg-success/20 text-success" : "text-muted-foreground")} onClick={() => update(index, { ok: true })}><Check className="h-4 w-4" /><span className="text-xs">OK</span></Button>
                          <Button type="button" variant="outline" size="icon" aria-label={`Reprovado: ${item.label}`} aria-pressed={item.ok === false} title="Reprovado" className={cn("h-9 w-9", item.ok === false ? "border-destructive bg-destructive/20 text-destructive" : "text-muted-foreground")} onClick={() => update(index, { ok: false })}><X className="h-4 w-4" /></Button>
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground" aria-label={`Remover item: ${item.label}`} title="Remover item" onClick={() => onChange(items.filter((_, i) => i !== index))}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                      {item.ok !== null && (
                        <Textarea aria-label={`Observação: ${item.label}`} rows={2} className={cn("mt-1 min-h-14 text-sm", item.ok === false && "border-destructive/50")} placeholder={item.ok === false ? "Descreva o problema…" : "Observação (opcional)"} value={item.note ?? ""} onChange={(e) => update(index, { note: e.target.value || null })} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </fieldset>
        );
      })}
      <Button type="button" variant="ghost" size="sm" onClick={addItem}><Plus className="h-4 w-4" />Item</Button>
    </div>
  );
}
