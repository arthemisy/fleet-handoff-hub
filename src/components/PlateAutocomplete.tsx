import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { fleetQuery } from "@/lib/fleet";
import { exactVehicle, plateCandidates, searchPlates, type PlateCandidate } from "@/lib/plate-search";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (v: string) => void;
  onPick?: (c: PlateCandidate) => void;
  id?: string;
  placeholder?: string;
  className?: string;
};

/**
 * Plate field with a live search list: as the person types, the plates already saved
 * (fleet, past conferences, maintenance sheet) drop down and one tap fills the field.
 */
export function PlateAutocomplete({ value, onChange, onPick, id, placeholder = "MIW-0436", className }: Props) {
  const { data: f } = useQuery(fleetQuery);
  const cands = useMemo(() => plateCandidates(f), [f]);
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(-1);

  const list = useMemo(() => searchPlates(cands, value), [cands, value]);
  const resolved = useMemo(() => exactVehicle(cands, value), [cands, value]);
  const show = open && !resolved && list.length > 0;

  function pick(c: PlateCandidate) {
    onChange(c.plate);
    onPick?.(c);
    setOpen(false);
    setHi(-1);
  }

  return (
    <div
      className="relative"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        id={id}
        role="combobox"
        aria-expanded={show}
        aria-controls={show ? `${id ?? "plate"}-suggestions` : undefined}
        aria-autocomplete="list"
        autoComplete="off"
        spellCheck={false}
        className={cn("pl-9", className)}
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setHi(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            if (!show) {
              setOpen(true);
              setHi(0);
              return;
            }
            setHi((h) => (e.key === "ArrowDown" ? Math.min(h + 1, list.length - 1) : Math.max(h - 1, 0)));
          } else if (e.key === "Enter") {
            if (show && hi >= 0 && list[hi]) {
              e.preventDefault();
              pick(list[hi]!);
            }
          } else if (e.key === "Escape") {
            setOpen(false);
            setHi(-1);
          }
        }}
      />
      {show && (
        <ul
          id={`${id ?? "plate"}-suggestions`}
          role="listbox"
          className="absolute left-0 right-0 top-full z-30 mt-1 max-h-60 overflow-auto rounded-lg border bg-card p-1 shadow-lg"
        >
          {list.map((c, i) => (
            <li key={c.key} role="option" aria-selected={i === hi}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(c);
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left",
                  i === hi && "bg-primary/10",
                )}
              >
                <span className="font-display text-sm font-extrabold tracking-wide">{c.plate}</span>
                <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                  {[c.model, c.manager, c.linked ? "placa vinculada" : null].filter(Boolean).join(" · ")}
                </span>
                {c.source !== "frota" && (
                  <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
                    {c.source}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
