-- Creators Campus marketplace — seed.sql
-- Idempotent catalog seed. EXACT data from lib/catalog.ts:
-- 8 categories, 8 products, 20 plans (prices USD, compare_price NULL,
-- stock 50, delivery types and instructions copied verbatim).
-- Safe to re-run: every upsert matches on slug and updates in place.
--
-- NOTE: lib/catalog.ts uses string ids ('cat-social-premium',
-- 'prod-x-premium', ...) as reference keys. Database ids are uuids, so
-- this seed resolves parent ids by slug instead of copying those strings.
-- No fake orders, customers or revenue are seeded.

begin;

-- ---------------------------------------------------------------------------
-- Categories (8)
-- ---------------------------------------------------------------------------

insert into public.categories (name, slug, description, icon, sort_order, active) values
  ('Social Premium', 'social-premium', 'Premium subscriptions for social platforms.', null, 1, true),
  ('AI Tools', 'ai-tools', 'AI assistants and creative tools.', null, 2, true),
  ('Productivity', 'productivity', 'Tools to get more done, every day.', null, 3, true),
  ('Design Tools', 'design-tools', 'Professional design software.', null, 4, true),
  ('Entertainment', 'entertainment', 'Streaming and entertainment subscriptions.', null, 5, true),
  ('Developer Tools', 'developer-tools', 'Tools for developers and builders.', null, 6, true),
  ('Education', 'education', 'Learning platforms and courses.', null, 7, true),
  ('Other Services', 'other-services', 'Other digital services.', null, 8, true)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  icon = excluded.icon,
  sort_order = excluded.sort_order,
  active = excluded.active;

-- ---------------------------------------------------------------------------
-- Products (8)
-- ---------------------------------------------------------------------------

insert into public.products (category_id, name, slug, description, features, delivery_type, delivery_instructions, stock, active, sort_order) values
  (
    (select id from public.categories where slug = 'social-premium'),
    'X Premium', 'x-premium',
    'Blue checkmark, longer posts, reply boost and fewer ads on your own X account.',
    '["Blue checkmark", "Longer posts", "Reply boost", "Fewer ads"]'::jsonb,
    'manual',
    'Activated on your own X account using your @username. No password is ever required.',
    50, true, 1
  ),
  (
    (select id from public.categories where slug = 'social-premium'),
    'Telegram Premium', 'telegram-premium',
    '4GB uploads, faster downloads and premium stickers on Telegram.',
    '["4GB uploads", "Faster downloads", "Premium stickers"]'::jsonb,
    'manual',
    'Gifted to your Telegram account using your Telegram username.',
    50, true, 2
  ),
  (
    (select id from public.categories where slug = 'ai-tools'),
    'ChatGPT Plus', 'chatgpt-plus',
    'GPT-5, DALL·E image generation and higher usage limits.',
    '["GPT-5 access", "DALL·E image generation", "Higher usage limits"]'::jsonb,
    'manual',
    'Activated on your account. The admin will contact you with the activation steps after payment verification.',
    50, true, 3
  ),
  (
    (select id from public.categories where slug = 'ai-tools'),
    'Claude Pro', 'claude-pro',
    'Claude Pro with extended usage, and Max for 5x more usage.',
    '["Extended usage", "Priority access", "Max plan available (5x usage)"]'::jsonb,
    'manual',
    'Activated on your account. The admin will contact you with the activation steps after payment verification.',
    50, true, 4
  ),
  (
    (select id from public.categories where slug = 'design-tools'),
    'Canva Pro', 'canva-pro',
    'Canva Pro with premium templates, Brand Kit and Magic Studio.',
    '["Premium templates", "Brand Kit", "Magic Studio"]'::jsonb,
    'manual',
    'Activated on your account. The admin will contact you with the activation steps after payment verification.',
    50, true, 5
  ),
  (
    (select id from public.categories where slug = 'productivity'),
    'Notion Plus', 'notion-plus',
    'Notion Plus with unlimited blocks, file uploads and version history.',
    '["Unlimited blocks", "Larger file uploads", "Version history"]'::jsonb,
    'manual',
    'Activated on your Notion account. The admin will contact you with the activation steps after payment verification.',
    50, true, 6
  ),
  (
    (select id from public.categories where slug = 'productivity'),
    'Microsoft 365 Personal', 'microsoft-365-personal',
    'Word, Excel, PowerPoint and 1TB OneDrive cloud storage.',
    '["Word, Excel, PowerPoint", "1TB OneDrive storage", "License key delivery"]'::jsonb,
    'activation_code',
    'Your license key is delivered on your order page after payment verification. Redeem it at setup.office.com.',
    50, true, 7
  ),
  (
    (select id from public.categories where slug = 'design-tools'),
    'Figma Professional', 'figma-professional',
    'Figma Professional with unlimited projects and advanced prototyping.',
    '["Unlimited projects", "Advanced prototyping", "Team libraries"]'::jsonb,
    'manual',
    'Activated on your Figma account. The admin will contact you with the activation steps after payment verification.',
    50, true, 8
  )
