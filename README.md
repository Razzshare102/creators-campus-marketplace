# Creators Campus — Digital Premium Marketplace

A standalone Next.js marketplace for premium digital subscriptions, built to deploy
on Vercel with a Supabase backend.

- **Storefront:** homepage, categories, search, product pages with plan selector,
  cart, coupons, checkout (USDT / USDC / BNB / Binance Pay),
  payment proof submission (transaction ID + screenshot upload).
- **Customers:** Supabase Auth (email), dashboard, order history + tracking,
  delivery details, support tickets, notifications.
- **Admin (`/admin`):** role-gated dashboard with 17 modules — analytics,
  products, categories, plans, orders, payment verification, customers, coupons,
  suppliers, stock, delivery, refunds, tickets, reports, settings, activity logs,
  roles & permissions.
- **Design:** navy / purple / white, dark + light theme, mobile-first.
  System font stack only — **no Google Fonts or any external font request**
  (an external font import once left the site blank on a slow network).

## Tech

Next.js 14 (App Router, TypeScript) + Supabase (PostgreSQL, Auth, Storage, RLS).
No Tailwind — plain CSS in `app/globals.css`, so the build has no CSS toolchain
dependency and the page makes zero external requests.

## Setup

1. Create a Supabase project (or confirm which existing project to use).
2. Copy `.env.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only; seed script only)
3. In the Supabase SQL editor run, in order:
   - `supabase/migrations/0001_init.sql` (tables + RLS)
   - `supabase/migrations/0002_storage.sql` (payment-proofs bucket + policies)
   - `supabase/seed.sql` (catalog: 8 categories, 8 products, 20 plans)
4. `npm install`
5. `npm run dev` — open http://localhost:3000

Without Supabase credentials the site still builds and renders using the local
fallback catalog in `lib/catalog.ts` (checkout and account features show a
"Supabase not connected" notice until keys are added).

## First admin user

1. Register an account on the site (or create it in Supabase Auth).
2. In the Supabase SQL editor run:
   ```sql
   update public.profiles set role = 'admin' where email = 'you@example.com';
   ```
3. Log in and open `/admin`. There is **no default PIN** — admin access is
   controlled by the `role` column on `profiles`, enforced by RLS.

## Payment receiving accounts

Set them in Admin → Settings (USDT address, USDC address, BNB address,
Binance Pay ID). They ship **empty** — never
invent wallet numbers. Orders cannot show payment details until the admin
fills them in.

## Deploy (Vercel)

1. Create the GitHub repo (the GitHub App cannot create repos — create it on
   github.com or in the browser, then add it to the Muse GitHub App
   installation), push this code, and connect the repo to a **new** Vercel
   project named `creators-campus-marketplace`.
   Do NOT link it to the existing `creators-campus` project — that is the
   separate static community platform.
2. In Vercel → Project Settings → Environment Variables, add the three
   Supabase variables above (production + preview).
3. Deploy as **preview** first, verify the live URL loads with no blank page,
   then promote to production.

## Project layout

- `app/` — storefront pages, `app/auth/`, `app/dashboard/`, `app/admin/`
- `components/` — Header, Footer, ProductCard, HomeCatalog, ThemeToggle
- `lib/` — `supabase.ts` (clients), `types.ts`, `catalog.ts` (seed catalog),
  `cart.tsx`, `auth.tsx`
- `supabase/migrations/` — schema + RLS + storage bucket
- `supabase/seed.sql` — idempotent catalog seed
- `scripts/seed-catalog.mjs` — same seed via the Supabase JS client
