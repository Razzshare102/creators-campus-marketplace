'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useCart } from '@/lib/cart';
import ThemeToggle from './ThemeToggle';

export default function Header() {
  const { user, profile, signOut } = useAuth();
  const { count } = useCart();
  const router = useRouter();
  const [query, setQuery] = useState('');

  return (
    <header className="site-header">
      <div className="container site-header-inner">
        <Link href="/" className="brand" style={{ textDecoration: 'none' }}>
          Creators <span>Campus</span>
        </Link>
        <form
          className="header-search"
          onSubmit={(e) => {
            e.preventDefault();
            router.push(`/search?q=${encodeURIComponent(query.trim())}`);
          }}
        >
          <input
            type="search"
            placeholder="Search products…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search products"
          />
          <button type="submit" className="theme-btn">Search</button>
        </form>
        <nav className="nav-links">
          <Link href="/#categories">Categories</Link>
          <Link href="/cart">
            Cart{count > 0 && <span className="cart-count">{count}</span>}
          </Link>
          {user ? (
            <>
              <Link href="/dashboard">Dashboard</Link>
              {profile?.role === 'admin' && <Link href="/admin">Admin</Link>}
              <button type="button" className="theme-btn" onClick={() => signOut()}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/auth/login">Login</Link>
              <Link href="/auth/register">Register</Link>
            </>
          )}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
