ALTER TABLE public.vehicles ADD COLUMN mechanic_notes text;
COMMENT ON COLUMN public.vehicles.mechanic_notes IS 'Defeitos/problemas do carro enquanto está na mecânica (aba Conserto).';