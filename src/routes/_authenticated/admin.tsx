import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Ban, Trash2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsAdmin } from "@/lib/use-admin";
import { useApprovals, setStatus, type Approval } from "@/lib/approvals";
import { deleteAccount } from "@/lib/admin-users.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Painel do ADM — Controle de Frota" },
      { name: "description", content: "Aprovar, bloquear e excluir contas da equipe EletroMW." },
      { property: "og:title", content: "Painel do ADM — Controle de Frota" },
      { property: "og:description", content: "Aprovar, bloquear e excluir contas da equipe EletroMW." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

const LABEL: Record<Approval["status"], string> = { pending: "Aguardando aceitação", approved: "Aprovado", blocked: "Bloqueado" };
const TONE: Record<Approval["status"], string> = {
  pending: "bg-brand-yellow text-foreground",
  approved: "bg-primary text-primary-foreground",
  blocked: "bg-destructive text-destructive-foreground",
};

function AdminPage() {
  const isAdmin = useIsAdmin();
  const { data = [] } = useApprovals();
  const qc = useQueryClient();
  const del = useServerFn(deleteAccount);
  if (!isAdmin) return <p className="text-muted-foreground">Esta tela é só da administradora. <Link to="/painel" className="underline">Voltar</Link></p>;

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    try { await fn(); toast.success(ok); qc.invalidateQueries({ queryKey: ["approvals"] }); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Erro"); }
  };
  const groups: Approval["status"][] = ["pending", "approved", "blocked"];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-black text-primary">Painel do ADM</h1>
      {groups.map((g) => {
        const rows = data.filter((r) => r.status === g);
        return (
          <section key={g} className="space-y-2">
            <h2 className="text-lg font-bold">{LABEL[g]} ({rows.length})</h2>
            {rows.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma conta.</p>}
            {rows.map((r) => {
              const main = r.email?.toLowerCase() === "adagames@gmail.com";
              return (
                <div key={r.user_id} className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold">{r.email}</p>
                    <p className="text-sm text-muted-foreground">Criada em {new Date(r.created_at).toLocaleString("pt-BR")}</p>
                  </div>
                  <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${TONE[r.status]}`}>{main ? "Administradora" : LABEL[r.status]}</span>
                  {!main && (
                    <div className="flex flex-wrap gap-2">
                      {r.status !== "approved" && (
                        <Button size="sm" onClick={() => act(() => setStatus(r.user_id, "approved"), "Conta aprovada")}>
                          {r.status === "blocked" ? <RotateCcw className="h-4 w-4" /> : <Check className="h-4 w-4" />} {r.status === "blocked" ? "Desbloquear" : "Aprovar"}
                        </Button>
                      )}
                      {r.status !== "blocked" && (
                        <Button size="sm" variant="outline" onClick={() => act(() => setStatus(r.user_id, "blocked"), "Conta bloqueada")}>
                          <Ban className="h-4 w-4" /> Bloquear
                        </Button>
                      )}
                      <Button size="sm" variant="destructive" onClick={() => {
                        if (confirm(`Excluir a conta ${r.email}? Isso não pode ser desfeito.`)) act(() => del({ data: { userId: r.user_id } }), "Conta excluída");
                      }}>
                        <Trash2 className="h-4 w-4" /> Excluir
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
