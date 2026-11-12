import { useRef, useState } from "react";
import { Wrench } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Asks "Deseja enviar para manutenção?" and requires the mechanic name. Resolves null when cancelled. */
export function useAskShop() {
  const [what, setWhat] = useState<string | null>(null);
  const [shop, setShop] = useState("");
  const resolver = useRef<((v: string | null) => void) | null>(null);
  const ask = (label: string) => new Promise<string | null>((res) => { resolver.current = res; setShop(""); setWhat(label); });
  const finish = (v: string | null) => { resolver.current?.(v); resolver.current = null; setWhat(null); };
  const ok = shop.trim().length > 0;
  const element = (
    <Dialog open={what !== null} onOpenChange={(o) => { if (!o) finish(null); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Wrench className="h-5 w-5" />Deseja enviar para manutenção?</DialogTitle>
          <DialogDescription>{what} — informe qual a mecânica para onde foi enviado.</DialogDescription>
        </DialogHeader>
        <Input autoFocus value={shop} onChange={(e) => setShop(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && ok) finish(shop.trim()); }} placeholder="Nome da mecânica (obrigatório)" className="text-base" aria-label="Nome da mecânica" />
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => finish(null)}>Cancelar</Button>
          <Button disabled={!ok} onClick={() => finish(shop.trim())}><Wrench className="h-4 w-4" />Enviar para manutenção</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
  return [ask, element] as const;
}
