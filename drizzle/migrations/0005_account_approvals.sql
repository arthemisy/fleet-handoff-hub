CREATE TABLE public.account_approvals (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','blocked')),
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz
);
GRANT SELECT, UPDATE ON public.account_approvals TO authenticated;
GRANT ALL ON public.account_approvals TO service_role;
ALTER TABLE public.account_approvals ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_team(_user_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'admin') OR EXISTS (
    SELECT 1 FROM public.account_approvals WHERE user_id = _user_id AND status = 'approved')
$$;

CREATE POLICY "own or admin read" ON public.account_approvals FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin update" ON public.account_approvals FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.account_approvals (user_id, email, status, decided_at)
SELECT id, email, 'approved', now() FROM auth.users ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.handle_new_account() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.account_approvals (user_id, email, status, decided_at)
  VALUES (NEW.id, NEW.email,
    CASE WHEN lower(NEW.email) = 'adagames@gmail.com' THEN 'approved' ELSE 'pending' END,
    CASE WHEN lower(NEW.email) = 'adagames@gmail.com' THEN now() END)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created_approval AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_account();

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['checklists','expenses','managers','vehicles','vehicle_assignments'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "team read" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "team insert" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "team update" ON public.%I', t);
    EXECUTE format('CREATE POLICY "team read" ON public.%I FOR SELECT TO authenticated USING (public.is_team(auth.uid()))', t);
    EXECUTE format('CREATE POLICY "team insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_team(auth.uid()))', t);
    EXECUTE format('CREATE POLICY "team update" ON public.%I FOR UPDATE TO authenticated USING (public.is_team(auth.uid())) WITH CHECK (public.is_team(auth.uid()))', t);
  END LOOP;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.account_approvals;