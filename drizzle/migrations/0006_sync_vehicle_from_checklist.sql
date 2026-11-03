CREATE OR REPLACE FUNCTION public.sync_vehicle_from_checklist() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  k text := regexp_replace(upper(NEW.plate), '[^A-Z0-9]', '', 'g');
  latest uuid;
  mgr uuid := NEW.manager_id;
BEGIN
  -- keep the custody record of this checklist in step with its edits
  IF TG_OP = 'UPDATE' THEN
    UPDATE public.vehicle_assignments
       SET start_date = COALESCE(NEW.checked_date, start_date),
           employee = NEW.employee,
           manager_id = COALESCE(NEW.manager_id, manager_id)
     WHERE checklist_id = NEW.id;
  END IF;

  SELECT c.id INTO latest FROM public.checklists c
   WHERE regexp_replace(upper(c.plate), '[^A-Z0-9]', '', 'g') = k
   ORDER BY c.checked_date DESC NULLS LAST, c.checked_time DESC NULLS LAST, c.created_at DESC
   LIMIT 1;
  IF latest IS DISTINCT FROM NEW.id THEN RETURN NEW; END IF;

  IF NEW.obra ILIKE '%terreno%' THEN
    SELECT id INTO mgr FROM public.managers WHERE name ILIKE 'Maicon%' ORDER BY created_at LIMIT 1;
  END IF;

  UPDATE public.vehicles v SET
    obra = COALESCE(NULLIF(NEW.obra, ''), v.obra),
    km = COALESCE(NEW.km, v.km),
    encarregado = CASE WHEN NEW.manager_id IS NOT NULL OR NEW.employee IS NOT NULL THEN NEW.employee ELSE v.encarregado END,
    manager_id = COALESCE(mgr, v.manager_id),
    status = 'Ativo'
  WHERE regexp_replace(upper(v.plate), '[^A-Z0-9]', '', 'g') = k
     OR regexp_replace(upper(coalesce(v.linked_plates, '')), '[^A-Z0-9,]', '', 'g') ~ ('(^|,)' || k || '(,|$)');
  RETURN NEW;
END $$;

CREATE TRIGGER checklists_sync_vehicle AFTER INSERT OR UPDATE ON public.checklists
  FOR EACH ROW EXECUTE FUNCTION public.sync_vehicle_from_checklist();