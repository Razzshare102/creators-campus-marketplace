'use client';

import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const current = document.documentElement.getAttribute('data-theme');
    setTheme(current === 'dark' ? 'dark' : 'light');
  }, []);

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem('cc-theme', next);
    } catch {
      // storage unavailable
    }
    setTheme(next);
  };

  return (
    <button type="button" className="theme-btn" onClick={toggle} aria-label="Toggle dark / light theme">
      {theme === 'dark' ? '☀ Light' : '☾ Dark'}
    </button>
  );
}
