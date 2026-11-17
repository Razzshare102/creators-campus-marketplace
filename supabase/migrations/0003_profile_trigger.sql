-- Creators Campus marketplace — 0003_profile_trigger.sql
-- Create the profiles row automatically when a user signs up.
-- Run in the Supabase SQL editor (once).
--
-- Why this exists: sign-up inserts the profile row from the browser, but
-- email confirmation is ON, so right after signUp the user has NO session
-- yet and auth.uid() is null — the RLS policy
-- "Users can insert own profile" (WITH CHECK id = auth.uid()) rejects the
-- insert with "new row violates row-level security policy for table
-- 'profiles'". A SECURITY DEFINER trigger on auth.users creates the row
-- server-side instead, so it works with or without email confirmation.
-- After this is applied, lib/auth.tsx no longer inserts into profiles
-- (it passes full_name in the sign-up metadata instead).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    'customer'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
