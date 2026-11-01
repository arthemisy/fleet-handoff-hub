import { createFileRoute, Link, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { FolderOpen, Car, ClipboardCheck, Upload, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { useFleetRealtime } from "@/lib/fleet";
import { useIsAdmin } from "@/lib/use-admin";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  component: Shell,
});

const NAV = [
  { to: "/painel", label: "Gestores", icon: FolderOpen },
  { to: "/veiculos", label: "Veículos", icon: Car },
  { to: "/checklists", label: "Checklists", icon: ClipboardCheck },
  { to: "/importar", label: "Importar", icon: Upload },
] as const;

function Shell() {
  useFleetRealtime();
  const isAdmin = useIsAdmin();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (to: string) => path.startsWith(to) || (to === "/painel" && path.startsWith("/gestor"));
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-sidebar p-4 md:flex">
        <Logo />
        <p className="mt-8 mb-2 text-[11px] font-bold uppercase tracking-widest text-primary">Painel de controle</p>
        <nav className="space-y-1">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition ${isActive(n.to) ? "border-primary/60 bg-accent text-accent-foreground" : "border-transparent hover:bg-muted"}`}>
              <n.icon className="h-4 w-4" /> {n.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto" />
        {isAdmin && <p className="mb-2 rounded-lg border border-primary/40 px-3 py-2 text-xs font-bold text-primary">Administradora principal</p>}
        <button onClick={() => supabase.auth.signOut()} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted">
          <LogOut className="h-4 w-4" /> Sair
        </button>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        {/* On the phone the menu lives at the top, in evidence; nothing is docked at the bottom any more */}
        <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur md:hidden">
          <div className="flex items-center justify-between px-4 pb-1 pt-3">
            <Logo />
            <button onClick={() => supabase.auth.signOut()} aria-label="Sair" className="text-muted-foreground"><LogOut className="h-5 w-5" /></button>
          </div>
          <nav aria-label="Seções do app" className="grid grid-cols-4 gap-1.5 px-3 pb-3">
            {NAV.map((n) => {
              const active = isActive(n.to);
              return (
                <Link key={n.to} to={n.to} aria-current={active ? "page" : undefined} className={`flex flex-col items-center gap-1 rounded-lg border px-1 py-2.5 text-[11px] font-bold transition ${active ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border bg-card text-muted-foreground"}`}>
                  <n.icon className="h-5 w-5" /> {n.label}
                </Link>
              );
            })}
          </nav>
        </header>
        <main className="flex-1 px-4 pb-10 pt-5 md:px-8 md:pb-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
