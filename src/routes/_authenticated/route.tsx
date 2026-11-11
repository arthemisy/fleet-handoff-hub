import { createFileRoute, Link, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { FolderOpen, Car, ClipboardCheck, Upload, LogOut, ShieldCheck, Wrench, Forklift } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useApprovals } from "@/lib/approvals";
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
  { to: "/plataformas", label: "Plataformas", icon: Forklift },
  { to: "/checklists", label: "Checklists", icon: ClipboardCheck },
  { to: "/conserto", label: "Conserto", icon: Wrench },
  { to: "/importar", label: "Importar", icon: Upload },
] as const;

function Shell() {
  const isAdmin = useIsAdmin();
  const { data: approvals, isLoading } = useApprovals();
  const [uid, setUid] = useState<string | null>(null);
  useEffect(() => { supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null)); }, []);
  const mine = approvals?.find((a) => a.user_id === uid);
  if (isLoading || !uid) return null;
  if (!isAdmin && mine?.status !== "approved") return <Waiting blocked={mine?.status === "blocked"} />;
  return <Team isAdmin={isAdmin} pending={(approvals ?? []).filter((a) => a.status === "pending")} />;
}

function Waiting({ blocked }: { blocked: boolean }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <Logo />
      <h1 className="text-xl font-bold text-primary">{blocked ? "Acesso bloqueado" : "Conta aguardando aceitação"}</h1>
      <p className="max-w-sm text-base text-muted-foreground">
        {blocked ? "Sua conta foi bloqueada pela administração." : "Sua conta foi criada. A administração precisa aprovar sua entrada na equipe antes de você usar o app. Esta tela abre sozinha quando for aprovada."}
      </p>
      <Button variant="outline" onClick={() => supabase.auth.signOut()}>Sair</Button>
    </div>
  );
}

function NewAccountPopup({ pending }: { pending: { user_id: string; email: string | null }[] }) {
  const navigate = useNavigate();
  const seen = useRef<string>("");
  const [open, setOpen] = useState(false);
  const key = pending.map((p) => p.user_id).join(",");
  useEffect(() => { if (key && key !== seen.current) setOpen(true); }, [key]);
  if (!open || pending.length === 0) return null;
  const close = () => { seen.current = key; setOpen(false); };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4">
      <div role="dialog" aria-label="Nova conta criada" className="w-full max-w-sm space-y-3 rounded-xl border bg-card p-5 shadow-lg">
        <h2 className="text-lg font-bold text-primary">Nova conta criada</h2>
        <p className="text-base">{pending.length === 1 ? "1 conta está" : `${pending.length} contas estão`} aguardando aceitação:</p>
        <ul className="text-sm font-semibold">{pending.slice(0, 5).map((p) => <li key={p.user_id}>{p.email}</li>)}</ul>
        <div className="flex gap-2">
          <Button className="flex-1" onClick={() => { close(); navigate({ to: "/admin" }); }}>Ver no Painel do ADM</Button>
          <Button variant="outline" onClick={close}>Depois</Button>
        </div>
      </div>
    </div>
  );
}

function Team({ isAdmin, pending }: { isAdmin: boolean; pending: { user_id: string; email: string | null }[] }) {
  useFleetRealtime();
  const nav = isAdmin ? [...NAV, { to: "/admin", label: "ADM", icon: ShieldCheck } as const] : NAV;
  const path = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (to: string) => path.startsWith(to) || (to === "/painel" && path.startsWith("/gestor"));
  return (
    <div className="flex min-h-screen">
      {isAdmin && <NewAccountPopup pending={pending} />}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-sidebar p-4 md:flex">
        <Logo />
        <p className="mt-8 mb-2 text-[11px] font-bold uppercase tracking-widest text-primary">Painel de controle</p>
        <nav className="space-y-1">
          {nav.map((n) => (
            <Link key={n.to} to={n.to} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition ${isActive(n.to) ? "border-primary/60 bg-accent text-accent-foreground" : "border-transparent hover:bg-muted"}`}>
              <n.icon className="h-4 w-4" /> {n.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto" />
        {isAdmin && <p className="mb-2 rounded-lg border border-primary/40 px-3 py-2 text-xs font-bold text-primary">Administradora principal{pending.length > 0 && ` · ${pending.length} aguardando`}</p>}
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
          <nav aria-label="Seções do app" className={`grid gap-1.5 ${isAdmin ? "grid-cols-4" : "grid-cols-3"} px-3 pb-3`}>
            {nav.map((n) => {
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
