// Creators Campus marketplace — scripts/seed-catalog.mjs
// Upserts the EXACT catalog from lib/catalog.ts into Supabase via the
// service-role key (bypasses RLS). Safe to re-run: every upsert matches
// on slug (categories/products) or product + name (plans).
//
// Usage:
//   cp .env.example .env.local   # fill in the three Supabase variables
//   npm install                  # installs @supabase/supabase-js
//   node scripts/seed-catalog.mjs
//
// Env (read from .env.local in the project root, or the process env):
//   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// Never commit .env.local. The payment_accounts setting is seeded EMPTY —
// never invent wallet numbers; fill them in via Admin → Settings.

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

// Minimal .env.local parser (no extra dependency — dotenv is not installed).
// Lines look like KEY=value; ignores blank lines and lines starting with #.
function loadDotEnvLocal() {
  const path = join(ROOT, '.env.local');
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadDotEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!url.startsWith('http') || !serviceKey) {
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n' +
      'Copy .env.example to .env.local and fill in the Supabase values, then re-run.',
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ---------------------------------------------------------------------------
// EXACT catalog from lib/catalog.ts — do not change values here.
// (ids below are the seed reference keys from lib/catalog.ts; the database
// generates its own uuids, and rows are matched by slug.)
// ---------------------------------------------------------------------------

const CATEGORIES = [
  { id: 'cat-social-premium', name: 'Social Premium', slug: 'social-premium', description: 'Premium subscriptions for social platforms.', icon: null, sort_order: 1, active: true },
  { id: 'cat-ai-tools', name: 'AI Tools', slug: 'ai-tools', description: 'AI assistants and creative tools.', icon: null, sort_order: 2, active: true },
  { id: 'cat-productivity', name: 'Productivity', slug: 'productivity', description: 'Tools to get more done, every day.', icon: null, sort_order: 3, active: true },
  { id: 'cat-design-tools', name: 'Design Tools', slug: 'design-tools', description: 'Professional design software.', icon: null, sort_order: 4, active: true },
  { id: 'cat-entertainment', name: 'Entertainment', slug: 'entertainment', description: 'Streaming and entertainment subscriptions.', icon: null, sort_order: 5, active: true },
  { id: 'cat-developer-tools', name: 'Developer Tools', slug: 'developer-tools', description: 'Tools for developers and builders.', icon: null, sort_order: 6, active: true },
  { id: 'cat-education', name: 'Education', slug: 'education', description: 'Learning platforms and courses.', icon: null, sort_order: 7, active: true },
  { id: 'cat-other-services', name: 'Other Services', slug: 'other-services', description: 'Other digital services.', icon: null, sort_order: 8, active: true },
];

const PRODUCTS = [
  {
    id: 'prod-x-premium', category_id: 'cat-social-premium', name: 'X Premium', slug: 'x-premium',
    description: 'Blue checkmark, longer posts, reply boost and fewer ads on your own X account.',
    features: ['Blue checkmark', 'Longer posts', 'Reply boost', 'Fewer ads'],
    delivery_type: 'manual',
    delivery_instructions: 'Activated on your own X account using your @username. No password is ever required.',
    stock: 50, active: true, sort_order: 1,
  },
  {
    id: 'prod-telegram-premium', category_id: 'cat-social-premium', name: 'Telegram Premium', slug: 'telegram-premium',
    description: '4GB uploads, faster downloads and premium stickers on Telegram.',
    features: ['4GB uploads', 'Faster downloads', 'Premium stickers'],
    delivery_type: 'manual',
    delivery_instructions: 'Gifted to your Telegram account using your Telegram username.',
    stock: 50, active: true, sort_order: 2,
  },
  {
    id: 'prod-chatgpt-plus', category_id: 'cat-ai-tools', name: 'ChatGPT Plus', slug: 'chatgpt-plus',
    description: 'GPT-5, DALL·E image generation and higher usage limits.',
    features: ['GPT-5 access', 'DALL·E image generation', 'Higher usage limits'],
    delivery_type: 'manual',
    delivery_instructions: 'Activated on your account. The admin will contact you with the activation steps after payment verification.',
    stock: 50, active: true, sort_order: 3,
  },
  {
    id: 'prod-claude-pro', category_id: 'cat-ai-tools', name: 'Claude Pro', slug: 'claude-pro',
    description: 'Claude Pro with extended usage, and Max for 5x more usage.',
    features: ['Extended usage', 'Priority access', 'Max plan available (5x usage)'],
    delivery_type: 'manual',
    delivery_instructions: 'Activated on your account. The admin will contact you with the activation steps after payment verification.',
    stock: 50, active: true, sort_order: 4,
  },
  {
    id: 'prod-canva-pro', category_id: 'cat-design-tools', name: 'Canva Pro', slug: 'canva-pro',
    description: 'Canva Pro with premium templates, Brand Kit and Magic Studio.',
    features: ['Premium templates', 'Brand Kit', 'Magic Studio'],
    delivery_type: 'manual',
    delivery_instructions: 'Activated on your account. The admin will contact you with the activation steps after payment verification.',
    stock: 50, active: true, sort_order: 5,
  },
  {
    id: 'prod-notion-plus', category_id: 'cat-productivity', name: 'Notion Plus', slug: 'notion-plus',
    description: 'Notion Plus with unlimited blocks, file uploads and version history.',
    features: ['Unlimited blocks', 'Larger file uploads', 'Version history'],
    delivery_type: 'manual',
    delivery_instructions: 'Activated on your Notion account. The admin will contact you with the activation steps after payment verification.',
    stock: 50, active: true, sort_order: 6,
  },
  {
    id: 'prod-ms365', category_id: 'cat-productivity', name: 'Microsoft 365 Personal', slug: 'microsoft-365-personal',
    description: 'Word, Excel, PowerPoint and 1TB OneDrive cloud storage.',
    features: ['Word, Excel, PowerPoint', '1TB OneDrive storage', 'License key delivery'],
    delivery_type: 'activation_code',
    delivery_instructions: 'Your license key is delivered on your order page after payment verification. Redeem it at setup.office.com.',
    stock: 50, active: true, sort_order: 7,
  },
  {
    id: 'prod-figma-pro', category_id: 'cat-design-tools', name: 'Figma Professional', slug: 'figma-professional',
    description: 'Figma Professional with unlimited projects and advanced prototyping.',
    features: ['Unlimited projects', 'Advanced prototyping', 'Team libraries'],
    delivery_type: 'manual',
    delivery_instructions: 'Activated on your Figma account. The admin will contact you with the activation steps after payment verification.',
    stock: 50, active: true, sort_order: 8,
  },
];

const PLANS = [
  // X Premium
  { id: 'plan-x-premium-1mo', product_id: 'prod-x-premium', name: 'Premium — 1 Month', duration_months: 1, price: 11, compare_price: null, active: true, sort_order: 1 },
  { id: 'plan-x-premium-3mo', product_id: 'prod-x-premium', name: 'Premium — 3 Months', duration_months: 3, price: 30, compare_price: null, active: true, sort_order: 2 },
  { id: 'plan-x-premium-plus-1mo', product_id: 'prod-x-premium', name: 'Premium+ — 1 Month', duration_months: 1, price: 22, compare_price: null, active: true, sort_order: 3 },
  // Telegram Premium
  { id: 'plan-tg-3mo', product_id: 'prod-telegram-premium', name: 'Premium — 3 Months', duration_months: 3, price: 13, compare_price: null, active: true, sort_order: 1 },
  { id: 'plan-tg-6mo', product_id: 'prod-telegram-premium', name: 'Premium — 6 Months', duration_months: 6, price: 19, compare_price: null, active: true, sort_order: 2 },
  { id: 'plan-tg-12mo', product_id: 'prod-telegram-premium', name: 'Premium — 12 Months', duration_months: 12, price: 33, compare_price: null, active: true, sort_order: 3 },
  // ChatGPT Plus
  { id: 'plan-gpt-plus-1mo', product_id: 'prod-chatgpt-plus', name: 'Plus — 1 Month', duration_months: 1, price: 20, compare_price: null, active: true, sort_order: 1 },
  { id: 'plan-gpt-plus-3mo', product_id: 'prod-chatgpt-plus', name: 'Plus — 3 Months', duration_months: 3, price: 55, compare_price: null, active: true, sort_order: 2 },
  { id: 'plan-gpt-team-1mo', product_id: 'prod-chatgpt-plus', name: 'Team (2 seats) — 1 Month', duration_months: 1, price: 50, compare_price: null, active: true, sort_order: 3 },
  // Claude Pro
  { id: 'plan-claude-pro-1mo', product_id: 'prod-claude-pro', name: 'Pro — 1 Month', duration_months: 1, price: 20, compare_price: null, active: true, sort_order: 1 },
  { id: 'plan-claude-pro-12mo', product_id: 'prod-claude-pro', name: 'Pro — 12 Months', duration_months: 12, price: 204, compare_price: null, active: true, sort_order: 2 },
  { id: 'plan-claude-max-1mo', product_id: 'prod-claude-pro', name: 'Max (5x) — 1 Month', duration_months: 1, price: 100, compare_price: null, active: true, sort_order: 3 },
  // Canva Pro
  { id: 'plan-canva-1mo', product_id: 'prod-canva-pro', name: 'Pro — 1 Month', duration_months: 1, price: 8, compare_price: null, active: true, sort_order: 1 },
  { id: 'plan-canva-12mo', product_id: 'prod-canva-pro', name: 'Pro — 12 Months', duration_months: 12, price: 55, compare_price: null, active: true, sort_order: 2 },
  // Notion Plus
  { id: 'plan-notion-1mo', product_id: 'prod-notion-plus', name: 'Plus — 1 Month', duration_months: 1, price: 10, compare_price: null, active: true, sort_order: 1 },
  { id: 'plan-notion-12mo', product_id: 'prod-notion-plus', name: 'Plus — 12 Months', duration_months: 12, price: 96, compare_price: null, active: true, sort_order: 2 },
  // Microsoft 365 Personal
  { id: 'plan-ms365-personal-12mo', product_id: 'prod-ms365', name: 'Personal — 12 Months', duration_months: 12, price: 45, compare_price: null, active: true, sort_order: 1 },
  { id: 'plan-ms365-family-12mo', product_id: 'prod-ms365', name: 'Family (6 users) — 12 Months', duration_months: 12, price: 65, compare_price: null, active: true, sort_order: 2 },
  // Figma Professional
  { id: 'plan-figma-1mo', product_id: 'prod-figma-pro', name: 'Professional — 1 Month', duration_months: 1, price: 15, compare_price: null, active: true, sort_order: 1 },
  { id: 'plan-figma-12mo', product_id: 'prod-figma-pro', name: 'Professional — 12 Months', duration_months: 12, price: 144, compare_price: null, active: true, sort_order: 2 },
];

const SETTINGS = [
  {
    key: 'payment_accounts',
    value: { usdt_address: '', usdc_address: '', bnb_address: '', binance_pay_id: '', bkash_number: '', nagad_number: '' },
  },
  {
    key: 'site',
    value: { name: 'Creators Campus', tagline: 'Your Digital Premium Marketplace', currency: 'USD' },
  },
];

// ---------------------------------------------------------------------------

function fail(step, error) {
  console.error(`Seed failed at ${step}:`, error?.message || error);
  process.exit(1);
}

async function main() {
  // Categories (upsert by slug) -> map seed id -> db uuid.
  const { data: cats, error: catErr } = await supabase
    .from('categories')
    .upsert(
      CATEGORIES.map(({ id, ...rest }) => rest),
      { onConflict: 'slug' },
    )
    .select('id, slug');
  if (catErr) fail('categories upsert', catErr);
  const catIdBySlug = new Map(cats.map((c) => [c.slug, c.id]));
  console.log(`Categories: ${cats.length} upserted.`);

  // Products (upsert by slug) -> map seed id -> db uuid.
  const { data: prods, error: prodErr } = await supabase
    .from('products')
    .upsert(
      PRODUCTS.map(({ id, category_id, ...rest }) => ({
        ...rest,
        category_id: catIdBySlug.get(
          CATEGORIES.find((c) => c.id === category_id).slug,
        ),
      })),
      { onConflict: 'slug' },
    )
    .select('id, slug');
  if (prodErr) fail('products upsert', prodErr);
  const prodIdBySlug = new Map(prods.map((p) => [p.slug, p.id]));
  console.log(`Products: ${prods.length} upserted.`);

  // Plans: upsert by (product_id, name) — requires the unique index
  // uq_plans_product_name created by supabase/seed.sql; if this script is
  // run before seed.sql, create it first via the SQL editor (0001 does not
  // create it). Fall back to a select-then-upsert per plan when the
  // conflict target is missing.
  const planRows = PLANS.map(({ id, product_id, ...rest }) => ({
    ...rest,
    product_id: prodIdBySlug.get(
      PRODUCTS.find((p) => p.id === product_id).slug,
    ),
  }));

  let planCount = 0;
  const { error: planErr } = await supabase
    .from('plans')
    .upsert(planRows, { onConflict: 'product_id,name' });
  if (planErr) {
    // No unique index on (product_id, name) yet: do it row by row.
    if (!/no unique|ON CONFLICT|conflict target/i.test(planErr.message)) {
      fail('plans upsert', planErr);
    }
    console.log('No (product_id, name) unique index — upserting plans row by row.');
    for (const row of planRows) {
      const { data: existing, error: selErr } = await supabase
        .from('plans')
        .select('id')
        .eq('product_id', row.product_id)
        .eq('name', row.name)
        .maybeSingle();
      if (selErr) fail('plans lookup', selErr);
      const { error } = existing
        ? await supabase.from('plans').update(row).eq('id', existing.id)
        : await supabase.from('plans').insert(row);
      if (error) fail('plans upsert (row)', error);
      planCount += 1;
    }
  } else {
    planCount = planRows.length;
  }
  console.log(`Plans: ${planCount} upserted.`);

  // Settings (upsert by key). payment_accounts ships with EMPTY values.
  const { error: setErr } = await supabase
    .from('settings')
    .upsert(SETTINGS, { onConflict: 'key' });
  if (setErr) fail('settings upsert', setErr);
  console.log(`Settings: ${SETTINGS.length} upserted (payment_accounts empty — fill in via Admin → Settings).`);

  console.log('Seed complete: 8 categories, 8 products, 20 plans.');
}

await main();
