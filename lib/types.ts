export type DeliveryType = 'manual' | 'activation_code';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
  active: boolean;
}

export interface Product {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string;
  features: string[];
  delivery_type: DeliveryType;
  delivery_instructions: string | null;
  stock: number;
  active: boolean;
  sort_order: number;
  category?: Category;
  plans?: Plan[];
}

export interface Plan {
  id: string;
  product_id: string;
  name: string;
  duration_months: number;
  price: number;
  compare_price: number | null;
  active: boolean;
  sort_order: number;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: 'customer' | 'admin' | 'support';
  created_at: string;
}

export type OrderStatus =
  | 'pending_payment'
  | 'awaiting_verification'
  | 'verified'
  | 'delivering'
  | 'completed'
  | 'cancelled'
  | 'refunded';

export interface Order {
  id: string;
  user_id: string;
  order_number: string;
  status: OrderStatus;
  total: number;
  currency: string;
  coupon_code: string | null;
  discount: number;
  created_at: string;
  items?: OrderItem[];
  payment?: Payment | null;
  delivery?: Delivery | null;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  plan_id: string;
  quantity: number;
  price: number;
  product_name?: string;
  plan_name?: string;
}

export type PaymentMethodId = 'usdt' | 'usdc' | 'bnb' | 'binance_pay';

export interface Payment {
  id: string;
  order_id: string;
  method: PaymentMethodId | string;
  transaction_id: string | null;
  proof_url: string | null;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string | null;
  reviewed_at: string | null;
  note: string | null;
}

export interface Ticket {
  id: string;
  user_id: string;
  subject: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: string;
  created_at: string;
  replies?: TicketReply[];
}

export interface TicketReply {
  id: string;
  ticket_id: string;
  user_id: string;
  message: string;
  created_at: string;
}

export interface Coupon {
  id: string;
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  min_order: number;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  active: boolean;
}

export interface Supplier {
  id: string;
  name: string;
  contact: string | null;
  email: string | null;
  notes: string | null;
  created_at: string;
}

export interface StockMovement {
  id: string;
  product_id: string;
  change: number;
  reason: string | null;
  created_at: string;
  created_by: string | null;
}

export interface Delivery {
  id: string;
  order_id: string;
  type: DeliveryType;
  activation_code: string | null;
  instructions: string | null;
  delivered_at: string | null;
  delivered_by: string | null;
}

export interface Refund {
  id: string;
  order_id: string;
  amount: number;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  created_at: string;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  admin_id: string | null;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface Setting {
  id: string;
  key: string;
  value: unknown;
  updated_at: string;
}

/** Payment receiving accounts stored in settings under key `payment_accounts`. */
export interface PaymentAccounts {
  usdt_address: string;
  usdc_address: string;
  bnb_address: string;
  binance_pay_id: string;
}

export const EMPTY_PAYMENT_ACCOUNTS: PaymentAccounts = {
  usdt_address: '',
  usdc_address: '',
  bnb_address: '',
  binance_pay_id: '',
};
