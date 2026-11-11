CREATE TABLE public.mechanic_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plate text NOT NULL,
  start_date date NOT NULL,
  end_date date,
  shop text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mechanic_visits TO authenticated;
GRANT ALL ON public.mechanic_visits TO service_role;
ALTER TABLE public.mechanic_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team read" ON public.mechanic_visits FOR SELECT TO authenticated USING (public.is_team(auth.uid()));
CREATE POLICY "team insert" ON public.mechanic_visits FOR INSERT TO authenticated WITH CHECK (public.is_team(auth.uid()));
CREATE POLICY "team update" ON public.mechanic_visits FOR UPDATE TO authenticated USING (public.is_team(auth.uid())) WITH CHECK (public.is_team(auth.uid()));
CREATE POLICY "admin delete" ON public.mechanic_visits FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
ALTER PUBLICATION supabase_realtime ADD TABLE public.mechanic_visits;