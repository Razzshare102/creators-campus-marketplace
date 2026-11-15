'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useAuth } from '@/lib/auth';

const NAV_LINKS: { href: string; label: string }[] = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/categories', label: 'Categories' },
  { href: '/admin/plans', label: 'Plans' },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/payments', label: 'Payment Verification' },
  { href: '/admin/customers', label: 'Customers' },
  { href: '/admin/coupons', label: 'Coupons' },
  { href: '/admin/suppliers', label: 'Suppliers' },
  { href: '/admin/stock', label: 'Stock' },
  { href: '/admin/delivery', label: 'Delivery' },
  { href: '/admin/refunds', label: 'Refunds' },
  { href: '/admin/tickets', label: 'Support Tickets' },
  { href: '/admin/reports', label: 'Reports' },
  { href: '/admin/settings', label: 'Settings' },
  { href: '/admin/logs', label: 'Activity Logs' },
  { href: '/admin/roles', label: 'Roles' },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, profile, loading } = useAuth();
  const pathname = usePathname();

  if (loading) {
    return <p className="muted">Loading…</p>;
  }

  if (!user) {
    return (
      <div className="notice">
        <p>Please log in to access the admin area.</p>
        <Link href="/auth/login" className="btn btn-primary btn-sm">
          Log in
        </Link>
      </div>
    );
  }

  if (profile?.role !== 'admin') {
    return (
      <div className="notice">
        <p>Access denied — admin role required.</p>
        <Link href="/" className="btn btn-outline btn-sm">
          Go home
        </Link>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <nav>
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={pathname === link.href ? 'active' : ''}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="admin-content">{children}</div>
    </div>
  );
}
