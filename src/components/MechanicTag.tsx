import { useQuery } from "@tanstack/react-query";
import { Wrench } from "lucide-react";
import { fleetQuery, normPlate } from "@/lib/fleet";
import { inMechanic } from "@/lib/mechanic";

/** Yellow "NA MECÂNICA" tag shown wherever a car is cited; renders nothing when the car isn't at repair. */
export function MechanicTag({ plate, className = "" }: { plate: string; className?: string }) {
  const { data: f } = useQuery(fleetQuery);
  if (!f) return null;
  const v = f.vehicles.find((x) => normPlate(x.plate) === normPlate(plate));
  const mech = inMechanic(v ?? { plate }, f.checklists);
  if (!mech) return null;
  return (
    <span className={`inline-flex items-center gap-1 rounded-md bg-brand-yellow/40 px-2 py-0.5 text-[11px] font-bold text-foreground ${className}`}>
      <Wrench className="h-3 w-3 shrink-0" />NA MECÂNICA{typeof mech === "string" ? ` — ${mech}` : ""}
    </span>
  );
}
