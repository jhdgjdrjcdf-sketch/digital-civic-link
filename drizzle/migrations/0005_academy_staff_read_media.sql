create policy "academy staff read media" on storage.objects for select to authenticated using (
  bucket_id = 'academy-media' and (
    public.can_manage(auth.uid(), 'academy_manager'::public.app_role)
    or exists (select 1 from public.courses c where c.id::text = (storage.foldername(objects.name))[2] and c.instructor_id = auth.uid())
  )
);