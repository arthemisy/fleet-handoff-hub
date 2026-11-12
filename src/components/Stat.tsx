import type { Car } from "lucide-react";

export function Stat({ icon: Icon, label, value, tone, sub }: { icon: typeof Car; label: string; value: string | number; tone: "plain" | "blue" | "yellow"; sub?: string }) {
  const border = tone === "blue" ? "border-l-brand-blue" : tone === "yellow" ? "border-l-primary" : "border-l-border";
  const color = tone === "blue" ? "text-brand-blue" : tone === "yellow" ? "text-primary" : "";
  return (
    <div className={`min-w-0 rounded-xl border border-l-4 bg-card p-4 ${border}`}>
      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground"><Icon className="h-3.5 w-3.5" />{label}</p>
      <p className={`mt-2 whitespace-nowrap font-display font-extrabold leading-tight ${String(value).length > 10 ? "text-[clamp(1rem,4.6vw,1.5rem)]" : "text-2xl"} ${color}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

