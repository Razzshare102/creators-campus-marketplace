# Supabase setup — Creators Campus marketplace

## 1. Create the project

Create a project at https://supabase.com/dashboard (or confirm which
existing project to use). From **Project Settings → API** copy:

- Project URL → `NEXT_PUBLIC_SUPABASE_URL`
- `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (server-only, seed
  script only — never put it in the browser or commit it)

Copy `.env.example` to `.env.local` in the project root and fill in all
three values.

## 2. Apply the migrations (SQL editor, in order)

In the Supabase dashboard open **SQL Editor → New query** and run each
file, in this order:

1. `supabase/migrations/0001_init.sql` — all tables, indexes, the
   `public.is_admin()` helper, and Row Level Security policies.
2. `supabase/migrations/0002_storage.sql` — the private
   `payment-proofs` bucket and its storage policies.
3. `supabase/seed.sql` — the catalog: 8 categories, 8 products, 20 plans,
   plus the `payment_accounts` (empty) and `site` settings rows.

All three files are safe to re-run: tables use `IF NOT EXISTS`, policies
are dropped before being re-created, and the seed upserts on `slug`
(categories/products), on `(product_id, name)` (plans), and on `key`
(settings).

### Alternative: seed from the command line

Instead of step 3 above you can run the same seed with the JS client
(uses the service-role key, so it bypasses RLS):

```bash
npm install
node scripts/seed-catalog.mjs
```

This upserts the identical catalog from `lib/catalog.ts`. It needs the
unique index `uq_plans_product_name` on `plans(product_id, name)` for the
single-call plan upsert — that index is created by `supabase/seed.sql`;
if it does not exist yet, the script falls back to upserting plans one
row at a time. Do **not** run both the SQL seed and the script against
the same project expecting different data — they write the same rows,
so running both is harmless but redundant.

## 3. Verify

In the SQL editor:

```sql
select (select count(*) from public.categories) as categories,
       (select count(*) from public.products)   as products,
       (select count(*) from public.plans)      as plans;
-- expect: 8 | 8 | 20

select key, value from public.settings;
-- expect: payment_accounts with EMPTY strings, site with name/tagline/currency

select id, name, public from storage.buckets where id = 'payment-proofs';
-- expect: one row, public = false
```

In **Authentication → Policies**, confirm RLS is enabled on every table
and that the anon role can only `SELECT` active rows from
`categories` / `products` / `plans`.

## 4. Create the first admin

There is **no default PIN and no default admin**. Admin access is the
`role` column on `profiles`, enforced by RLS (`public.is_admin()`).

1. Register an account on the site (or create it in Supabase Auth).
   Signing up creates the matching `profiles` row automatically.
2. In the SQL editor run:

```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```

Replace `you@example.com` with the real admin email. Verify with:

```sql
select email, role from public.profiles where role = 'admin';
```

3. Log in and open `/admin`.

To demote an admin, set the role back:

```sql
update public.profiles set role = 'customer' where email = 'you@example.com';
```

Support staff use `role = 'support'`; support has no extra privileges
under RLS — admins keep full access, customers keep own-row access.

## 5. Storage bucket notes

- Bucket `payment-proofs` is **private** (`public = false`). Proof
  screenshots are never publicly listable or downloadable by URL.
- Customers upload their own proof (`INSERT`, `owner = auth.uid()`) and
  can read only their own objects.
- Admins can `SELECT` (verify payments) and `DELETE` all proofs in the
  bucket.
- The app must upload via the signed-in user's Supabase client (so
  `owner` is set) and read proofs via signed URLs or the admin client —
  never via a public URL.
- If the bucket already exists from an earlier manual setup, the
  migration leaves it alone (`ON CONFLICT DO NOTHING`); check its
  `public` flag is `false` in **Storage → payment-proofs → Settings**.

## 6. Payment receiving accounts

They ship **empty** — no wallet numbers or IDs are invented anywhere in
the seed. Fill them in at **Admin → Settings** (or update the
`payment_accounts` row in `settings` directly):

```json
{
  "usdt_address": "",
  "usdc_address": "",
  "bnb_address": "",
  "binance_pay_id": "",
  "bkash_number": "",
  "nagad_number": ""
}
```

Orders cannot show payment details until the admin fills these in.
