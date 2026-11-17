import type { Category, PaymentMethodId, Plan, Product } from './types';

/**
 * EXACT seed catalog — mirrors the live marketplace.
 * Do not add other products here; the catalog is managed in Supabase once
 * configured, and this file is only the fallback / seed reference.
 * Prices are USD. compare_price is null (no invented strikethrough price).
 */

export const CATEGORIES: Category[] = [
  { id: 'cat-social-premium', name: 'Social Premium', slug: 'social-premium', description: 'Premium subscriptions for social platforms.', icon: null, sort_order: 1, active: true },
  { id: 'cat-ai-tools', name: 'AI Tools', slug: 'ai-tools', description: 'AI assistants and creative tools.', icon: null, sort_order: 2, active: true },
  { id: 'cat-productivity', name: 'Productivity', slug: 'productivity', description: 'Tools to get more done, every day.', icon: null, sort_order: 3, active: true },
  { id: 'cat-design-tools', name: 'Design Tools', slug: 'design-tools', description: 'Professional design software.', icon: null, sort_order: 4, active: true },
  { id: 'cat-entertainment', name: 'Entertainment', slug: 'entertainment', description: 'Streaming and entertainment subscriptions.', icon: null, sort_order: 5, active: true },
  { id: 'cat-developer-tools', name: 'Developer Tools', slug: 'developer-tools', description: 'Tools for developers and builders.', icon: null, sort_order: 6, active: true },
  { id: 'cat-education', name: 'Education', slug: 'education', description: 'Learning platforms and courses.', icon: null, sort_order: 7, active: true },
  { id: 'cat-other-services', name: 'Other Services', slug: 'other-services', description: 'Other digital services.', icon: null, sort_order: 8, active: true },
];

export const PLANS: Plan[] = [
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

export const PRODUCTS: Product[] = [
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
    delivery_instructions: 'Activated on your Canva account. The admin will contact you with the activation steps after payment verification.',
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

export function getCategoryBySlug(slug: string): Category | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}

export function getProductBySlug(slug: string): Product | undefined {
  return PRODUCTS.find((p) => p.slug === slug);
}

export function getPlansForProduct(productId: string): Plan[] {
  return PLANS.filter((p) => p.product_id === productId && p.active);
}

export function getCategoryName(categoryId: string): string {
  return CATEGORIES.find((c) => c.id === categoryId)?.name ?? 'Other Services';
}

export function minPrice(productId: string): number {
  const plans = getPlansForProduct(productId);
  return plans.length ? Math.min(...plans.map((p) => p.price)) : 0;
}

export function formatPrice(n: number): string {
  return `$${n.toFixed(n % 1 === 0 ? 0 : 2)}`;
}

export const PAYMENT_METHODS: { id: PaymentMethodId; label: string; hint: string }[] = [
  { id: 'usdt', label: 'USDT', hint: 'Tether (USDT)' },
  { id: 'usdc', label: 'USDC', hint: 'USD Coin (USDC)' },
  { id: 'bnb', label: 'BNB (BSC)', hint: 'BNB on BNB Smart Chain' },
  { id: 'binance_pay', label: 'Binance Pay', hint: 'Pay with Binance Pay ID' },
];

export function paymentMethodLabel(id: string): string {
  return PAYMENT_METHODS.find((m) => m.id === id)?.label ?? id;
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending_payment: 'Pending payment',
  awaiting_verification: 'Awaiting verification',
  verified: 'Payment verified',
  delivering: 'Delivering',
  completed: 'Completed',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

export const ORDER_STATUS_STEPS = [
  'pending_payment',
  'awaiting_verification',
  'verified',
  'delivering',
  'completed',
];
