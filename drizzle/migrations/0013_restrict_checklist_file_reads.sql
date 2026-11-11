DROP POLICY IF EXISTS "read own or linked checklist files" ON storage.objects;
CREATE POLICY "read own or linked checklist files" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'checklists' AND (owner_id = (select auth.uid()::text)
  OR (public.is_team((select auth.uid())) AND EXISTS (SELECT 1 FROM public.checklists c WHERE objects.name = ANY (c.attachments)))));