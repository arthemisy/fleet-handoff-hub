import { useRef, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/** Asks "Deseja retirar da manutenção?" before marking as repaired. Resolves true only when confirmed. */
export function useAskFixed() {
  const [what, setWhat] = useState<string | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);
  const ask = (label: string) => new Promise<boolean>((res) => { resolver.current = res; setWhat(label); });
  const finish = (v: boolean) => { resolver.current?.(v); resolver.current = null; setWhat(null); };
  const element = (
    <Dialog open={what !== null} onOpenChange={(o) => { if (!o) finish(false); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5" />Deseja retirar da manutenção?</DialogTitle>
          <DialogDescription>{what} — confirme que o conserto terminou.</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => finish(false)}>Cancelar</Button>
          <Button onClick={() => finish(true)}><CheckCircle2 className="h-4 w-4" />Sim, retirar da manutenção</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
  return [ask, element] as const;
}
