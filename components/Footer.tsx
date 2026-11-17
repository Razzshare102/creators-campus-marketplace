import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="flex-between">
          <div>
            <strong style={{ color: '#fff' }}>Creators Campus</strong>
            <div>Your Digital Premium Marketplace</div>
          </div>
          <div className="flex flex-wrap">
            <Link href="/#categories">Categories</Link>
            <Link href="/cart">Cart</Link>
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/dashboard/tickets">Support</Link>
            <Link href="/admin">Admin</Link>
          </div>
        </div>
        <p className="mt-2 small" style={{ marginBottom: 0 }}>
          Payments accepted: USDT · USDC · BNB (BSC) · Binance Pay.
          Every order is verified manually before delivery.
        </p>
        <p className="small" style={{ marginBottom: 0 }}>© 2026 Creators Campus. All rights reserved.</p>
      </div>
    </footer>
  );
}
