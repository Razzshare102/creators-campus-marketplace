import Link from 'next/link';
import HomeCatalog from '@/components/HomeCatalog';
import { PAYMENT_METHODS } from '@/lib/catalog';

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="container">
          <h1>Your Digital Premium Marketplace</h1>
          <p>
            X Premium, Telegram Premium, ChatGPT Plus, Claude Pro and more — genuine
            subscriptions, delivered fast, paid your way.
          </p>
          <div className="flex flex-wrap mt-2">
            <Link href="#categories" className="btn btn-primary">
              Shop premium products
            </Link>
            <Link href="/dashboard/tickets" className="btn btn-outline" style={{ borderColor: '#fff', color: '#fff' }}>
              Need help? Open a ticket
            </Link>
          </div>
        </div>
      </section>

      <HomeCatalog />

      <section className="mt-3">
        <h2>How it works</h2>
        <div className="steps">
          <div className="card">
            <div className="step-num">1</div>
            <h3>Choose a plan</h3>
            <p className="muted">Pick a product and subscription plan, then add it to your cart.</p>
          </div>
          <div className="card">
            <div className="step-num">2</div>
            <h3>Pay &amp; submit proof</h3>
            <p className="muted">
              Pay with crypto, Binance Pay, bKash or Nagad, then submit your transaction ID and a payment screenshot.
            </p>
          </div>
          <div className="card">
            <div className="step-num">3</div>
            <h3>Verified &amp; delivered</h3>
            <p className="muted">
              Our team verifies your payment, then activates your subscription or delivers your activation code.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-3">
        <h2>Payment methods</h2>
        <div className="card">
          <div className="flex flex-wrap">
            {PAYMENT_METHODS.map((m) => (
              <span key={m.id} className="badge badge-purple">
                {m.label}
              </span>
            ))}
          </div>
          <p className="muted small mt-2" style={{ marginBottom: 0 }}>
            Every payment is verified manually before an order is confirmed. No payment is auto-confirmed.
          </p>
        </div>
      </section>
    </>
  );
}