on conflict (slug) do update set
  category_id = excluded.category_id,
  name = excluded.name,
  description = excluded.description,
  features = excluded.features,
  delivery_type = excluded.delivery_type,
  delivery_instructions = excluded.delivery_instructions,
  stock = excluded.stock,
  active = excluded.active,
  sort_order = excluded.sort_order;

-- ---------------------------------------------------------------------------
-- Plans (20) — matched to products by slug; unique per product + name.
-- plans has no unique constraint on (product_id, name) in 0001, so each
-- plan is upserted by its seed key via a delete + insert guard below:
-- first remove any plan rows for these products whose name is not in the
-- seed set is NOT done (admin-created plans are kept); instead each row
-- is inserted only when no plan with the same product + name exists,
-- and updated when one does. Implemented with ON CONFLICT on a
-- dedicated unique index created here if missing.
-- ---------------------------------------------------------------------------

create unique index if not exists uq_plans_product_name
  on public.plans (product_id, name);

insert into public.plans (product_id, name, duration_months, price, compare_price, active, sort_order) values
  -- X Premium
  ((select id from public.products where slug = 'x-premium'), 'Premium — 1 Month', 1, 11, null, true, 1),
  ((select id from public.products where slug = 'x-premium'), 'Premium — 3 Months', 3, 30, null, true, 2),
  ((select id from public.products where slug = 'x-premium'), 'Premium+ — 1 Month', 1, 22, null, true, 3),
  -- Telegram Premium
  ((select id from public.products where slug = 'telegram-premium'), 'Premium — 3 Months', 3, 13, null, true, 1),
  ((select id from public.products where slug = 'telegram-premium'), 'Premium — 6 Months', 6, 19, null, true, 2),
  ((select id from public.products where slug = 'telegram-premium'), 'Premium — 12 Months', 12, 33, null, true, 3),
  -- ChatGPT Plus
  ((select id from public.products where slug = 'chatgpt-plus'), 'Plus — 1 Month', 1, 20, null, true, 1),
  ((select id from public.products where slug = 'chatgpt-plus'), 'Plus — 3 Months', 3, 55, null, true, 2),
  ((select id from public.products where slug = 'chatgpt-plus'), 'Team (2 seats) — 1 Month', 1, 50, null, true, 3),
  -- Claude Pro
  ((select id from public.products where slug = 'claude-pro'), 'Pro — 1 Month', 1, 20, null, true, 1),
  ((select id from public.products where slug = 'claude-pro'), 'Pro — 12 Months', 12, 204, null, true, 2),
  ((select id from public.products where slug = 'claude-pro'), 'Max (5x) — 1 Month', 1, 100, null, true, 3),
  -- Canva Pro
  ((select id from public.products where slug = 'canva-pro'), 'Pro — 1 Month', 1, 8, null, true, 1),
  ((select id from public.products where slug = 'canva-pro'), 'Pro — 12 Months', 12, 55, null, true, 2),
  -- Notion Plus
  ((select id from public.products where slug = 'notion-plus'), 'Plus — 1 Month', 1, 10, null, true, 1),
  ((select id from public.products where slug = 'notion-plus'), 'Plus — 12 Months', 12, 96, null, true, 2),
  -- Microsoft 365 Personal
  ((select id from public.products where slug = 'microsoft-365-personal'), 'Personal — 12 Months', 12, 45, null, true, 1),
  ((select id from public.products where slug = 'microsoft-365-personal'), 'Family (6 users) — 12 Months', 12, 65, null, true, 2),
  -- Figma Professional
  ((select id from public.products where slug = 'figma-professional'), 'Professional — 1 Month', 1, 15, null, true, 1),
  ((select id from public.products where slug = 'figma-professional'), 'Professional — 12 Months', 12, 144, null, true, 2)
on conflict (product_id, name) do update set
  duration_months = excluded.duration_months,
  price = excluded.price,
  compare_price = excluded.compare_price,
  active = excluded.active,
  sort_order = excluded.sort_order;

-- ---------------------------------------------------------------------------
-- Settings
-- Payment receiving accounts ship EMPTY — never invent wallet numbers.
-- Fill them in via Admin → Settings after the seed runs.
-- ---------------------------------------------------------------------------

insert into public.settings (key, value) values
  ('payment_accounts', '{"usdt_address": "", "usdc_address": "", "bnb_address": "", "binance_pay_id": "", "bkash_number": "", "nagad_number": ""}'::jsonb),
  ('site', '{"name": "Creators Campus", "tagline": "Your Digital Premium Marketplace", "currency": "USD"}'::jsonb)
on conflict (key) do update set
  value = excluded.value,
  updated_at = now();

commit;
