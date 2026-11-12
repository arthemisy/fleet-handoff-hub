CREATE OR REPLACE FUNCTION public.require_platform_shop() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status = 'manutencao' AND OLD.status IS DISTINCT FROM 'manutencao' THEN
    IF NEW.location IS NULL OR btrim(NEW.location) = '' OR lower(btrim(NEW.location)) = lower(coalesce(btrim(OLD.location),'')) OR lower(btrim(NEW.location)) = 'nova sede' THEN
      RAISE EXCEPTION 'Informe o nome da mecânica para enviar para manutenção. Atualize o app (feche e abra de novo).';
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS require_platform_shop ON public.platforms;
CREATE TRIGGER require_platform_shop BEFORE UPDATE ON public.platforms FOR EACH ROW EXECUTE FUNCTION public.require_platform_shop();

CREATE OR REPLACE FUNCTION public.require_vehicle_shop() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.mechanic_manual = 'in' AND OLD.mechanic_manual IS DISTINCT FROM 'in' AND (NEW.mechanic_shop IS NULL OR btrim(NEW.mechanic_shop) = '') THEN
    RAISE EXCEPTION 'Informe o nome da mecânica para enviar para manutenção. Atualize o app (feche e abra de novo).';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS require_vehicle_shop ON public.vehicles;
CREATE TRIGGER require_vehicle_shop BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.require_vehicle_shop();

DELETE FROM public.platform_history WHERE user_email ILIKE 'adagames%';