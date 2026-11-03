CREATE OR REPLACE FUNCTION public.sync_vehicle_from_checklist() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  k text := regexp_replace(upper(NEW.plate), '[^A-Z0-9]', '', 'g');
  latest uuid;
  mgr uuid := NEW.manager_id;
  cur record;
BEGIN
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

  SELECT id, plate, manager_id INTO cur FROM public.vehicles
   WHERE regexp_replace(upper(plate), '[^A-Z0-9]', '', 'g') = k ORDER BY created_at LIMIT 1;

  -- a new holder: record the custody change so expenses split on the checklist date
  IF mgr IS NOT NULL AND cur.id IS NOT NULL AND cur.manager_id IS DISTINCT FROM mgr THEN
    IF cur.manager_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.vehicle_assignments a WHERE regexp_replace(upper(a.plate), '[^A-Z0-9]', '', 'g') = k) THEN
      INSERT INTO public.vehicle_assignments (plate, manager_id, start_date) VALUES (cur.plate, cur.manager_id, NULL);
    END IF;
    INSERT INTO public.vehicle_assignments (plate, manager_id, employee, start_date, checklist_id)
    VALUES (cur.plate, mgr, NEW.employee, COALESCE(NEW.checked_date, current_date), NEW.id);
  END IF;

  UPDATE public.vehicles v SET
    obra = COALESCE(NULLIF(NEW.obra, ''), v.obra),
    km = COALESCE(NEW.km, v.km),
    encarregado = CASE WHEN NEW.manager_id IS NOT NULL OR NEW.employee IS NOT NULL THEN NEW.employee ELSE v.encarregado END,
    manager_id = COALESCE(mgr, v.manager_id),
    status = 'Ativo'
  WHERE regexp_replace(upper(v.plate), '[^A-Z0-9]', '', 'g') = k;
  RETURN NEW;
END $$;