export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`leading-none ${className}`}>
      <div className="font-display text-2xl font-black italic tracking-tight">
        <span className="text-brand-blue">ELETRO</span>
        <span className="text-brand-red">MW</span>
      </div>
      <div className="mt-0.5 text-[9px] uppercase tracking-[0.3em] text-muted-foreground">
        Controle de Frota
      </div>
    </div>
  );
}
