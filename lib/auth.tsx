'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { getSupabase, isSupabaseConfigured } from './supabase';
import type { Profile } from './types';

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const configured = isSupabaseConfigured();

  const loadProfile = useCallback(async (userId: string) => {
    const supabase = getSupabase();
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    setProfile((data as Profile | null) ?? null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await loadProfile(user.id);
  }, [user, loadProfile]);

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }
    const supabase = getSupabase();
    supabase.auth.getSession().then(async ({ data }) => {
      const u = data.session?.user ?? null;
      setUser(u);
      if (u) await loadProfile(u.id);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) await loadProfile(u.id);
      else setProfile(null);
      setLoading(false);
    });
    return () => listener.subscription.unsubscribe();
  }, [configured, loadProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      loading,
      configured,
      signIn: async (email, password) => {
        if (!configured) return { error: 'Supabase is not connected yet. Add the project URL and anon key in .env.local.' };
        const { error } = await getSupabase().auth.signInWithPassword({ email, password });
        return error ? { error: error.message } : {};
      },
      signUp: async (email, password, fullName) => {
        if (!configured) return { error: 'Supabase is not connected yet. Add the project URL and anon key in .env.local.' };
        const supabase = getSupabase();
        // Do NOT insert into profiles here: email confirmation is on, so the
        // user has no session yet and the RLS insert policy (id = auth.uid())
        // rejects it. The handle_new_user() trigger (migration 0003) creates
        // the profile row server-side from this metadata instead.
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        });
        if (error) return { error: error.message };
        return {};
      },
      signOut: async () => {
        if (configured) await getSupabase().auth.signOut();
        setUser(null);
        setProfile(null);
      },
      refreshProfile,
    }),
    [user, profile, loading, configured, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
