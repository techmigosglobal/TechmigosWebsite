'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { AuthResponse, Session, User, UserResponse } from '@supabase/supabase-js';

type SupabaseClient = ReturnType<typeof createClient>;
let supabase: SupabaseClient | null = null;

function getSupabaseClient() {
  if (!supabase) {
    supabase = createClient();
  }
  return supabase;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    metadata?: { fullName?: string; avatarUrl?: string }
  ) => Promise<AuthResponse['data']>;
  signIn: (email: string, password: string) => Promise<AuthResponse['data']>;
  signOut: () => Promise<void>;
  getCurrentUser: () => Promise<User | null>;
  isEmailVerified: () => boolean;
  getUserProfile: () => Promise<Record<string, unknown> | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabaseClient = getSupabaseClient();

    // Get initial session
    supabaseClient.auth
      .getSession()
      .then(({ data: { session }, error }) => {
        if (error) {
          console.warn('Supabase session warning:', error.message);
          // Supabase will automatically clear the local session if the refresh token is invalid
        }
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      })
      .catch((err: unknown) => {
        console.error('Failed to get session:', err);
        setLoading(false);
      });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((_event: string, session: Session | null) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Email/Password Sign Up
  const signUp = useCallback(
    async (
      email: string,
      password: string,
      metadata: { fullName?: string; avatarUrl?: string } = {}
    ): Promise<AuthResponse['data']> => {
      const { data, error } = await getSupabaseClient().auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: metadata?.fullName || '',
            avatar_url: metadata?.avatarUrl || '',
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
      return data;
    },
    []
  );

  // Email/Password Sign In
  const signIn = useCallback(
    async (email: string, password: string): Promise<AuthResponse['data']> => {
      const { data, error } = await getSupabaseClient().auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      return data;
    },
    []
  );

  // Sign Out
  const signOut = useCallback(async () => {
    const { error } = await getSupabaseClient().auth.signOut();
    if (error) throw error;
  }, []);

  // Get Current User
  const getCurrentUser = useCallback(async (): Promise<User | null> => {
    const {
      data: { user },
      error,
    }: UserResponse = await getSupabaseClient().auth.getUser();
    if (error) throw error;
    return user;
  }, []);

  // Check if Email is Verified
  const isEmailVerified = useCallback(() => {
    return user?.email_confirmed_at !== null;
  }, [user?.email_confirmed_at]);

  // Get User Profile from Database
  const getUserProfile = useCallback(async (): Promise<Record<string, unknown> | null> => {
    if (!user) return null;
    const { data, error } = await getSupabaseClient()
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (error) throw error;
    return data;
  }, [user]);

  const value = useMemo(
    () => ({
      user,
      session,
      loading,
      signUp,
      signIn,
      signOut,
      getCurrentUser,
      isEmailVerified,
      getUserProfile,
    }),
    [
      user,
      session,
      loading,
      signUp,
      signIn,
      signOut,
      getCurrentUser,
      isEmailVerified,
      getUserProfile,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
