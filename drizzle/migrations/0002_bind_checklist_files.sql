DROP POLICY IF EXISTS "team upload checklist files" ON storage.objects;
DROP POLICY IF EXISTS "team read checklist files" ON storage.objects;
CREATE POLICY "owner upload checklist files" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'checklists' AND owner_id = (select auth.uid()::text));
CREATE POLICY "read own or linked checklist files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'checklists' AND (
    owner_id = (select auth.uid()::text)
    OR EXISTS (SELECT 1 FROM public.checklists c WHERE storage.objects.name = ANY (c.attachments))
  ));