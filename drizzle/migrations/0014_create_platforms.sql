CREATE TABLE public.platforms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text NOT NULL UNIQUE,
  model text NOT NULL,
  catalog_key text NOT NULL,
  base_height text,
  work_height text,
  stowed_size text,
  weight text,
  color text,
  serial text,
  location text,
  status text NOT NULL DEFAULT 'ok',
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.platforms TO authenticated;
GRANT ALL ON public.platforms TO service_role;
ALTER TABLE public.platforms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team read" ON public.platforms FOR SELECT TO authenticated USING (public.is_team(auth.uid()));
CREATE POLICY "team insert" ON public.platforms FOR INSERT TO authenticated WITH CHECK (public.is_team(auth.uid()));
CREATE POLICY "team update" ON public.platforms FOR UPDATE TO authenticated USING (public.is_team(auth.uid())) WITH CHECK (public.is_team(auth.uid()));
CREATE POLICY "admin delete" ON public.platforms FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
ALTER PUBLICATION supabase_realtime ADD TABLE public.platforms;
INSERT INTO public.platforms (number, model, catalog_key, base_height, work_height, stowed_size, weight, color, serial, location, status) VALUES
('01','JLG 1932 E','jlg-1932e','5,8 m','7,7 m','0,81 x 2,02 x 2,07 m','1.500 kg','Verde','200061392','Nova sede','ok'),
('02','JLG 2630 ES','jlg-2630es','7,75 m','9,65 m','0,76 x 2,30 x 1,23 m','2.200 kg','Laranja','200161392','Bunge Ponta Grossa','ok'),
('03','Genie GS-2646','genie-gs2646','7,8 m','9,7 m','1,16 x 2,44 x 2,25 m','2.500 kg','Azul','GS460782762','Eletrolux','ok'),
('04','JLG 2658 E','jlg-2658e','7,8 m','10 m','1,47 x 2,54 x 2,14 m','2.200 kg','Laranja','2000047990','Jacob Obras','ok'),
('05','Genie GS-3246','genie-gs3246','9,5 m','11,4 m','1,16 x 2,44 x 2,38 m','2.800 kg','Azul','Sem número (foi pintada)','Nova sede','ok'),
('06','Haulotte Compact 12','haulotte-compact12','10 m','11,9 m','1,20 x 2,43 x 2,38 m','2.500 kg','Amarela','CE104550','SFS','ok'),
('07','CFPT 1416 (China)','cfpt-1416','13,7 m','15,6 m','1,23 x 2,64 x 2,38 m','3.600 kg','Vermelha',NULL,'Bunge Ponta Grossa','ok'),
('08','CFPT 1416 (China)','cfpt-1416','13,7 m','15,6 m','1,23 x 2,64 x 2,39 m','3.600 kg','Vermelha',NULL,'Manutenção','manutencao');