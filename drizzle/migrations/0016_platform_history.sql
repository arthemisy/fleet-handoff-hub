CREATE TABLE public.platform_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_id uuid NOT NULL REFERENCES public.platforms(id) ON DELETE CASCADE,
  changes text NOT NULL,
  user_id uuid,
  user_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.platform_history TO authenticated;
GRANT ALL ON public.platform_history TO service_role;
ALTER TABLE public.platform_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team read" ON public.platform_history FOR SELECT TO authenticated USING (public.is_team(auth.uid()));
CREATE INDEX ON public.platform_history (platform_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.log_platform_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE parts text[] := '{}'; mn text; mo text; em text;
BEGIN
  IF NEW.location IS DISTINCT FROM OLD.location THEN parts := parts || ('Local: ' || coalesce(OLD.location,'—') || ' → ' || coalesce(NEW.location,'—')); END IF;
  IF NEW.manager_id IS DISTINCT FROM OLD.manager_id THEN
    SELECT name INTO mo FROM managers WHERE id = OLD.manager_id;
    SELECT name INTO mn FROM managers WHERE id = NEW.manager_id;
    parts := parts || ('Gestor: ' || coalesce(mo,'—') || ' → ' || coalesce(mn,'—'));
  END IF;
  IF NEW.loaned_at IS DISTINCT FROM OLD.loaned_at THEN parts := parts || ('Emprestada: ' || coalesce(to_char(NEW.loaned_at,'DD/MM/YYYY'),'—')); END IF;
  IF NEW.returned_at IS DISTINCT FROM OLD.returned_at THEN parts := parts || ('Devolvida: ' || coalesce(to_char(NEW.returned_at,'DD/MM/YYYY'),'—')); END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN parts := parts || (CASE WHEN NEW.status = 'manutencao' THEN 'Enviada para manutenção' ELSE 'Consertada' END); END IF;
  IF NEW.notes IS DISTINCT FROM OLD.notes THEN parts := parts || 'Observações alteradas'::text; END IF;
  IF array_length(parts,1) IS NULL THEN RETURN NEW; END IF;
  SELECT email INTO em FROM auth.users WHERE id = auth.uid();
  INSERT INTO platform_history (platform_id, changes, user_id, user_email) VALUES (NEW.id, array_to_string(parts, ' · '), auth.uid(), em);
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.log_platform_change() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER platforms_history AFTER UPDATE ON public.platforms FOR EACH ROW EXECUTE FUNCTION public.log_platform_change();