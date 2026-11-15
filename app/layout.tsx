import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AuthProvider } from '@/lib/auth';
import { CartProvider } from '@/lib/cart';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import './globals.css';

export const metadata: Metadata = {
  title: 'Creators Campus — Your Digital Premium Marketplace',
  description:
    'Buy X Premium, Telegram Premium, ChatGPT Plus, Claude Pro and more digital subscriptions. Pay with USDT, USDC, BNB, Binance Pay, bKash or Nagad.',
};

const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem('cc-theme');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.setAttribute('data-theme',t);}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <AuthProvider>
          <CartProvider>
            <Header />
            <main className="container" style={{ minHeight: '60vh', paddingTop: '1.5rem' }}>
              {children}
            </main>
            <Footer />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
