CREATE TABLE public.vehicle_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plate text NOT NULL,
  manager_id uuid REFERENCES public.managers(id) ON DELETE SET NULL,
  employee text,
  start_date date,
  checklist_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_assignments TO authenticated;
GRANT ALL ON public.vehicle_assignments TO service_role;
ALTER TABLE public.vehicle_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team read" ON public.vehicle_assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "team insert" ON public.vehicle_assignments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "team update" ON public.vehicle_assignments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin delete" ON public.vehicle_assignments FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
ALTER TABLE public.checklists ADD COLUMN manager_id uuid, ADD COLUMN manager_name text, ADD COLUMN employee text;
ALTER PUBLICATION supabase_realtime ADD TABLE public.vehicle_assignments;