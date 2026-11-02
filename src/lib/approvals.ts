import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Approval = { user_id: string; email: string | null; status: "pending" | "approved" | "blocked"; created_at: string; decided_at: string | null };

/** All accounts (admin sees every row; others only their own, via RLS). */
export function useApprovals() {
  const qc = useQueryClient();
  useEffect(() => {
    const ch = supabase
      .channel(`approvals-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "account_approvals" }, () => qc.invalidateQueries({ queryKey: ["approvals"] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);
  return useQuery({
    queryKey: ["approvals"],
    queryFn: async () => {
      const { data, error } = await supabase.from("account_approvals").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Approval[];
    },
  });
}

export async function setStatus(userId: string, status: Approval["status"]) {
  const { error } = await supabase.from("account_approvals").update({ status, decided_at: new Date().toISOString() }).eq("user_id", userId);
  if (error) throw error;
}
