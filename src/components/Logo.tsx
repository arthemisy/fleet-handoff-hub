import logo from "@/assets/logo-eletromw.png.asset.json";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={className}>
      <img src={logo.url} alt="EletroMW Soluções Elétricas" className="h-9 w-auto" width={5118} height={1041} />
      <div className="mt-1 text-[9px] uppercase tracking-[0.3em] text-muted-foreground">Controle de Frota</div>
    </div>
  );
}
