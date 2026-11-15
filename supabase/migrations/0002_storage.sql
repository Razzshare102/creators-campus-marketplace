-- Creators Campus marketplace — 0002_storage.sql
-- Payment-proof upload bucket + storage policies.
-- Run AFTER 0001_init.sql (uses public.is_admin() from 0001).
-- Safe to re-run: bucket insert uses ON CONFLICT, policies are created
-- only if they do not already exist.

-- Private bucket: files are NOT publicly listable/downloadable.
-- Customers read only their own proofs; admins read all.
insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', false)
on conflict (id) do nothing;

-- Authenticated users can upload payment proofs into this bucket.
-- (owner is set to auth.uid() by Supabase Storage on upload.)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'Users can upload payment proofs'
  ) then
    create policy "Users can upload payment proofs"
      on storage.objects for insert to authenticated
      with check (bucket_id = 'payment-proofs' and owner = auth.uid());
  end if;
end $$;

-- Users can read their own uploaded proofs.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'Users can read own payment proofs'
  ) then
    create policy "Users can read own payment proofs"
      on storage.objects for select to authenticated
      using (bucket_id = 'payment-proofs' and owner = auth.uid());
  end if;
end $$;

-- Admins can read every payment proof (to verify payments).
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'Admins can read all payment proofs'
  ) then
    create policy "Admins can read all payment proofs"
      on storage.objects for select to authenticated
      using (bucket_id = 'payment-proofs' and public.is_admin());
  end if;
end $$;

-- Admins can delete proofs (e.g. a bad/duplicate upload).
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'Admins can delete payment proofs'
  ) then
    create policy "Admins can delete payment proofs"
      on storage.objects for delete to authenticated
      using (bucket_id = 'payment-proofs' and public.is_admin());
  end if;
end $$;
